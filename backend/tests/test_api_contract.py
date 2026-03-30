import importlib
import json
import sys
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
LOCAL_DEPS = BACKEND_DIR / ".deps"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if LOCAL_DEPS.exists() and str(LOCAL_DEPS) not in sys.path:
    sys.path.insert(0, str(LOCAL_DEPS))


class DummyPipeline:
    def __init__(self) -> None:
        self.is_ready = True

    def predict(self, features, model_name="xgboost"):
        return {
            "prediction": 1,
            "probability": 0.82,
            "confidence": 0.82,
        }

    def explain(self, features, model_name="xgboost"):
        return {
            "shap_values": [0.14, -0.03],
            "feature_names": ["f1", "f2"],
            "base_value": 0.41,
            "prediction": 1,
        }

    def get_metrics(self):
        return {
            "models": {
                "xgboost": {
                    "accuracy": 0.91,
                    "precision": 0.89,
                    "recall": 0.92,
                    "f1": 0.9,
                    "auc": 0.95,
                }
            },
            "best_model": "xgboost",
        }

    def get_features_metadata(self):
        return {
            "expected_features": ["f1", "f2"],
            "sample_data": {"f1": 0.1, "f2": 0.2},
            "supported_models": ["random_forest", "xgboost"],
        }


def load_app_module():
    with patch.object(threading.Thread, "start", lambda self: None):
        app_module = importlib.import_module("app")
        return importlib.reload(app_module)


class ApiContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.app_module = load_app_module()
        cls.app = cls.app_module.create_app(pipeline_override=DummyPipeline())
        cls.client = cls.app.test_client()

    def test_predict_endpoint_returns_required_contract(self) -> None:
        response = self.client.post(
            "/predict",
            json={"model": "xgboost", "features": {"f1": 0.1, "f2": 0.2}},
        )

        self.assertEqual(response.status_code, 200, response.get_data(as_text=True))
        payload = response.get_json()
        self.assertEqual(
            set(payload.keys()),
            {"prediction", "probability", "confidence"},
        )
        self.assertIsInstance(payload["prediction"], int)
        self.assertIsInstance(payload["probability"], float)
        self.assertIsInstance(payload["confidence"], float)

    def test_explain_endpoint_returns_local_shap_json(self) -> None:
        response = self.client.post(
            "/explain",
            json={"model": "random_forest", "features": {"f1": 0.1, "f2": 0.2}},
        )

        self.assertEqual(response.status_code, 200, response.get_data(as_text=True))
        payload = response.get_json()
        self.assertEqual(
            set(payload.keys()),
            {"shap_values", "feature_names", "base_value", "prediction"},
        )
        self.assertEqual(len(payload["shap_values"]), len(payload["feature_names"]))
        self.assertIsInstance(payload["base_value"], float)
        self.assertIsInstance(payload["prediction"], int)

    def test_metrics_endpoint_returns_saved_metrics_json(self) -> None:
        response = self.client.get("/metrics")

        self.assertEqual(response.status_code, 200, response.get_data(as_text=True))
        payload = response.get_json()
        self.assertIn("models", payload)
        self.assertIn("best_model", payload)
        self.assertIn("xgboost", payload["models"])

    def test_predict_returns_validation_error_for_feature_mismatch(self) -> None:
        def raise_validation_error(features, model_name="xgboost"):
            raise ValueError("Feature mismatch. Missing: ['f2']")

        self.app.config["PIPELINE"].predict = raise_validation_error

        response = self.client.post(
            "/predict",
            json={"model": "xgboost", "features": {"f1": 0.1}},
        )

        self.assertEqual(response.status_code, 400, response.get_data(as_text=True))
        payload = response.get_json()
        self.assertIn("Feature mismatch", json.dumps(payload))


if __name__ == "__main__":
    unittest.main()
