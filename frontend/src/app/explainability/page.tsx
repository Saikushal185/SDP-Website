"use client";

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
import { FaChartBar, FaLightbulb } from "react-icons/fa";
import { usePrediction } from "@/context/PredictionContext";
import {
  buildAdvancedFeatureRows,
  buildDriverSentence,
  buildGroupedShapData,
  confidenceLabel,
  formatModelName,
  formatShapDirection,
  predictionLabel,
  riskLabel,
  riskToneClass,
} from "@/lib/prediction-utils";

export default function ExplainabilityPage() {
  const { explanation, features, model, prediction } = usePrediction();

  if (!prediction || !explanation) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-blue-50 text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaLightbulb className="text-blue-300 text-3xl" />
          </div>
          <h3 className="text-lg font-semibold text-gray-400 mb-2">
            No explanation available yet
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            Run a prediction first so the app can show which types of voice
            patterns influenced the latest result.
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

  const groupedDrivers = buildGroupedShapData(explanation);
  const advancedRows = buildAdvancedFeatureRows(explanation, features);
  const strongestIncreases = groupedDrivers.filter((item) => item.value > 0).slice(0, 3);
  const strongestDecreases = groupedDrivers.filter((item) => item.value < 0).slice(0, 3);
  const risk = riskLabel(prediction.probability);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Explainability</h1>
        <p className="text-gray-500 mt-1">
          A plain-language view of what influenced the latest model result.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <FaChartBar className="text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                What most influenced the result
              </h2>
              <p className="text-sm text-gray-500">
                Red bars pushed the model&apos;s risk score up. Green bars pulled
                it down.
              </p>
            </div>
          </div>

          <div style={{ height: groupedDrivers.length * 58 + 24 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={groupedDrivers}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11, fontWeight: 600 }}
                  width={115}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value, _, payload) => {
                    const numericValue = Number(
                      Array.isArray(value) ? value[0] : value ?? 0
                    );
                    const point = payload?.payload as
                      | { featureCount?: number }
                      | undefined;
                    return [
                      `${numericValue > 0 ? "+" : ""}${numericValue.toFixed(4)}`,
                      `${point?.featureCount ?? 0} related feature${
                        point?.featureCount === 1 ? "" : "s"
                      }`,
                    ];
                  }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={30}>
                  {groupedDrivers.map((entry) => (
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

        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Prediction summary
            </h2>
            <div
              className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-full mb-4 ${riskToneClass(
                risk
              )}`}
            >
              {risk}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {predictionLabel(prediction.prediction)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {confidenceLabel(prediction.confidence)} &middot;{" "}
              {formatModelName(model || "xgboost")}
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between bg-gray-50 rounded-lg px-4 py-2">
                <span className="text-gray-500">Probability</span>
                <span className="font-semibold text-gray-800">
                  {(prediction.probability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between bg-gray-50 rounded-lg px-4 py-2">
                <span className="text-gray-500">Confidence</span>
                <span className="font-semibold text-gray-800">
                  {(prediction.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Main reasons the score increased
            </h2>
            <div className="space-y-3">
              {strongestIncreases.map((item) => (
                <div key={item.name} className="bg-red-50 rounded-xl px-4 py-3">
                  <p className="font-semibold text-red-700">{item.name}</p>
                  <p className="text-sm text-red-600 mt-1">
                    {buildDriverSentence(item)}
                  </p>
                </div>
              ))}
              {strongestIncreases.length === 0 && (
                <p className="text-sm text-gray-500">
                  No grouped drivers pushed the score upward.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Main reasons the score decreased
            </h2>
            <div className="space-y-3">
              {strongestDecreases.map((item) => (
                <div key={item.name} className="bg-green-50 rounded-xl px-4 py-3">
                  <p className="font-semibold text-green-700">{item.name}</p>
                  <p className="text-sm text-green-600 mt-1">
                    {buildDriverSentence(item)}
                  </p>
                </div>
              ))}
              {strongestDecreases.length === 0 && (
                <p className="text-sm text-gray-500">
                  No grouped drivers pulled the score downward.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <details className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50">
        <summary className="cursor-pointer text-lg font-semibold text-gray-800">
          Advanced details
        </summary>
        <p className="text-sm text-gray-500 mt-3 mb-4">
          Raw feature-level SHAP details for the latest analyzed sample.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-sm font-semibold text-gray-600 pb-4">
                  Raw feature
                </th>
                <th className="text-left text-sm font-semibold text-gray-600 pb-4">
                  Friendly group
                </th>
                <th className="text-center text-sm font-semibold text-gray-600 pb-4">
                  Sample value
                </th>
                <th className="text-center text-sm font-semibold text-gray-600 pb-4">
                  SHAP contribution
                </th>
                <th className="text-left text-sm font-semibold text-gray-600 pb-4">
                  Direction
                </th>
              </tr>
            </thead>
            <tbody>
              {advancedRows.map((row) => (
                <tr key={row.featureName} className="border-b border-gray-50">
                  <td className="py-4 font-medium text-gray-800">{row.featureName}</td>
                  <td className="py-4 text-gray-600">{row.displayGroup}</td>
                  <td className="py-4 text-center font-semibold text-gray-800">
                    {row.featureValue === null ? "N/A" : row.featureValue.toFixed(4)}
                  </td>
                  <td
                    className={`py-4 text-center font-semibold ${
                      row.shapValue >= 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {row.shapValue >= 0 ? "+" : ""}
                    {row.shapValue.toFixed(4)}
                  </td>
                  <td className="py-4 text-sm text-gray-600">
                    {formatShapDirection(row.shapValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
        These explanations describe what influenced the model&apos;s score for
        this sample. They do not identify a medical cause or replace a clinical
        diagnosis.
      </div>
    </div>
  );
}
