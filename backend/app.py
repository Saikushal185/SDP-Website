"""
Flask API for Parkinson's Disease Prediction Dashboard

Serves real ML predictions, SHAP explanations, and performance metrics
using models trained from the research pipeline.
"""

import os
import logging
import threading

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd

from ml_pipeline import MLPipeline

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Resolve project root (parent of backend/)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Initialize ML pipeline
pipeline = MLPipeline(PROJECT_ROOT)


def init_models():
    """Train models in a background thread so the server starts quickly."""
    try:
        pipeline.init_pipeline()
    except Exception as e:
        logger.error(f"Failed to initialize ML pipeline: {e}", exc_info=True)


# Start training in background
init_thread = threading.Thread(target=init_models, daemon=True)
init_thread.start()


@app.before_request
def check_ready():
    """Return 503 if models are still loading (except for /health)."""
    if request.path == "/health":
        return None
    if not pipeline.is_ready:
        return jsonify({
            "error": "Models are still loading. Please try again in a few seconds."
        }), 503


# ─── Health Check ────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "models_loaded": pipeline.is_ready
    })


# ─── Feature Names ──────────────────────────────────────────────────────────

@app.route("/api/features", methods=["GET"])
def get_features():
    """Return the list of selected feature names for the input form."""
    return jsonify({
        "selected_features": pipeline.selected_feature_names,
        "all_features": pipeline.all_feature_names,
        "n_selected": len(pipeline.selected_feature_names),
        "sample_data": pipeline.sample_data
    })


# ─── Single Prediction ──────────────────────────────────────────────────────

@app.route("/api/predict", methods=["POST"])
def predict():
    """Predict from manually entered features."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No input data provided"}), 400

    features = data.get("features", {})
    model_name = data.get("model", "XGBoost")

    if not features:
        return jsonify({"error": "No features provided"}), 400

    try:
        result = pipeline.predict(features, model_name)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


# ─── CSV Prediction ──────────────────────────────────────────────────────────

@app.route("/api/predict-csv", methods=["POST"])
def predict_csv():
    """Predict from an uploaded CSV file."""
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if not file.filename or not file.filename.endswith(".csv"):
        return jsonify({"error": "Please upload a CSV file"}), 400

    try:
        df = pd.read_csv(file)

        if len(df) > 1000:
            return jsonify({
                "error": "CSV too large. Maximum 1000 rows allowed."
            }), 400

        result = pipeline.predict_csv(df)

        if "error" in result:
            return jsonify(result), 400

        return jsonify(result)
    except Exception as e:
        logger.error(f"CSV prediction error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


# ─── Performance Metrics ─────────────────────────────────────────────────────

@app.route("/api/performance", methods=["GET"])
def performance():
    """Return cross-validation metrics and ROC data."""
    return jsonify(pipeline.get_performance_metrics())


# ─── Explainability ──────────────────────────────────────────────────────────

@app.route("/api/explainability", methods=["GET"])
def explainability():
    """Return feature importance and global SHAP values."""
    return jsonify(pipeline.get_feature_importance())


# ─── Model Info ──────────────────────────────────────────────────────────────

@app.route("/api/model-info", methods=["GET"])
def model_info():
    """Return dataset and model metadata."""
    return jsonify(pipeline.get_model_info())


if __name__ == "__main__":
    app.run(debug=True, port=5000)
