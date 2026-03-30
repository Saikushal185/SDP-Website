"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FaChartBar, FaCheckCircle, FaBolt } from "react-icons/fa";
import { usePrediction } from "@/context/PredictionContext";
import { fetchMetrics, type MetricsData } from "@/lib/api";
import {
  buildShapChartData,
  confidenceLabel,
  formatModelName,
  predictionLabel,
  riskLabel,
  riskToneClass,
} from "@/lib/prediction-utils";

export default function PredictionPage() {
  const { explanation, features, model, prediction } = usePrediction();
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  useEffect(() => {
    fetchMetrics().then(setMetrics).catch(console.error);
  }, []);

  if (!prediction) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Prediction Result</h1>
          <p className="text-gray-500 mt-1">
            Detailed analysis of the latest prediction.
          </p>
        </div>
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-blue-50 text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaChartBar className="text-blue-300 text-3xl" />
          </div>
          <h3 className="text-lg font-semibold text-gray-400 mb-2">
            No Prediction Available
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            Go to the upload page to make a prediction first.
          </p>
          <Link
            href="/upload"
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all"
          >
            Go to Upload
          </Link>
        </div>
      </div>
    );
  }

  const shapEntries = buildShapChartData(explanation).slice(0, 15);
  const inputFeatures = Object.entries(features || {}).slice(0, 10);
  const selectedModel = model || metrics?.best_model || "xgboost";
  const modelMetrics = metrics?.models?.[selectedModel];
  const percentage = Math.round(prediction.probability * 100);
  const risk = riskLabel(prediction.probability);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Prediction Result</h1>
        <p className="text-gray-500 mt-1">
          Detailed analysis of the latest prediction.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-blue-50 mb-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-center md:text-left">
            <div
              className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-full mb-4 ${riskToneClass(
                risk
              )}`}
            >
              <FaCheckCircle />
              {risk}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {predictionLabel(prediction.prediction)}
            </h2>
            <p className="text-gray-500">
              {confidenceLabel(prediction.confidence)} &middot; Model:{" "}
              {formatModelName(selectedModel)}
            </p>
          </div>

          <div className="flex-shrink-0">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="10"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="url(#predictionGradient)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${percentage * 3.14} ${(100 - percentage) * 3.14}`}
                />
                <defs>
                  <linearGradient
                    id="predictionGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-800">
                  {percentage}%
                </span>
                <span className="text-xs text-gray-500">Probability</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Confidence score</span>
            <span className="font-semibold text-gray-800">
              {(prediction.confidence * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-1000"
              style={{ width: `${prediction.confidence * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <FaBolt className="text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Model Used</h3>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
            <p className="text-2xl font-bold">{formatModelName(selectedModel)}</p>
            <p className="text-blue-200 text-sm mt-1">
              {selectedModel === "xgboost"
                ? "Boosted tree classifier"
                : "Random forest classifier"}
            </p>
          </div>
          {modelMetrics && (
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-lg font-bold text-gray-800">
                  {(modelMetrics.accuracy * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">Accuracy</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-lg font-bold text-gray-800">
                  {(modelMetrics.recall * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">Recall</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-lg font-bold text-gray-800">
                  {(modelMetrics.f1 * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">F1 Score</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <FaChartBar className="text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">
              Input Features (Top 10)
            </h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {inputFeatures.map(([name, value]) => (
              <div
                key={name}
                className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-2.5"
              >
                <span className="text-xs font-medium text-gray-600">{name}</span>
                <span className="text-xs font-bold text-gray-800 bg-white px-2 py-0.5 rounded">
                  {value.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {shapEntries.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <FaChartBar className="text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                SHAP Explanation for This Prediction
              </h3>
              <p className="text-sm text-gray-500">
                Positive values increase Parkinson&apos;s risk; negative values
                decrease it.
              </p>
            </div>
          </div>
          <div style={{ height: shapEntries.length * 32 + 40 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={shapEntries}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 140, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 10, fontWeight: 600 }}
                  width={130}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                  }}
                  formatter={(value) => {
                    const numericValue = Number(
                      Array.isArray(value) ? value[0] : value ?? 0
                    );
                    return [
                      `${numericValue > 0 ? "+" : ""}${numericValue.toFixed(4)}`,
                      "SHAP",
                    ];
                  }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                  {shapEntries.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.value >= 0 ? "#ef4444" : "#16a34a"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
