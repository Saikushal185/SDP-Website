"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaUpload, FaFlask, FaPlay } from "react-icons/fa";
import ProbabilityGauge from "@/components/charts/ProbabilityGauge";
import {
  fetchFeatures,
  predict,
  predictCSV,
  type PredictionResult,
  type CSVPredictionResult,
  type FeaturesData,
} from "@/lib/api";
import { usePrediction } from "@/context/PredictionContext";

export default function UploadPage() {
  const router = useRouter();
  const { setLastPrediction } = usePrediction();

  const [featuresInfo, setFeaturesInfo] = useState<FeaturesData | null>(null);
  const [featureValues, setFeatureValues] = useState<Record<string, string>>(
    {}
  );
  const [selectedModel, setSelectedModel] = useState("XGBoost");
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [csvResult, setCsvResult] = useState<CSVPredictionResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch feature names on mount
  useEffect(() => {
    fetchFeatures()
      .then((data) => {
        setFeaturesInfo(data);
        const init: Record<string, string> = {};
        data.selected_features.forEach((f) => (init[f] = ""));
        setFeatureValues(init);
      })
      .catch((e) => setError(e.message));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFeatureValues({ ...featureValues, [e.target.name]: e.target.value });
  };

  const handleLoadSample = () => {
    if (!featuresInfo?.sample_data) return;
    const sample: Record<string, string> = {};
    for (const [key, val] of Object.entries(featuresInfo.sample_data)) {
      sample[key] = String(val);
    }
    setFeatureValues(sample);
  };

  const handlePredict = async () => {
    setLoading(true);
    setError("");
    setCsvResult(null);
    try {
      const numericFeatures: Record<string, number> = {};
      for (const [key, val] of Object.entries(featureValues)) {
        numericFeatures[key] = val ? parseFloat(val) : 0;
      }
      const result = await predict(numericFeatures, selectedModel);
      setPrediction(result);
      setLastPrediction(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setLoading(true);
    setError("");
    setPrediction(null);
    try {
      const result = await predictCSV(file);
      if (result.error) {
        setError(result.error);
      } else {
        setCsvResult(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "CSV prediction failed");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = () => {
    router.push("/prediction");
  };

  const riskColor = (risk: string) => {
    if (risk === "High Risk") return "bg-red-50 text-red-600";
    if (risk === "Medium Risk") return "bg-yellow-50 text-yellow-600";
    return "bg-green-50 text-green-600";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Data</h1>
        <p className="text-gray-500 mt-1">
          Upload a CSV file or enter speech features manually
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Panel - Input */}
        <div className="space-y-6">
          {/* CSV Upload */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FaUpload className="text-blue-500" />
              Upload CSV
            </h2>
            <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-blue-200 rounded-xl cursor-pointer bg-blue-50/50 hover:bg-blue-50 transition-colors">
              <div className="flex flex-col items-center">
                <FaUpload className="text-blue-400 text-2xl mb-2" />
                <p className="text-sm text-gray-500">
                  {fileName || "Click to upload or drag & drop"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  CSV with speech features (max 1000 rows)
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

          {/* Manual Input */}
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

            {/* Model Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
              >
                <option value="XGBoost">XGBoost (Recommended)</option>
                <option value="MLP">MLP (Neural Network)</option>
              </select>
            </div>

            {/* Feature Inputs - scrollable grid */}
            <div className="max-h-80 overflow-y-auto pr-2 space-y-3">
              {featuresInfo?.selected_features.map((key) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {key}
                  </label>
                  <input
                    type="number"
                    name={key}
                    value={featureValues[key] || ""}
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

        {/* Right Panel - Results */}
        <div>
          {/* Single Prediction Result */}
          {prediction && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-blue-50 mb-6">
              <div className="text-center w-full">
                <div
                  className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-full mb-6 ${riskColor(
                    prediction.risk_category
                  )}`}
                >
                  {prediction.risk_category}
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-1">
                  {prediction.prediction}
                </h3>
                <p className="text-gray-400 text-sm mb-2">
                  {prediction.confidence} &middot; {prediction.model}
                </p>

                <ProbabilityGauge probability={prediction.probability} />

                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-sm bg-gray-50 rounded-lg px-4 py-2">
                    <span className="text-gray-500">Probability</span>
                    <span className="font-semibold text-gray-800">
                      {(prediction.probability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm bg-gray-50 rounded-lg px-4 py-2">
                    <span className="text-gray-500">Risk Level</span>
                    <span className="font-semibold text-gray-800">
                      {prediction.risk_category}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleViewDetails}
                  className="mt-4 text-blue-600 text-sm font-medium hover:underline"
                >
                  View detailed analysis &rarr;
                </button>
              </div>
            </div>
          )}

          {/* CSV Batch Result */}
          {csvResult && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Batch Prediction Results
              </h3>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-gray-800">
                    {csvResult.summary.total}
                  </p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-red-600">
                    {csvResult.summary.parkinsons}
                  </p>
                  <p className="text-xs text-gray-500">Parkinson&apos;s</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-green-600">
                    {csvResult.summary.healthy}
                  </p>
                  <p className="text-xs text-gray-500">Healthy</p>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left pb-2 text-gray-500">#</th>
                      <th className="text-left pb-2 text-gray-500">
                        Prediction
                      </th>
                      <th className="text-center pb-2 text-gray-500">Prob</th>
                      <th className="text-right pb-2 text-gray-500">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvResult.predictions.slice(0, 50).map((row) => (
                      <tr key={row.index} className="border-b border-gray-50">
                        <td className="py-2 text-gray-400">{row.index + 1}</td>
                        <td className="py-2 font-medium text-gray-700">
                          {row.prediction === "Parkinson's Disease"
                            ? "PD"
                            : "Healthy"}
                        </td>
                        <td className="py-2 text-center text-gray-600">
                          {(row.probability * 100).toFixed(1)}%
                        </td>
                        <td className="py-2 text-right">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${riskColor(
                              row.risk_category
                            )}`}
                          >
                            {row.risk_category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvResult.predictions.length > 50 && (
                  <p className="text-xs text-gray-400 text-center mt-2">
                    Showing first 50 of {csvResult.predictions.length} results
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!prediction && !csvResult && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-blue-50 min-h-[400px] flex flex-col items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaFlask className="text-blue-300 text-3xl" />
                </div>
                <h3 className="text-lg font-semibold text-gray-400">
                  No Prediction Yet
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  Upload data or enter features to get a prediction
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
        These scores represent Parkinson&apos;s disease likelihood based on
        speech features and should NOT be interpreted as medical diagnosis.
      </div>
    </div>
  );
}
