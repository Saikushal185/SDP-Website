"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaFileUpload, FaFlask, FaPlay, FaUpload } from "react-icons/fa";
import ProbabilityGauge from "@/components/charts/ProbabilityGauge";
import {
  ActionButton,
  EmptyState,
  PageIntro,
  Panel,
  SiteContainer,
  StatusPill,
} from "@/components/site/ui";
import { usePrediction } from "@/context/PredictionContext";
import { parseCsvFeatureRow } from "@/lib/csv";
import { explain, fetchFeatures, predict, type FeaturesData } from "@/lib/api";
import {
  confidenceLabel,
  formatModelName,
  predictionLabel,
  riskLabel,
  riskTone,
} from "@/lib/prediction-utils";

function buildNumericFeatures(
  rawValues: Record<string, string>,
  expectedFeatures: string[]
): Record<string, number> {
  const numericFeatures: Record<string, number> = {};

  for (const feature of expectedFeatures) {
    const rawValue = rawValues[feature]?.trim() ?? "";
    const parsed = rawValue === "" ? 0 : Number.parseFloat(rawValue);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Feature \`${feature}\` must be numeric.`);
    }
    numericFeatures[feature] = parsed;
  }

  return numericFeatures;
}

export default function UploadPage() {
  const {
    prediction,
    model,
    uploadedFileName,
    setPredictionBundle,
  } = usePrediction();

  const [featuresInfo, setFeaturesInfo] = useState<FeaturesData | null>(null);
  const [featureValues, setFeatureValues] = useState<Record<string, string>>({});
  const [selectedModel, setSelectedModel] = useState("xgboost");
  const [fileName, setFileName] = useState("");
  const [csvNotice, setCsvNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetchFeatures()
      .then((data) => {
        if (cancelled) {
          return;
        }

        setFeaturesInfo(data);
        setSelectedModel(data.supported_models[0] || "xgboost");

        const nextValues: Record<string, string> = {};
        data.expected_features.forEach((feature) => {
          nextValues[feature] =
            data.sample_data[feature] !== undefined
              ? String(data.sample_data[feature])
              : "";
        });
        setFeatureValues(nextValues);
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load feature metadata."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFeatureValues((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleLoadSample = () => {
    if (!featuresInfo?.sample_data) {
      return;
    }

    const sampleValues: Record<string, string> = {};
    featuresInfo.expected_features.forEach((feature) => {
      sampleValues[feature] =
        featuresInfo.sample_data[feature] !== undefined
          ? String(featuresInfo.sample_data[feature])
          : "";
    });
    setFeatureValues(sampleValues);
    setCsvNotice("");
    setError("");
  };

  const runAnalysis = async (
    features: Record<string, number>,
    uploadedFileLabel: string | null = null
  ) => {
    setLoading(true);
    setError("");
    setPredictionBundle(null);

    try {
      const [predictionResult, explanationResult] = await Promise.all([
        predict(features, selectedModel),
        explain(features, selectedModel),
      ]);

      setPredictionBundle({
        prediction: predictionResult,
        explanation: explanationResult,
        features,
        model: selectedModel,
        uploadedFileName: uploadedFileLabel,
      });
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "Prediction failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async () => {
    if (!featuresInfo) {
      return;
    }

    setCsvNotice("");

    try {
      const numericFeatures = buildNumericFeatures(
        featureValues,
        featuresInfo.expected_features
      );
      await runAnalysis(numericFeatures, null);
    } catch (validationError) {
      setError(
        validationError instanceof Error
          ? validationError.message
          : "Invalid feature values."
      );
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !featuresInfo) {
      return;
    }

    setFileName(file.name);
    setError("");

    try {
      const csvText = await file.text();
      const { features, rowCount, ignoredColumns } = parseCsvFeatureRow(
        csvText,
        featuresInfo.expected_features
      );

      const nextValues: Record<string, string> = {};
      featuresInfo.expected_features.forEach((feature) => {
        nextValues[feature] = String(features[feature]);
      });
      setFeatureValues(nextValues);

      const noticeParts = [`Loaded ${file.name}.`];
      if (ignoredColumns.length > 0) {
        noticeParts.push(
          `Ignored ${ignoredColumns.length} extra column${
            ignoredColumns.length === 1 ? "" : "s"
          } that are not required by the deployed model.`
        );
      }
      if (rowCount > 1) {
        noticeParts.push(
          "Using the first row for prediction and explainability."
        );
      }
      setCsvNotice(noticeParts.join(" "));

      await runAnalysis(features, file.name);
    } catch (csvError) {
      setError(
        csvError instanceof Error ? csvError.message : "CSV parsing failed."
      );
    } finally {
      event.target.value = "";
    }
  };

  const displayedPrediction = prediction;
  const displayedRisk = displayedPrediction
    ? riskLabel(displayedPrediction.probability)
    : null;
  const reviewModel = model || selectedModel;

  return (
    <div className="pb-20">
      <PageIntro
        eyebrow="Analysis workspace"
        title="Upload feature inputs and generate a live reviewable result."
        description="This page supports both quick faculty demos and deeper technical walkthroughs. Start with a CSV or use manual feature input, then continue into prediction and explainability."
        meta={[
          {
            label: "Expected features",
            value: featuresInfo ? `${featuresInfo.feature_count}` : "Loading",
          },
          {
            label: "Supported models",
            value: featuresInfo
              ? `${featuresInfo.supported_models.length}`
              : "Loading",
          },
          {
            label: "Current mode",
            value: displayedPrediction ? "Live result" : "Awaiting input",
          },
        ]}
      />

      <SiteContainer className="space-y-6 pt-10">
        {error ? (
          <div className="rounded-[24px] border border-[rgba(142,75,67,0.18)] bg-[rgba(142,75,67,0.1)] px-5 py-4 text-sm leading-7 text-[var(--danger)]">
            {error}
          </div>
        ) : null}

        {csvNotice ? (
          <div className="rounded-[24px] border border-[rgba(29,72,80,0.14)] bg-[rgba(29,72,80,0.08)] px-5 py-4 text-sm leading-7 text-[var(--accent-strong)]">
            {csvNotice}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <Panel>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">CSV import</p>
                  <h2 className="mt-3 text-2xl font-semibold text-[var(--text-strong)]">
                    Load a prepared sample row
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
                    The upload flow accepts extra columns, but the deployed model
                    still expects the required voice features to be present.
                  </p>
                </div>
                <StatusPill tone="positive">Single-row review</StatusPill>
              </div>

              <label className="mt-8 flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-[var(--border-strong)] bg-[rgba(255,255,255,0.42)] px-6 text-center transition hover:bg-[rgba(255,255,255,0.6)]">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)] text-2xl text-[var(--accent-strong)]">
                  <FaUpload />
                </div>
                <p className="mt-6 text-lg font-semibold text-[var(--text-strong)]">
                  {fileName || "Choose a CSV file to preload the workspace"}
                </p>
                <p className="mt-3 max-w-md text-sm leading-7 text-[var(--text-muted)]">
                  After upload, the first usable row becomes the active sample
                  for prediction and SHAP explanation.
                </p>
                <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]">
                  <FaFileUpload className="text-xs" />
                  Browse CSV
                </span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </Panel>

            <Panel tone="muted">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">Manual input</p>
                  <h2 className="mt-3 text-2xl font-semibold text-[var(--text-strong)]">
                    Enter feature values directly
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
                    Use the saved sample values as a starting point or adjust
                    individual features before running the model.
                  </p>
                </div>
                <ActionButton variant="secondary" onClick={handleLoadSample}>
                  Load sample
                </ActionButton>
              </div>

              <div className="mt-8">
                <label className="field-label" htmlFor="selected-model">
                  Model
                </label>
                <select
                  id="selected-model"
                  value={selectedModel}
                  onChange={(event) => setSelectedModel(event.target.value)}
                  className="select-shell"
                >
                  {(featuresInfo?.supported_models || ["xgboost"]).map(
                    (supportedModel) => (
                      <option key={supportedModel} value={supportedModel}>
                        {formatModelName(supportedModel)}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="mt-8 grid max-h-[520px] gap-4 overflow-y-auto pr-2 sm:grid-cols-2">
                {featuresInfo?.expected_features.map((feature) => (
                  <div key={feature}>
                    <label className="field-label" htmlFor={feature}>
                      {feature}
                    </label>
                    <input
                      id={feature}
                      type="number"
                      name={feature}
                      value={featureValues[feature] || ""}
                      onChange={handleInputChange}
                      placeholder="0.0"
                      step="any"
                      className="input-shell"
                    />
                  </div>
                )) || (
                  <p className="text-sm text-[var(--text-muted)]">
                    Loading features...
                  </p>
                )}
              </div>

              <ActionButton
                onClick={handlePredict}
                disabled={loading || !featuresInfo}
                className="mt-8 w-full"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Analyzing sample
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FaPlay className="text-xs" />
                    Run Parkinson&apos;s prediction
                  </span>
                )}
              </ActionButton>
            </Panel>
          </div>

          <div className="space-y-6">
            {displayedPrediction && displayedRisk ? (
              <Panel tone="strong">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <StatusPill tone={riskTone(displayedRisk)}>
                      {displayedRisk}
                    </StatusPill>
                    <h2 className="mt-5 font-display text-4xl text-[#f8f5ef]">
                      {predictionLabel(displayedPrediction.prediction)}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-[rgba(248,245,239,0.74)]">
                      {confidenceLabel(displayedPrediction.confidence)} using{" "}
                      {formatModelName(reviewModel)}
                    </p>
                  </div>
                  {uploadedFileName ? (
                    <StatusPill tone="accent">{uploadedFileName}</StatusPill>
                  ) : null}
                </div>

                <div className="mt-8 flex justify-center">
                  <ProbabilityGauge probability={displayedPrediction.probability} />
                </div>

                <div className="mt-8 space-y-3">
                  <div className="data-row !border-[rgba(248,245,239,0.08)] !text-[rgba(248,245,239,0.72)]">
                    <span>Probability</span>
                    <span className="font-semibold text-[#f8f5ef]">
                      {(displayedPrediction.probability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="data-row !border-[rgba(248,245,239,0.08)] !text-[rgba(248,245,239,0.72)]">
                    <span>Confidence</span>
                    <span className="font-semibold text-[#f8f5ef]">
                      {(displayedPrediction.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="data-row !border-[rgba(248,245,239,0.08)] !text-[rgba(248,245,239,0.72)]">
                    <span>Selected model</span>
                    <span className="font-semibold text-[#f8f5ef]">
                      {formatModelName(reviewModel)}
                    </span>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/prediction"
                    className="inline-flex items-center justify-center rounded-full border border-[rgba(248,245,239,0.16)] bg-[rgba(248,245,239,0.08)] px-4 py-2 text-sm font-semibold text-[#f8f5ef]"
                  >
                    View prediction detail
                  </Link>
                  <Link
                    href="/explainability"
                    className="inline-flex items-center justify-center rounded-full border border-[rgba(248,245,239,0.16)] bg-[rgba(248,245,239,0.08)] px-4 py-2 text-sm font-semibold text-[#f8f5ef]"
                  >
                    Review SHAP explanation
                  </Link>
                </div>
              </Panel>
            ) : (
              <EmptyState
                icon={<FaFlask />}
                title="No prediction yet"
                description="Upload a CSV or enter the expected voice features to create the live result that will power the next routes."
              />
            )}

            <Panel>
              <p className="eyebrow">How to present this page</p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--text-strong)]">
                A clean starting point for demos
              </h2>
              <div className="mt-6 space-y-3">
                <div className="data-row">
                  <span className="text-sm text-[var(--text-muted)]">
                    1. Load a realistic sample
                  </span>
                  <span className="font-semibold text-[var(--text-strong)]">
                    CSV or sample values
                  </span>
                </div>
                <div className="data-row">
                  <span className="text-sm text-[var(--text-muted)]">
                    2. Run the model live
                  </span>
                  <span className="font-semibold text-[var(--text-strong)]">
                    Prediction + confidence
                  </span>
                </div>
                <div className="data-row">
                  <span className="text-sm text-[var(--text-muted)]">
                    3. Continue the story
                  </span>
                  <span className="font-semibold text-[var(--text-strong)]">
                    Prediction and explainability
                  </span>
                </div>
              </div>
            </Panel>
          </div>
        </div>

        <div className="callout-warning">
          These scores represent Parkinson&apos;s disease likelihood based on
          speech features and should not be treated as a medical diagnosis.
        </div>
      </SiteContainer>
    </div>
  );
}
