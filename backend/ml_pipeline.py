"""
Artifact-backed inference pipeline for the Parkinson's detection API.

This module loads persisted models, validates feature alignment, performs
preprocessing, and returns prediction / SHAP JSON payloads for the Flask app.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, Mapping, Optional

import joblib
import numpy as np
import pandas as pd
import shap

logger = logging.getLogger(__name__)


class MLPipeline:
    """Load trained artifacts once at startup and serve inference requests."""

    def __init__(
        self,
        project_root: str,
        model_dir: Optional[str] = None,
        metrics_path: Optional[str] = None,
    ) -> None:
        self.project_root = Path(project_root)
        self.backend_dir = self.project_root / "backend"
        self.study_dir = self.project_root / "parkinson_feature_study"
        self.model_dir = Path(model_dir) if model_dir else self.backend_dir / "models"
        self.metrics_path = (
            Path(metrics_path)
            if metrics_path
            else self.study_dir / "results" / "metrics" / "deployment_metrics.json"
        )

        self.random_forest_model = None
        self.xgboost_model = None
        self.scaler = None
        self.expected_features: list[str] = []
        self.sample_data: Dict[str, float] = {}
        self.metrics: Dict[str, Any] = {}
        self.explainers: Dict[str, shap.TreeExplainer] = {}
        self.dataset_size = 0
        self.is_ready = False
        self.startup_error: Optional[str] = None

    def load_artifacts(self) -> None:
        """Load the persisted models, scaler, feature metadata, and metrics."""
        required_files = {
            "random_forest_model": self.model_dir / "random_forest.pkl",
            "xgboost_model": self.model_dir / "xgboost.pkl",
            "scaler": self.model_dir / "scaler.pkl",
            "feature_columns": self.model_dir / "feature_columns.json",
        }
        missing = [str(path) for path in required_files.values() if not path.exists()]
        if missing:
            raise FileNotFoundError(
                "Missing trained artifacts. Run `python backend/train_and_save.py` first. "
                f"Missing files: {missing}"
            )

        self.random_forest_model = joblib.load(required_files["random_forest_model"])
        self.xgboost_model = joblib.load(required_files["xgboost_model"])
        self.scaler = joblib.load(required_files["scaler"])
        self.expected_features = self._load_feature_columns(
            required_files["feature_columns"]
        )
        self.sample_data = self._load_sample_data()
        self.metrics = self._load_metrics()
        self.dataset_size = self._load_dataset_size()
        self.explainers.clear()
        self.is_ready = True
        self.startup_error = None

        logger.info(
            "Loaded trained artifacts from %s with %d expected features",
            self.model_dir,
            len(self.expected_features),
        )

    def _load_feature_columns(self, path: Path) -> list[str]:
        feature_columns = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(feature_columns, list) or not all(
            isinstance(column, str) for column in feature_columns
        ):
            raise ValueError(f"Invalid feature column file: {path}")
        return feature_columns

    def _load_sample_data(self) -> Dict[str, float]:
        sample_path = self.model_dir / "sample_input.json"
        if not sample_path.exists():
            return {}

        raw_sample = json.loads(sample_path.read_text(encoding="utf-8"))
        if not isinstance(raw_sample, dict):
            return {}

        sample_data: Dict[str, float] = {}
        for name, value in raw_sample.items():
            try:
                sample_data[str(name)] = float(value)
            except (TypeError, ValueError):
                continue

        return sample_data

    def _load_metrics(self) -> Dict[str, Any]:
        if self.metrics_path.exists():
            return json.loads(self.metrics_path.read_text(encoding="utf-8"))

        aggregated_csv = self.study_dir / "results" / "metrics" / "aggregated_results.csv"
        if not aggregated_csv.exists():
            raise FileNotFoundError(
                "Missing saved metrics payload. Run `python backend/train_and_save.py` first."
            )

        metrics_df = pd.read_csv(aggregated_csv)
        models: Dict[str, Dict[str, float]] = {}
        for _, row in metrics_df.iterrows():
            model_key = str(row.get("model", "")).strip().lower().replace(" ", "_")
            if model_key not in {"random_forest", "xgboost"}:
                continue
            models[model_key] = {
                "accuracy": float(row.get("accuracy_mean", row.get("accuracy", 0.0))),
                "precision": float(row.get("precision_mean", row.get("precision", 0.0))),
                "recall": float(row.get("recall_mean", row.get("recall", 0.0))),
                "f1": float(row.get("f1_mean", row.get("f1", 0.0))),
                "auc": float(row.get("roc_auc_mean", row.get("auc", 0.0))),
            }

        if not models:
            raise ValueError("No supported model metrics found in aggregated_results.csv")

        best_model = max(models, key=lambda name: models[name]["accuracy"])
        return {"models": models, "best_model": best_model}

    def _load_dataset_size(self) -> int:
        candidates = [
            self.study_dir / "data" / "raw" / "pd_speech_features_cleaned.csv",
            self.study_dir / "data" / "raw" / "pd_speech_features.csv",
        ]
        for dataset_path in candidates:
            if dataset_path.exists():
                return int(len(pd.read_csv(dataset_path, usecols=[0])))
        return 0

    def get_features_metadata(self) -> Dict[str, Any]:
        return {
            "expected_features": self.expected_features,
            "feature_count": len(self.expected_features),
            "sample_data": self.sample_data,
            "supported_models": ["random_forest", "xgboost"],
        }

    def get_metrics(self) -> Dict[str, Any]:
        return self.metrics

    def get_model_info(self) -> Dict[str, Any]:
        best_model = self.metrics.get("best_model", "xgboost")
        best_accuracy = float(
            self.metrics.get("models", {}).get(best_model, {}).get("accuracy", 0.0)
        )
        return {
            "dataset_size": self.dataset_size,
            "n_selected_features": len(self.expected_features),
            "models": ["random_forest", "xgboost"],
            "best_model": best_model,
            "best_accuracy": best_accuracy,
        }

    def predict(
        self,
        features_dict: Mapping[str, Any],
        model_name: str = "xgboost",
    ) -> Dict[str, Any]:
        scaled_frame = self._prepare_input_frame(features_dict)
        model = self._get_model(model_name)

        probability = float(model.predict_proba(scaled_frame.values)[0, 1])
        prediction = int(probability >= 0.5)
        confidence = float(max(probability, 1.0 - probability))

        return {
            "prediction": prediction,
            "probability": probability,
            "confidence": confidence,
        }

    def explain(
        self,
        features_dict: Mapping[str, Any],
        model_name: str = "xgboost",
    ) -> Dict[str, Any]:
        scaled_frame = self._prepare_input_frame(features_dict)
        model_key = self._normalize_model_name(model_name)
        model = self._get_model(model_key)
        explainer = self._get_explainer(model_key, model)

        raw_shap_values = explainer.shap_values(scaled_frame)
        shap_values = self._extract_positive_class_values(raw_shap_values)[0]
        base_value = self._extract_positive_class_base_value(explainer.expected_value)
        probability = float(model.predict_proba(scaled_frame.values)[0, 1])
        prediction = int(probability >= 0.5)

        if len(shap_values) != len(self.expected_features):
            raise ValueError("SHAP output length does not match expected feature count")

        return {
            "shap_values": [float(value) for value in shap_values],
            "feature_names": self.expected_features,
            "base_value": float(base_value),
            "prediction": prediction,
        }

    def _prepare_input_frame(self, features_dict: Mapping[str, Any]) -> pd.DataFrame:
        validated_features = self._validate_and_order_features(features_dict)
        raw_frame = pd.DataFrame([validated_features], columns=self.expected_features)
        scaled_values = self.scaler.transform(raw_frame.to_numpy())
        return pd.DataFrame(scaled_values, columns=self.expected_features)

    def _validate_and_order_features(
        self, features_dict: Mapping[str, Any]
    ) -> Dict[str, float]:
        if not isinstance(features_dict, Mapping):
            raise ValueError("Features payload must be a JSON object.")

        missing = [feature for feature in self.expected_features if feature not in features_dict]
        unexpected = [
            feature for feature in features_dict.keys() if feature not in self.expected_features
        ]

        if missing or unexpected:
            problem_parts = ["Feature mismatch."]
            if missing:
                problem_parts.append(f"Missing: {missing}.")
            if unexpected:
                problem_parts.append(f"Unexpected: {unexpected}.")
            problem_parts.append("The feature columns must exactly match feature_columns.json.")
            raise ValueError(" ".join(problem_parts))

        ordered: Dict[str, float] = {}
        for feature_name in self.expected_features:
            raw_value = features_dict[feature_name]
            try:
                ordered[feature_name] = float(raw_value)
            except (TypeError, ValueError) as exc:
                raise ValueError(
                    f"Feature `{feature_name}` must be numeric. Received: {raw_value!r}"
                ) from exc

        return ordered

    def _get_model(self, model_name: str):
        model_key = self._normalize_model_name(model_name)
        if model_key == "random_forest":
            return self.random_forest_model
        if model_key == "xgboost":
            return self.xgboost_model
        raise ValueError(
            "Unsupported model. Choose one of: random_forest, xgboost."
        )

    def _normalize_model_name(self, model_name: str) -> str:
        normalized = str(model_name).strip().lower().replace(" ", "_")
        aliases = {
            "randomforest": "random_forest",
            "random-forest": "random_forest",
            "rf": "random_forest",
            "xgb": "xgboost",
            "xg_boost": "xgboost",
        }
        return aliases.get(normalized, normalized)

    def _get_explainer(self, model_key: str, model) -> shap.TreeExplainer:
        if model_key not in self.explainers:
            self.explainers[model_key] = shap.TreeExplainer(model)
        return self.explainers[model_key]

    def _extract_positive_class_values(self, shap_values: Any) -> np.ndarray:
        if isinstance(shap_values, list):
            if len(shap_values) < 2:
                raise ValueError("Expected binary classification SHAP values for two classes.")
            return np.asarray(shap_values[1], dtype=float)

        values = np.asarray(shap_values, dtype=float)
        if values.ndim == 1:
            return values.reshape(1, -1)
        if values.ndim == 2:
            return values
        if values.ndim == 3:
            if values.shape[-1] == 2:
                return values[:, :, 1]
            if values.shape[0] == 2:
                return values[1]
        raise ValueError(f"Unsupported SHAP output shape: {values.shape}")

    def _extract_positive_class_base_value(self, expected_value: Any) -> float:
        if isinstance(expected_value, list):
            if len(expected_value) < 2:
                raise ValueError("Expected binary classification base values for two classes.")
            return float(expected_value[1])

        values = np.asarray(expected_value, dtype=float)
        if values.ndim == 0:
            return float(values)
        if values.shape[0] == 2:
            return float(values[1])
        return float(values.reshape(-1)[0])
