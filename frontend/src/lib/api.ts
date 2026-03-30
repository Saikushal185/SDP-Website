const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

export interface PredictionResult {
  prediction: number;
  probability: number;
  confidence: number;
}

export interface ExplanationResult {
  shap_values: number[];
  feature_names: string[];
  base_value: number;
  prediction: number;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  auc: number;
}

export interface MetricsData {
  models: Record<string, ModelMetrics>;
  best_model: string;
  roc_data?: Record<string, { fpr: number[]; tpr: number[] }>;
  generated_at?: string;
}

export interface FeaturesData {
  expected_features: string[];
  feature_count: number;
  sample_data: Record<string, number>;
  supported_models: string[];
}

export interface ModelInfo {
  dataset_size: number;
  n_selected_features: number;
  models: string[];
  best_model: string;
  best_accuracy: number;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      `Unable to reach the backend API at ${API_BASE}. Check NEXT_PUBLIC_API_URL.`
    );
  }

  if (!response.ok) {
    const errorPayload = await response
      .json()
      .catch(() => ({ error: response.statusText }));
    throw new Error(errorPayload.error || `API error: ${response.status}`);
  }

  return response.json();
}

export function fetchFeatures(): Promise<FeaturesData> {
  return apiFetch("/features");
}

export function predict(
  features: Record<string, number>,
  model: string = "xgboost"
): Promise<PredictionResult> {
  return apiFetch("/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ features, model }),
  });
}

export function explain(
  features: Record<string, number>,
  model: string = "xgboost"
): Promise<ExplanationResult> {
  return apiFetch("/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ features, model }),
  });
}

export function fetchMetrics(): Promise<MetricsData> {
  return apiFetch("/metrics");
}

export function fetchPerformance(): Promise<MetricsData> {
  return fetchMetrics();
}

export function fetchModelInfo(): Promise<ModelInfo> {
  return apiFetch("/model-info");
}
