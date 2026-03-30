import json
import sys
import tempfile
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
LOCAL_DEPS = BACKEND_DIR / ".deps"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if LOCAL_DEPS.exists() and str(LOCAL_DEPS) not in sys.path:
    sys.path.insert(0, str(LOCAL_DEPS))

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import xgboost as xgb

from ml_pipeline import MLPipeline


def create_model_artifacts(models_dir: Path, metrics_path: Path) -> dict:
    features = ["f1", "f2"]
    X = np.array(
        [
            [0.1, 0.2],
            [0.2, 0.1],
            [0.8, 0.7],
            [0.9, 0.8],
            [0.15, 0.25],
            [0.85, 0.75],
        ],
        dtype=float,
    )
    y = np.array([0, 0, 1, 1, 0, 1], dtype=int)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    rf_model = RandomForestClassifier(n_estimators=10, random_state=42)
    rf_model.fit(X_scaled, y)

    xgb_model = xgb.XGBClassifier(
        n_estimators=10,
        max_depth=2,
        learning_rate=0.3,
        subsample=1.0,
        colsample_bytree=1.0,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42,
    )
    xgb_model.fit(X_scaled, y)

    models_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(rf_model, models_dir / "random_forest.pkl")
    joblib.dump(xgb_model, models_dir / "xgboost.pkl")
    joblib.dump(scaler, models_dir / "scaler.pkl")

    (models_dir / "feature_columns.json").write_text(json.dumps(features), encoding="utf-8")
    (models_dir / "sample_input.json").write_text(
        json.dumps({"f1": float(X[0, 0]), "f2": float(X[0, 1])}),
        encoding="utf-8",
    )

    metrics_payload = {
        "models": {
            "random_forest": {
                "accuracy": 0.83,
                "precision": 0.8,
                "recall": 0.85,
                "f1": 0.82,
                "auc": 0.87,
            },
            "xgboost": {
                "accuracy": 0.91,
                "precision": 0.89,
                "recall": 0.92,
                "f1": 0.9,
                "auc": 0.95,
            },
        },
        "best_model": "xgboost",
    }
    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    metrics_path.write_text(json.dumps(metrics_payload), encoding="utf-8")

    return {"features": features, "sample": {"f1": 0.1, "f2": 0.2}}


class PipelineContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.models_dir = Path(self.temp_dir.name) / "models"
        self.metrics_path = Path(self.temp_dir.name) / "metrics.json"
        self.fixture = create_model_artifacts(self.models_dir, self.metrics_path)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_pipeline_loads_saved_artifacts_and_predicts(self) -> None:
        pipeline = MLPipeline(
            str(PROJECT_ROOT),
            model_dir=str(self.models_dir),
            metrics_path=str(self.metrics_path),
        )
        pipeline.load_artifacts()

        result = pipeline.predict({"f1": 0.1, "f2": 0.2}, model_name="xgboost")

        self.assertEqual(set(result.keys()), {"prediction", "probability", "confidence"})
        self.assertIsInstance(result["prediction"], int)
        self.assertIsInstance(result["probability"], float)
        self.assertIsInstance(result["confidence"], float)

    def test_pipeline_returns_local_shap_explanation(self) -> None:
        pipeline = MLPipeline(
            str(PROJECT_ROOT),
            model_dir=str(self.models_dir),
            metrics_path=str(self.metrics_path),
        )
        pipeline.load_artifacts()

        result = pipeline.explain({"f1": 0.1, "f2": 0.2}, model_name="random_forest")

        self.assertEqual(
            set(result.keys()),
            {"shap_values", "feature_names", "base_value", "prediction"},
        )
        self.assertEqual(result["feature_names"], self.fixture["features"])
        self.assertEqual(len(result["shap_values"]), len(result["feature_names"]))
        self.assertIsInstance(result["base_value"], float)

    def test_pipeline_validates_feature_columns(self) -> None:
        pipeline = MLPipeline(
            str(PROJECT_ROOT),
            model_dir=str(self.models_dir),
            metrics_path=str(self.metrics_path),
        )
        pipeline.load_artifacts()

        with self.assertRaises(ValueError) as context:
            pipeline.predict({"f1": 0.1}, model_name="xgboost")

        self.assertIn("Feature mismatch", str(context.exception))

    def test_pipeline_reads_saved_metrics_payload(self) -> None:
        pipeline = MLPipeline(
            str(PROJECT_ROOT),
            model_dir=str(self.models_dir),
            metrics_path=str(self.metrics_path),
        )
        pipeline.load_artifacts()

        metrics = pipeline.get_metrics()

        self.assertIn("models", metrics)
        self.assertEqual(metrics["best_model"], "xgboost")
        self.assertAlmostEqual(metrics["models"]["xgboost"]["accuracy"], 0.91)


if __name__ == "__main__":
    unittest.main()
