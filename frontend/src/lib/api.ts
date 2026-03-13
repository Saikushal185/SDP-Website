const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PredictionResult {
  prediction: string;
  probability: number;
  risk_category: string;
  confidence: string;
  model: string;
  shap_values: Record<string, number>;
  features_used: Record<string, number>;
}

export interface CSVPredictionRow {
  index: number;
  prediction: string;
  probability: number;
  risk_category: string;
}

export interface CSVPredictionResult {
  predictions: CSVPredictionRow[];
  summary: {
    total: number;
    parkinsons: number;
    healthy: number;
    mean_probability: number;
    risk_distribution: Record<string, number>;
  };
  error?: string;
}

export interface MetricDetail {
  mean: number;
  std: number;
  per_fold: number[];
}

export interface ModelMetrics {
  accuracy: MetricDetail;
  precision: MetricDetail;
  recall: MetricDetail;
  f1: MetricDetail;
  roc_auc: MetricDetail;
}

export interface PerformanceData {
  models: Record<string, ModelMetrics>;
  best_model: string;
  roc_data: Record<string, { fpr: number[]; tpr: number[] }>;
}

export interface FeatureImportanceItem {
  name: string;
  importance: number;
}

export interface ShapValueItem {
  name: string;
  mean_abs_shap: number;
}

export interface ExplainabilityData {
  feature_importance: FeatureImportanceItem[];
  global_shap_values: ShapValueItem[];
  selected_features: string[];
}

export interface FeaturesData {
  selected_features: string[];
  all_features: string[];
  n_selected: number;
  sample_data: Record<string, number>;
}

export interface ModelInfo {
  dataset_size: number;
  n_total_features: number;
  n_selected_features: number;
  models: string[];
  best_model: string;
  best_accuracy: number;
  feature_selection_method: string;
}

// ─── API Functions ──────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}

export function fetchFeatures(): Promise<FeaturesData> {
  return apiFetch("/api/features");
}

export function predict(
  features: Record<string, number>,
  model: string = "XGBoost"
): Promise<PredictionResult> {
  return apiFetch("/api/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ features, model }),
  });
}

export async function predictCSV(file: File): Promise<CSVPredictionResult> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch("/api/predict-csv", {
    method: "POST",
    body: formData,
  });
}

export function fetchPerformance(): Promise<PerformanceData> {
  return apiFetch("/api/performance");
}

export function fetchExplainability(): Promise<ExplainabilityData> {
  return apiFetch("/api/explainability");
}

export function fetchModelInfo(): Promise<ModelInfo> {
  return apiFetch("/api/model-info");
}
