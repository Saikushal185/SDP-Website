"use client";

import { useEffect, useState } from "react";
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
import { FaChartBar, FaShieldAlt, FaTrophy } from "react-icons/fa";
import { fetchMetrics, type MetricsData } from "@/lib/api";
import {
  buildPlainLanguageMetricCards,
  formatModelName,
  getMetricCopy,
} from "@/lib/prediction-utils";

const metricKeys = ["accuracy", "recall", "precision"] as const;
const chartColors = ["#2563eb", "#16a34a", "#f59e0b"];

export default function PerformancePage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMetrics().then(setData).catch((fetchError) => {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load performance metrics."
      );
    });
  }, []);

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="bg-red-50 text-red-600 rounded-xl p-6 text-center">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 text-center text-gray-400">
        Loading performance data...
      </div>
    );
  }

  const modelKeys = Object.keys(data.models);
  const bestModelKey = data.best_model;
  const bestModelMetrics = data.models[bestModelKey];
  const bestModelCards = bestModelMetrics
    ? buildPlainLanguageMetricCards(bestModelMetrics)
    : [];

  const metricCopy = getMetricCopy();
  const comparisonData = metricKeys.map((metricKey) => {
    const row: Record<string, string | number> = {
      label: metricCopy[metricKey].label,
    };

    modelKeys.forEach((modelKey) => {
      row[modelKey] = +(data.models[modelKey][metricKey] * 100).toFixed(1);
    });

    return row;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Model Performance</h1>
        <p className="text-gray-500 mt-1">
          A simpler view of how well the model performed on the study data.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
            <FaTrophy className="text-blue-500 text-lg" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-600 mb-1">
              Best model for this study
            </p>
            <h2 className="text-2xl font-bold text-gray-900">
              {formatModelName(bestModelKey)}
            </h2>
            <p className="text-gray-500 mt-2 max-w-2xl">
              This was the strongest overall model in the saved evaluation
              results, so the app treats it as the default benchmark when
              comparing performance.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {bestModelCards.map((card, index) => (
            <div
              key={card.key}
              className="rounded-2xl border border-gray-100 bg-gray-50 p-5"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{
                  backgroundColor: `${chartColors[index]}14`,
                  color: chartColors[index],
                }}
              >
                <FaShieldAlt />
              </div>
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {(card.value * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500 mt-3">{card.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <FaChartBar className="text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Simple model comparison
            </h2>
            <p className="text-sm text-gray-500">
              These three measures are the easiest way to compare how the models
              performed.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {metricKeys.map((metricKey) => (
            <div
              key={metricKey}
              className="rounded-2xl border border-gray-100 bg-white p-4"
            >
              <p className="font-semibold text-gray-800">
                {metricCopy[metricKey].label}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {metricCopy[metricKey].description}
              </p>
            </div>
          ))}
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={comparisonData}
              margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                label={{
                  value: "Score (%)",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 12,
                }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
                formatter={(value, name) => [
                  `${Number(value).toFixed(1)}%`,
                  formatModelName(String(name)),
                ]}
              />
              {modelKeys.map((modelKey, index) => (
                <Bar
                  key={modelKey}
                  dataKey={modelKey}
                  name={formatModelName(modelKey)}
                  radius={[8, 8, 0, 0]}
                  fill={chartColors[index % chartColors.length]}
                >
                  {comparisonData.map((entry) => (
                    <Cell
                      key={`${modelKey}-${String(entry.label)}`}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <details className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50">
        <summary className="cursor-pointer text-lg font-semibold text-gray-800">
          Advanced details
        </summary>
        <p className="text-sm text-gray-500 mt-3 mb-4">
          These are the original technical evaluation metrics used in the saved
          study results.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-sm font-semibold text-gray-600 pb-4">
                  Model
                </th>
                <th className="text-center text-sm font-semibold text-gray-600 pb-4">
                  Accuracy
                </th>
                <th className="text-center text-sm font-semibold text-gray-600 pb-4">
                  Precision
                </th>
                <th className="text-center text-sm font-semibold text-gray-600 pb-4">
                  Recall
                </th>
                <th className="text-center text-sm font-semibold text-gray-600 pb-4">
                  F1 Score
                </th>
                <th className="text-center text-sm font-semibold text-gray-600 pb-4">
                  AUC
                </th>
              </tr>
            </thead>
            <tbody>
              {modelKeys.map((modelKey) => {
                const metrics = data.models[modelKey];
                const isBest = modelKey === bestModelKey;
                return (
                  <tr
                    key={modelKey}
                    className={`border-b border-gray-50 ${
                      isBest ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-800">
                          {formatModelName(modelKey)}
                        </span>
                        {isBest && (
                          <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            Best
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-center py-4 font-semibold text-gray-800">
                      {(metrics.accuracy * 100).toFixed(1)}%
                    </td>
                    <td className="text-center py-4 font-semibold text-gray-800">
                      {(metrics.precision * 100).toFixed(1)}%
                    </td>
                    <td className="text-center py-4 font-semibold text-gray-800">
                      {(metrics.recall * 100).toFixed(1)}%
                    </td>
                    <td className="text-center py-4 font-semibold text-gray-800">
                      {(metrics.f1 * 100).toFixed(1)}%
                    </td>
                    <td className="text-center py-4 font-semibold text-gray-800">
                      {metrics.auc.toFixed(3)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
