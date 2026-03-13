"""
ML Pipeline Module for the Web Dashboard

Trains models on startup using the research pipeline code and exposes
prediction, explainability, and performance methods for the Flask API.
"""

import sys
import os
import logging
import time
from typing import Dict, Any, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, roc_curve
)
import xgboost as xgb
from sklearn.neural_network import MLPClassifier
import shap
import yaml

logger = logging.getLogger(__name__)


class MLPipeline:
    """
    Core ML pipeline that trains models on startup and serves predictions.

    Imports data and config from parkinson_feature_study/ but does NOT
    import the research package directly (to avoid pennylane dependency).
    Instead, it reimplements the essential logic inline.
    """

    def __init__(self, project_root: str) -> None:
        self.project_root = project_root
        self.study_dir = os.path.join(project_root, "parkinson_feature_study")
        self.is_ready = False

        # Will be populated during init_pipeline()
        self.config: Dict[str, Any] = {}
        self.xgb_model: Optional[xgb.XGBClassifier] = None
        self.mlp_model: Optional[MLPClassifier] = None
        self.scaler: Optional[StandardScaler] = None
        self.selected_feature_names: List[str] = []
        self.all_feature_names: List[str] = []
        self.feature_importances: List[Dict[str, Any]] = []
        self.shap_explainer: Optional[shap.TreeExplainer] = None
        self.global_shap_values: List[Dict[str, Any]] = []
        self.cv_metrics: Dict[str, Any] = {}
        self.roc_data: Dict[str, Any] = {}
        self.dataset_size: int = 0
        self.sample_data: Dict[str, float] = {}
        self.X_train_scaled: Optional[np.ndarray] = None  # for SHAP background

    def init_pipeline(self) -> None:
        """Train models and prepare everything. Call once at startup."""
        start = time.time()
        logger.info("Initializing ML pipeline...")

        # 1. Load config
        config_path = os.path.join(self.study_dir, "config.yaml")
        with open(config_path, "r") as f:
            self.config = yaml.safe_load(f)
        logger.info("Config loaded")

        # 2. Load dataset
        data_path = os.path.join(
            self.study_dir,
            self.config["data"]["raw_data_path"]
        )
        df = pd.read_csv(data_path)
        self.dataset_size = len(df)
        logger.info(f"Dataset loaded: {len(df)} samples, {len(df.columns)} columns")

        # 3. Prepare features
        target_col = self.config["data"]["target_column"]
        exclude_cols = set(self.config["data"].get("exclude_columns", []))
        exclude_cols.add(target_col)

        self.all_feature_names = [
            col for col in df.columns if col not in exclude_cols
        ]

        X = df[self.all_feature_names].values.astype(np.float64)
        y = df[target_col].values.astype(np.int32)

        # Handle missing values
        n_missing = np.isnan(X).sum()
        if n_missing > 0:
            col_means = np.nanmean(X, axis=0)
            inds = np.where(np.isnan(X))
            X[inds] = np.take(col_means, inds[1])
            logger.info(f"Imputed {n_missing} missing values")

        # 4. Feature selection using Random Forest importance
        from sklearn.ensemble import RandomForestClassifier

        n_features_to_select = self.config["feature_selection"]["n_features_to_select"]
        rf_config = self.config["feature_selection"]["classical"]
        seed = self.config["general"]["random_seed"]

        # Scale all features first for feature selection
        temp_scaler = StandardScaler()
        X_scaled_all = temp_scaler.fit_transform(X)

        rf = RandomForestClassifier(
            n_estimators=rf_config.get("n_estimators", 100),
            max_depth=rf_config.get("max_depth", 10),
            min_samples_split=rf_config.get("min_samples_split", 5),
            min_samples_leaf=rf_config.get("min_samples_leaf", 2),
            random_state=seed,
            n_jobs=-1
        )
        rf.fit(X_scaled_all, y)

        importances = rf.feature_importances_
        top_indices = np.argsort(importances)[::-1][:n_features_to_select]

        self.selected_feature_names = [self.all_feature_names[i] for i in top_indices]

        # Store feature importances (top 30)
        self.feature_importances = [
            {"name": self.all_feature_names[i], "importance": float(importances[i])}
            for i in top_indices
        ]
        self.feature_importances.sort(key=lambda x: x["importance"], reverse=True)

        logger.info(f"Selected {len(self.selected_feature_names)} features")
        logger.info(f"Top 5: {self.selected_feature_names[:5]}")

        # 5. Prepare selected feature data
        X_selected = X[:, top_indices]

        # Fit production scaler on selected features
        self.scaler = StandardScaler()
        X_selected_scaled = self.scaler.fit_transform(X_selected)
        self.X_train_scaled = X_selected_scaled  # store for SHAP background

        # Store a sample for the "Load Sample" button
        sample_idx = 0
        self.sample_data = {
            name: float(X_selected[sample_idx, i])
            for i, name in enumerate(self.selected_feature_names)
        }

        # 6. Run 5-fold CV to get real performance metrics
        logger.info("Running 5-fold cross-validation...")
        self._run_cross_validation(X_selected, y)

        # 7. Train production models on full dataset
        logger.info("Training production models on full dataset...")
        self._train_production_models(X_selected_scaled, y)

        # 8. Compute SHAP values
        logger.info("Computing SHAP values...")
        self._compute_shap(X_selected_scaled)

        elapsed = time.time() - start
        self.is_ready = True
        logger.info(f"ML pipeline ready in {elapsed:.1f}s")

    def _run_cross_validation(self, X: np.ndarray, y: np.ndarray) -> None:
        """Run 5-fold CV and store metrics + ROC data."""
        seed = self.config["general"]["random_seed"]
        n_folds = self.config["cross_validation"]["n_folds"]

        skf = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=seed)

        xgb_config = self.config["models"]["xgboost"]
        mlp_config = self.config["models"]["mlp"]

        # Collect per-fold metrics
        model_metrics = {"XGBoost": [], "MLP": []}
        # Collect all predictions for ROC
        roc_collectors = {
            "XGBoost": {"y_true": [], "y_proba": []},
            "MLP": {"y_true": [], "y_proba": []}
        }

        for fold_idx, (train_idx, test_idx) in enumerate(skf.split(X, y)):
            X_train, X_test = X[train_idx], X[test_idx]
            y_train, y_test = y[train_idx], y[test_idx]

            fold_scaler = StandardScaler()
            X_train_s = fold_scaler.fit_transform(X_train)
            X_test_s = fold_scaler.transform(X_test)

            # XGBoost
            xgb_clf = xgb.XGBClassifier(
                n_estimators=xgb_config.get("n_estimators", 100),
                max_depth=xgb_config.get("max_depth", 6),
                learning_rate=xgb_config.get("learning_rate", 0.1),
                subsample=xgb_config.get("subsample", 0.8),
                colsample_bytree=xgb_config.get("colsample_bytree", 0.8),
                reg_lambda=xgb_config.get("reg_lambda", 1),
                objective="binary:logistic",
                eval_metric="logloss",
                use_label_encoder=False,
                random_state=seed,
                verbosity=0
            )
            xgb_clf.fit(X_train_s, y_train)
            xgb_pred = xgb_clf.predict(X_test_s)
            xgb_proba = xgb_clf.predict_proba(X_test_s)[:, 1]

            model_metrics["XGBoost"].append(
                self._compute_metrics(y_test, xgb_pred, xgb_proba)
            )
            roc_collectors["XGBoost"]["y_true"].extend(y_test.tolist())
            roc_collectors["XGBoost"]["y_proba"].extend(xgb_proba.tolist())

            # MLP
            hidden_sizes = tuple(mlp_config.get("hidden_layer_sizes", [64, 32]))
            mlp_clf = MLPClassifier(
                hidden_layer_sizes=hidden_sizes,
                activation=mlp_config.get("activation", "relu"),
                solver=mlp_config.get("solver", "adam"),
                alpha=mlp_config.get("alpha", 0.0001),
                learning_rate=mlp_config.get("learning_rate", "adaptive"),
                learning_rate_init=mlp_config.get("learning_rate_init", 0.001),
                max_iter=mlp_config.get("max_iter", 500),
                early_stopping=mlp_config.get("early_stopping", True),
                random_state=seed,
                verbose=False
            )
            mlp_clf.fit(X_train_s, y_train)
            mlp_pred = mlp_clf.predict(X_test_s)
            mlp_proba = mlp_clf.predict_proba(X_test_s)[:, 1]

            model_metrics["MLP"].append(
                self._compute_metrics(y_test, mlp_pred, mlp_proba)
            )
            roc_collectors["MLP"]["y_true"].extend(y_test.tolist())
            roc_collectors["MLP"]["y_proba"].extend(mlp_proba.tolist())

            logger.info(
                f"Fold {fold_idx+1}: XGB acc={model_metrics['XGBoost'][-1]['accuracy']:.4f}, "
                f"MLP acc={model_metrics['MLP'][-1]['accuracy']:.4f}"
            )

        # Aggregate metrics
        self.cv_metrics = {}
        for model_name, fold_metrics_list in model_metrics.items():
            agg = {}
            for metric_name in ["accuracy", "precision", "recall", "f1", "roc_auc"]:
                values = [fm[metric_name] for fm in fold_metrics_list]
                agg[metric_name] = {
                    "mean": float(np.mean(values)),
                    "std": float(np.std(values)),
                    "per_fold": [float(v) for v in values]
                }
            self.cv_metrics[model_name] = agg

        # Compute ROC curve data
        self.roc_data = {}
        for model_name, collector in roc_collectors.items():
            y_true = np.array(collector["y_true"])
            y_proba = np.array(collector["y_proba"])
            fpr, tpr, _ = roc_curve(y_true, y_proba)
            # Downsample to ~100 points for frontend
            if len(fpr) > 100:
                indices = np.linspace(0, len(fpr) - 1, 100, dtype=int)
                fpr = fpr[indices]
                tpr = tpr[indices]
            self.roc_data[model_name] = {
                "fpr": [float(x) for x in fpr],
                "tpr": [float(x) for x in tpr]
            }

        logger.info("Cross-validation complete")

    def _compute_metrics(
        self, y_true: np.ndarray, y_pred: np.ndarray, y_proba: np.ndarray
    ) -> Dict[str, float]:
        return {
            "accuracy": float(accuracy_score(y_true, y_pred)),
            "precision": float(precision_score(y_true, y_pred, zero_division=0)),
            "recall": float(recall_score(y_true, y_pred, zero_division=0)),
            "f1": float(f1_score(y_true, y_pred, zero_division=0)),
            "roc_auc": float(roc_auc_score(y_true, y_proba))
        }

    def _train_production_models(
        self, X_scaled: np.ndarray, y: np.ndarray
    ) -> None:
        """Train final models on full dataset."""
        seed = self.config["general"]["random_seed"]
        xgb_config = self.config["models"]["xgboost"]
        mlp_config = self.config["models"]["mlp"]

        # XGBoost
        self.xgb_model = xgb.XGBClassifier(
            n_estimators=xgb_config.get("n_estimators", 100),
            max_depth=xgb_config.get("max_depth", 6),
            learning_rate=xgb_config.get("learning_rate", 0.1),
            subsample=xgb_config.get("subsample", 0.8),
            colsample_bytree=xgb_config.get("colsample_bytree", 0.8),
            reg_lambda=xgb_config.get("reg_lambda", 1),
            objective="binary:logistic",
            eval_metric="logloss",
            use_label_encoder=False,
            random_state=seed,
            verbosity=0
        )
        self.xgb_model.fit(X_scaled, y)
        logger.info("XGBoost production model trained")

        # MLP
        hidden_sizes = tuple(mlp_config.get("hidden_layer_sizes", [64, 32]))
        self.mlp_model = MLPClassifier(
            hidden_layer_sizes=hidden_sizes,
            activation=mlp_config.get("activation", "relu"),
            solver=mlp_config.get("solver", "adam"),
            alpha=mlp_config.get("alpha", 0.0001),
            learning_rate=mlp_config.get("learning_rate", "adaptive"),
            learning_rate_init=mlp_config.get("learning_rate_init", 0.001),
            max_iter=mlp_config.get("max_iter", 500),
            early_stopping=mlp_config.get("early_stopping", True),
            random_state=seed,
            verbose=False
        )
        self.mlp_model.fit(X_scaled, y)
        logger.info("MLP production model trained")

    def _compute_shap(self, X_scaled: np.ndarray) -> None:
        """Compute SHAP explainer and global values for XGBoost."""
        self.shap_explainer = shap.TreeExplainer(self.xgb_model)

        # Compute SHAP values on a sample of the training data
        sample_size = min(200, len(X_scaled))
        rng = np.random.RandomState(self.config["general"]["random_seed"])
        sample_indices = rng.choice(len(X_scaled), sample_size, replace=False)
        X_sample = X_scaled[sample_indices]

        shap_values = self.shap_explainer.shap_values(X_sample)

        # Mean absolute SHAP values per feature
        mean_abs_shap = np.abs(shap_values).mean(axis=0)
        self.global_shap_values = [
            {
                "name": self.selected_feature_names[i],
                "mean_abs_shap": float(mean_abs_shap[i])
            }
            for i in range(len(self.selected_feature_names))
        ]
        self.global_shap_values.sort(key=lambda x: x["mean_abs_shap"], reverse=True)

        logger.info("SHAP values computed")

    def predict(
        self,
        features_dict: Dict[str, float],
        model_name: str = "XGBoost"
    ) -> Dict[str, Any]:
        """Make a single prediction with SHAP explanation."""
        # Build feature array in correct order
        feature_values = []
        for fname in self.selected_feature_names:
            val = features_dict.get(fname, 0.0)
            feature_values.append(float(val))

        X = np.array([feature_values])
        X_scaled = self.scaler.transform(X)

        # Predict
        if model_name == "MLP" and self.mlp_model is not None:
            proba = self.mlp_model.predict_proba(X_scaled)[0, 1]
            model_used = "MLP"
        else:
            proba = self.xgb_model.predict_proba(X_scaled)[0, 1]
            model_used = "XGBoost"

        prediction = "Parkinson's Disease" if proba >= 0.5 else "Healthy"

        # Risk assessment
        risk_thresholds = self.config.get("interpretability", {}).get(
            "risk_thresholds", {"low": 0.33, "medium": 0.67}
        )
        if proba < risk_thresholds.get("low", 0.33):
            risk_category = "Low Risk"
        elif proba < risk_thresholds.get("medium", 0.67):
            risk_category = "Medium Risk"
        else:
            risk_category = "High Risk"

        distance = abs(proba - 0.5)
        if distance < 0.1:
            confidence = "Low confidence"
        elif distance < 0.25:
            confidence = "Moderate confidence"
        else:
            confidence = "High confidence"

        # SHAP values (only for XGBoost)
        shap_values_dict = {}
        if model_used == "XGBoost" and self.shap_explainer is not None:
            sv = self.shap_explainer.shap_values(X_scaled)[0]
            shap_values_dict = {
                self.selected_feature_names[i]: float(sv[i])
                for i in range(len(self.selected_feature_names))
            }

        return {
            "prediction": prediction,
            "probability": float(proba),
            "risk_category": risk_category,
            "confidence": confidence,
            "model": model_used,
            "shap_values": shap_values_dict,
            "features_used": {
                name: float(features_dict.get(name, 0.0))
                for name in self.selected_feature_names
            }
        }

    def predict_csv(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Make predictions for a CSV DataFrame."""
        # Determine which columns are available
        available_selected = [
            c for c in self.selected_feature_names if c in df.columns
        ]
        available_all = [
            c for c in self.all_feature_names if c in df.columns
        ]

        if len(available_selected) == len(self.selected_feature_names):
            # CSV has the selected features directly
            X = df[self.selected_feature_names].values.astype(np.float64)
        elif len(available_all) >= len(self.all_feature_names) * 0.9:
            # CSV has most/all 752 features — we need to select the right ones
            # Fill missing columns with 0
            for col in self.all_feature_names:
                if col not in df.columns:
                    df[col] = 0.0
            X_all = df[self.all_feature_names].values.astype(np.float64)
            # Get indices of selected features in the all_features list
            selected_indices = [
                self.all_feature_names.index(f) for f in self.selected_feature_names
            ]
            X = X_all[:, selected_indices]
        else:
            return {
                "error": f"CSV must contain either the {len(self.selected_feature_names)} selected features or all {len(self.all_feature_names)} features. "
                         f"Found {len(available_selected)} of {len(self.selected_feature_names)} selected features."
            }

        # Handle NaN
        col_means = np.nanmean(X, axis=0)
        nan_mask = np.isnan(X)
        if nan_mask.any():
            inds = np.where(nan_mask)
            X[inds] = np.take(col_means, inds[1])

        X_scaled = self.scaler.transform(X)

        # Predict with XGBoost
        probas = self.xgb_model.predict_proba(X_scaled)[:, 1]

        predictions = []
        for i in range(len(X_scaled)):
            proba = float(probas[i])
            pred = "Parkinson's Disease" if proba >= 0.5 else "Healthy"

            if proba < 0.33:
                risk = "Low Risk"
            elif proba < 0.67:
                risk = "Medium Risk"
            else:
                risk = "High Risk"

            predictions.append({
                "index": i,
                "prediction": pred,
                "probability": proba,
                "risk_category": risk
            })

        n_pd = sum(1 for p in predictions if p["prediction"] == "Parkinson's Disease")
        n_healthy = len(predictions) - n_pd

        return {
            "predictions": predictions,
            "summary": {
                "total": len(predictions),
                "parkinsons": n_pd,
                "healthy": n_healthy,
                "mean_probability": float(np.mean(probas)),
                "risk_distribution": {
                    "Low Risk": sum(1 for p in predictions if p["risk_category"] == "Low Risk"),
                    "Medium Risk": sum(1 for p in predictions if p["risk_category"] == "Medium Risk"),
                    "High Risk": sum(1 for p in predictions if p["risk_category"] == "High Risk"),
                }
            }
        }

    def get_performance_metrics(self) -> Dict[str, Any]:
        """Return CV metrics and ROC data."""
        # Determine best model
        best_model = max(
            self.cv_metrics.keys(),
            key=lambda m: self.cv_metrics[m]["accuracy"]["mean"]
        )
        return {
            "models": self.cv_metrics,
            "best_model": best_model,
            "roc_data": self.roc_data
        }

    def get_feature_importance(self) -> Dict[str, Any]:
        """Return feature importance and global SHAP values."""
        return {
            "feature_importance": self.feature_importances,
            "global_shap_values": self.global_shap_values,
            "selected_features": self.selected_feature_names
        }

    def get_model_info(self) -> Dict[str, Any]:
        """Return metadata about the pipeline."""
        best_model = max(
            self.cv_metrics.keys(),
            key=lambda m: self.cv_metrics[m]["accuracy"]["mean"]
        )
        best_acc = self.cv_metrics[best_model]["accuracy"]["mean"]

        return {
            "dataset_size": self.dataset_size,
            "n_total_features": len(self.all_feature_names),
            "n_selected_features": len(self.selected_feature_names),
            "models": list(self.cv_metrics.keys()),
            "best_model": best_model,
            "best_accuracy": best_acc,
            "feature_selection_method": "Random Forest Importance"
        }
