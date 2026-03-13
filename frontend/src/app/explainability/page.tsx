"use client";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { FaLightbulb, FaChartBar } from "react-icons/fa";
import { fetchExplainability, type ExplainabilityData } from "@/lib/api";

export default function ExplainabilityPage() {
  const [data, setData] = useState<ExplainabilityData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchExplainability()
      .then(setData)
      .catch((e) => setError(e.message));
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
        Loading explainability data...
      </div>
    );
  }

  // Top 15 features for charts
  const topImportance = data.feature_importance.slice(0, 15);
  const topShap = data.global_shap_values.slice(0, 15);

  // Generate gradient colors for importance
  const importanceColors = topImportance.map((_, i) => {
    const ratio = i / topImportance.length;
    const r = Math.round(37 + ratio * 110);
    const g = Math.round(99 + ratio * 100);
    const b = Math.round(235 - ratio * 30);
    return `rgb(${r},${g},${b})`;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Explainability</h1>
        <p className="text-gray-500 mt-1">
          Understand why the model made its prediction using SHAP and feature
          importance
        </p>
      </div>

      {/* Feature Importance */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <FaChartBar className="text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Feature Importance (Random Forest)
            </h2>
            <p className="text-sm text-gray-500">
              How much each feature contributes to feature selection
            </p>
          </div>
        </div>
        <div style={{ height: topImportance.length * 36 + 40 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topImportance}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 140, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 11, fontWeight: 600 }}
                width={130}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                }}
                formatter={(value: number) => [
                  value.toFixed(4),
                  "Importance",
                ]}
              />
              <Bar dataKey="importance" radius={[0, 8, 8, 0]} barSize={24}>
                {topImportance.map((_, index) => (
                  <Cell key={index} fill={importanceColors[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SHAP Values */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <FaLightbulb className="text-yellow-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              SHAP Explanation (XGBoost)
            </h2>
            <p className="text-sm text-gray-500">
              Mean absolute SHAP value — average feature contribution to
              predictions
            </p>
          </div>
        </div>
        <div style={{ height: topShap.length * 36 + 40 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topShap}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 140, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 11, fontWeight: 600 }}
                width={130}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                }}
                formatter={(value: number) => [
                  value.toFixed(4),
                  "Mean |SHAP|",
                ]}
              />
              <Bar
                dataKey="mean_abs_shap"
                name="Mean |SHAP|"
                radius={[0, 8, 8, 0]}
                barSize={24}
              >
                {topShap.map((_, index) => (
                  <Cell
                    key={index}
                    fill={index < 5 ? "#ef4444" : index < 10 ? "#f59e0b" : "#3b82f6"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Feature Explanation Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topShap.slice(0, 6).map((item, idx) => (
          <div
            key={item.name}
            className="bg-white rounded-xl p-5 shadow-sm border border-blue-50"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-800">{item.name}</span>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  idx < 3
                    ? "bg-red-50 text-red-600"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                {idx < 3 ? "Top Risk Factor" : "Contributing Factor"}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              This feature has a mean SHAP contribution of{" "}
              {item.mean_abs_shap.toFixed(4)} to the model&apos;s predictions
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    idx < 3 ? "bg-red-400" : "bg-blue-400"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (item.mean_abs_shap / topShap[0].mean_abs_shap) * 100
                    )}%`,
                  }}
                />
              </div>
              <span className="text-xs font-bold text-gray-600">
                {item.mean_abs_shap.toFixed(4)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
