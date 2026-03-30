"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaFlask, FaPlay, FaUpload } from "react-icons/fa";
import ProbabilityGauge from "@/components/charts/ProbabilityGauge";
import { usePrediction } from "@/context/PredictionContext";
import { parseCsvFeatureRow } from "@/lib/csv";
import { explain, fetchFeatures, predict, type FeaturesData } from "@/lib/api";
import {
  confidenceLabel,
  formatModelName,
  predictionLabel,
  riskLabel,
  riskToneClass,
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
  const router = useRouter();
  const { prediction, model, setPredictionBundle } = usePrediction();

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
    uploadedFileName: string | null = null
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
        uploadedFileName,
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Data</h1>
        <p className="text-gray-500 mt-1">
          Upload a single-row CSV or enter the expected voice features manually.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {csvNotice && (
        <div className="mb-6 bg-blue-50 text-blue-700 rounded-xl p-4 text-sm">
          {csvNotice}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FaUpload className="text-blue-500" />
              Upload CSV
            </h2>
            <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-blue-200 rounded-xl cursor-pointer bg-blue-50/50 hover:bg-blue-50 transition-colors">
              <div className="flex flex-col items-center text-center px-4">
                <FaUpload className="text-blue-400 text-2xl mb-2" />
                <p className="text-sm text-gray-500">
                  {fileName || "Click to upload a CSV"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Extra dataset columns are allowed, but the required voice
                  features must be present.
                </p>
              </div>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FaFlask className="text-blue-500" />
                Manual Input
              </h2>
              <button
                onClick={handleLoadSample}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Load Sample
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Model
              </label>
              <select
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
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

            <div className="max-h-80 overflow-y-auto pr-2 space-y-3">
              {featuresInfo?.expected_features.map((feature) => (
                <div key={feature}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {feature}
                  </label>
                  <input
                    type="number"
                    name={feature}
                    value={featureValues[feature] || ""}
                    onChange={handleInputChange}
                    placeholder="0.0"
                    step="any"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-gray-50"
                  />
                </div>
              )) || (
                <p className="text-sm text-gray-400 text-center py-4">
                  Loading features...
                </p>
              )}
            </div>

            <button
              onClick={handlePredict}
              disabled={loading || !featuresInfo}
              className="w-full mt-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg shadow-blue-200 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
                  Analyzing...
                </span>
              ) : (
                <>
                  <FaPlay className="text-xs" />
                  Predict Parkinson&apos;s
                </>
              )}
            </button>
          </div>
        </div>

        <div>
          {displayedPrediction && displayedRisk && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-blue-50 mb-6">
              <div className="text-center w-full">
                <div
                  className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-full mb-6 ${riskToneClass(
                    displayedRisk
                  )}`}
                >
                  {displayedRisk}
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-1">
                  {predictionLabel(displayedPrediction.prediction)}
                </h3>
                <p className="text-gray-400 text-sm mb-2">
                  {confidenceLabel(displayedPrediction.confidence)} &middot;{" "}
                  {formatModelName(model || selectedModel)}
                </p>

                <ProbabilityGauge probability={displayedPrediction.probability} />

                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-sm bg-gray-50 rounded-lg px-4 py-2">
                    <span className="text-gray-500">Probability</span>
                    <span className="font-semibold text-gray-800">
                      {(displayedPrediction.probability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm bg-gray-50 rounded-lg px-4 py-2">
                    <span className="text-gray-500">Confidence</span>
                    <span className="font-semibold text-gray-800">
                      {(displayedPrediction.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 mt-5 text-sm">
                  <button
                    onClick={() => router.push("/prediction")}
                    className="text-blue-600 font-medium hover:underline"
                  >
                    View prediction details
                  </button>
                  <button
                    onClick={() => router.push("/explainability")}
                    className="text-blue-600 font-medium hover:underline"
                  >
                    View SHAP explanation
                  </button>
                </div>
              </div>
            </div>
          )}

          {!displayedPrediction && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-blue-50 min-h-[400px] flex flex-col items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaFlask className="text-blue-300 text-3xl" />
                </div>
                <h3 className="text-lg font-semibold text-gray-400">
                  No Prediction Yet
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  Upload a CSV or enter the expected features to analyze one sample.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
        These scores represent Parkinson&apos;s disease likelihood based on
        speech features and should not be treated as a medical diagnosis.
      </div>
    </div>
  );
}
