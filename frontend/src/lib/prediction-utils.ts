import type { ExplanationResult, ModelMetrics } from "@/lib/api";

export interface ShapChartDatum {
  name: string;
  value: number;
  absValue: number;
}

export interface PlainLanguageMetricCard {
  key: "accuracy" | "recall" | "precision";
  label: string;
  description: string;
  value: number;
}

export interface GroupedExplainabilityDatum extends ShapChartDatum {
  featureCount: number;
}

export interface AdvancedFeatureRow {
  featureName: string;
  displayGroup: string;
  shapValue: number;
  absValue: number;
  featureValue: number | null;
  direction: "increase" | "decrease";
}

const primaryMetricKeys = ["accuracy", "recall", "precision"] as const;

const metricCopy: Record<PlainLanguageMetricCard["key"], Omit<PlainLanguageMetricCard, "value">> =
  {
    accuracy: {
      key: "accuracy",
      label: "Overall reliability",
      description:
        "How often the model gave the correct result across the study data.",
    },
    recall: {
      key: "recall",
      label: "How often it catches likely Parkinson's cases",
      description:
        "Higher numbers mean the model is less likely to miss a likely Parkinson's case.",
    },
    precision: {
      key: "precision",
      label: "How trustworthy a positive warning is",
      description:
        "Higher numbers mean a positive result is more likely to be correct.",
    },
  };

const voiceInstabilityPattern =
  /(jitter|shimmer|harmonicity|noise|pulses|period|ppe|rpde|dfa|gq|gne)/i;
const energyVariationPattern =
  /(energy|intensity|tkeo|vfer|imf|log_energy)/i;
const frequencyPatternPattern =
  /(mfcc|delta|formant|^f[1-4]$|^b[1-4]$|freq)/i;
const wavePatternPattern =
  /(tqwt|entropy|maxvalue|minvalue|stdvalue|meanvalue|medianvalue|kurtosis|skewness)/i;

export function formatModelName(model: string): string {
  if (model === "random_forest") {
    return "Random Forest";
  }
  if (model === "xgboost") {
    return "XGBoost";
  }
  return model;
}

export function predictionLabel(prediction: number): string {
  return prediction === 1 ? "Parkinson's Positive" : "Healthy";
}

export function riskLabel(probability: number): string {
  if (probability >= 0.67) {
    return "High Risk";
  }
  if (probability >= 0.33) {
    return "Medium Risk";
  }
  return "Low Risk";
}

export function confidenceLabel(confidence: number): string {
  if (confidence >= 0.85) {
    return "High confidence";
  }
  if (confidence >= 0.65) {
    return "Moderate confidence";
  }
  return "Low confidence";
}

export function riskToneClass(risk: string): string {
  if (risk === "High Risk") {
    return "bg-red-50 text-red-600";
  }
  if (risk === "Medium Risk") {
    return "bg-yellow-50 text-yellow-600";
  }
  return "bg-green-50 text-green-600";
}

export function buildShapChartData(
  explanation: ExplanationResult | null
): ShapChartDatum[] {
  if (!explanation) {
    return [];
  }

  return explanation.feature_names
    .map((name, index) => ({
      name,
      value: explanation.shap_values[index] ?? 0,
      absValue: Math.abs(explanation.shap_values[index] ?? 0),
    }))
    .sort((left, right) => right.absValue - left.absValue);
}

export function buildPlainLanguageMetricCards(
  metrics: ModelMetrics
): PlainLanguageMetricCard[] {
  return primaryMetricKeys.map((key) => ({
    ...metricCopy[key],
    value: metrics[key],
  }));
}

export function getMetricCopy() {
  return metricCopy;
}

export function getFriendlyFeatureGroup(featureName: string): string {
  if (voiceInstabilityPattern.test(featureName)) {
    return "Voice instability";
  }

  if (energyVariationPattern.test(featureName)) {
    return "Energy variation";
  }

  if (frequencyPatternPattern.test(featureName)) {
    return "Frequency pattern shifts";
  }

  if (wavePatternPattern.test(featureName)) {
    return "Wave-pattern complexity";
  }

  return "Other signal changes";
}

export function buildGroupedShapData(
  explanation: ExplanationResult | null
): GroupedExplainabilityDatum[] {
  if (!explanation) {
    return [];
  }

  const grouped = new Map<
    string,
    { value: number; absValue: number; featureCount: number }
  >();

  explanation.feature_names.forEach((featureName, index) => {
    const value = explanation.shap_values[index] ?? 0;
    const groupName = getFriendlyFeatureGroup(featureName);
    const current = grouped.get(groupName) ?? {
      value: 0,
      absValue: 0,
      featureCount: 0,
    };

    current.value += value;
    current.absValue = Math.abs(current.value);
    current.featureCount += 1;
    grouped.set(groupName, current);
  });

  return Array.from(grouped.entries())
    .map(([name, group]) => ({
      name,
      value: group.value,
      absValue: Math.abs(group.value),
      featureCount: group.featureCount,
    }))
    .sort((left, right) => right.absValue - left.absValue);
}

export function buildAdvancedFeatureRows(
  explanation: ExplanationResult | null,
  features: Record<string, number> | null
): AdvancedFeatureRow[] {
  if (!explanation) {
    return [];
  }

  return explanation.feature_names
    .map((featureName, index) => {
      const shapValue = explanation.shap_values[index] ?? 0;
      return {
        featureName,
        displayGroup: getFriendlyFeatureGroup(featureName),
        shapValue,
        absValue: Math.abs(shapValue),
        featureValue: features?.[featureName] ?? null,
        direction: shapValue >= 0 ? ("increase" as const) : ("decrease" as const),
      };
    })
    .sort((left, right) => right.absValue - left.absValue);
}

export function buildDriverSentence(driver: GroupedExplainabilityDatum): string {
  const label = driver.name.toLowerCase();
  if (driver.value >= 0) {
    return `Higher ${label} increased the model's Parkinson's risk score.`;
  }

  return `${driver.name} reduced the model's Parkinson's risk score slightly.`;
}

export function formatShapDirection(value: number): string {
  return value >= 0
    ? "Pushed the model's risk score upward"
    : "Pulled the model's risk score downward";
}
