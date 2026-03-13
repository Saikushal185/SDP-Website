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
  LineChart,
  Line,
  Legend,
  Cell,
} from "recharts";
import { FaTrophy, FaChartLine } from "react-icons/fa";
import { fetchPerformance, type PerformanceData } from "@/lib/api";

export default function PerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPerformance()
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
        Loading performance data...
      </div>
    );
  }

  const modelNames = Object.keys(data.models);
  const barColors = ["#2563eb", "#60a5fa", "#93c5fd"];

  const accuracyData = modelNames.map((name) => ({
    name,
    Accuracy: +(data.models[name].accuracy.mean * 100).toFixed(1),
  }));

  // Build ROC chart data
  const rocPoints: Record<string, number>[] = [];
  const refModel = modelNames[0];
  const fprArr = data.roc_data[refModel]?.fpr || [];

  for (let i = 0; i < fprArr.length; i++) {
    const point: Record<string, number> = {
      fpr: +fprArr[i].toFixed(3),
    };
    for (const name of modelNames) {
      const tprArr = data.roc_data[name]?.tpr || [];
      point[name] = tprArr[i] !== undefined ? +tprArr[i].toFixed(3) : 0;
    }
    rocPoints.push(point);
  }

  // Table rows
  const tableRows = modelNames.map((name) => {
    const m = data.models[name];
    return {
      model: name,
      accuracy: m.accuracy,
      recall: m.recall,
      f1: m.f1,
      auc: m.roc_auc,
      isBest: name === data.best_model,
    };
  });

  const lineColors = ["#2563eb", "#60a5fa", "#93c5fd"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Model Performance</h1>
        <p className="text-gray-500 mt-1">
          Real cross-validation results from 5-fold stratified CV
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Accuracy Bar Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <FaTrophy className="text-blue-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">
              Model Accuracy Comparison
            </h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={accuracyData}
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[70, 95]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                  }}
                  formatter={(value: number) => [`${value}%`, "Accuracy"]}
                />
                <Bar dataKey="Accuracy" radius={[8, 8, 0, 0]} barSize={50}>
                  {accuracyData.map((_, index) => (
                    <Cell key={index} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROC Curve */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <FaChartLine className="text-blue-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">ROC Curve</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={rocPoints}
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="fpr"
                  label={{
                    value: "False Positive Rate",
                    position: "insideBottom",
                    offset: -2,
                    fontSize: 12,
                  }}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  label={{
                    value: "True Positive Rate",
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 12,
                  }}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Legend />
                {modelNames.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={lineColors[i % lineColors.length]}
                    strokeWidth={name === data.best_model ? 2.5 : 2}
                    dot={false}
                  />
                ))}
                {/* Diagonal reference */}
                <Line
                  type="monotone"
                  dataKey="fpr"
                  name="Random"
                  stroke="#cbd5e1"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Model Comparison Table */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50">
        <h2 className="text-lg font-semibold text-gray-800 mb-6">
          Model Comparison (5-Fold Cross-Validation)
        </h2>
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
              {tableRows.map((row) => (
                <tr
                  key={row.model}
                  className={`border-b border-gray-50 ${
                    row.isBest ? "bg-blue-50/50" : ""
                  }`}
                >
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-800">
                        {row.model}
                      </span>
                      {row.isBest && (
                        <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          Best
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-center py-4">
                    <span className="font-semibold text-gray-800">
                      {(row.accuracy.mean * 100).toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-400 ml-1">
                      ±{(row.accuracy.std * 100).toFixed(1)}
                    </span>
                  </td>
                  <td className="text-center py-4">
                    <span className="font-semibold text-gray-800">
                      {(row.recall.mean * 100).toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-400 ml-1">
                      ±{(row.recall.std * 100).toFixed(1)}
                    </span>
                  </td>
                  <td className="text-center py-4">
                    <span className="font-semibold text-gray-800">
                      {(row.f1.mean * 100).toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-400 ml-1">
                      ±{(row.f1.std * 100).toFixed(1)}
                    </span>
                  </td>
                  <td className="text-center py-4">
                    <span className="font-semibold text-gray-800">
                      {row.auc.mean.toFixed(3)}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">
                      ±{row.auc.std.toFixed(3)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
