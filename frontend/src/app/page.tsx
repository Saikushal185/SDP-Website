"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FaDatabase,
  FaCogs,
  FaBullseye,
  FaBrain,
  FaLaptopMedical,
  FaSearch,
} from "react-icons/fa";
import { fetchModelInfo, type ModelInfo } from "@/lib/api";
import { formatModelName } from "@/lib/prediction-utils";

export default function Home() {
  const [info, setInfo] = useState<ModelInfo | null>(null);

  useEffect(() => {
    fetchModelInfo().then(setInfo).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
                <FaBrain className="text-xs" />
                AI-Powered Healthcare
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
                Parkinson&apos;s Disease Prediction with{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">
                  Explainable AI
                </span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Using machine learning to detect Parkinson&apos;s disease from
                speech features with transparent and interpretable results.
              </p>
              <div className="flex gap-4">
                <Link
                  href="/upload"
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300"
                >
                  Start Prediction
                </Link>
                <Link
                  href="/about"
                  className="border-2 border-blue-200 text-blue-600 px-8 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-200"
                >
                  Learn More
                </Link>
              </div>
            </div>

            {/* Right - Illustration */}
            <div className="flex justify-center">
              <div className="relative w-80 h-80 lg:w-96 lg:h-96">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-blue-400 rounded-full opacity-20 blur-3xl" />
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className="relative">
                    <div className="w-48 h-32 bg-gradient-to-b from-gray-700 to-gray-800 rounded-t-xl flex items-center justify-center mx-auto">
                      <div className="w-40 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                        <FaBrain className="text-white text-4xl animate-pulse" />
                      </div>
                    </div>
                    <div className="w-56 h-3 bg-gray-600 rounded-b-lg mx-auto" />
                    <div className="w-64 h-1.5 bg-gray-400 rounded-b-lg mx-auto" />
                    <div className="absolute -top-8 -right-12 w-14 h-14 bg-white rounded-xl shadow-lg flex items-center justify-center animate-bounce">
                      <FaSearch className="text-blue-500 text-xl" />
                    </div>
                    <div
                      className="absolute -top-4 -left-16 w-14 h-14 bg-white rounded-xl shadow-lg flex items-center justify-center animate-bounce"
                      style={{ animationDelay: "0.5s" }}
                    >
                      <FaLaptopMedical className="text-blue-500 text-xl" />
                    </div>
                    <div className="absolute -bottom-6 -right-8 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white text-xs font-bold">AI</span>
                    </div>
                    <div className="absolute -top-12 left-1/2 w-3 h-3 bg-blue-400 rounded-full opacity-60" />
                    <div className="absolute top-1/2 -right-20 w-2 h-2 bg-blue-300 rounded-full opacity-50" />
                    <div className="absolute top-1/2 -left-20 w-2.5 h-2.5 bg-blue-500 rounded-full opacity-40" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Info Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 -mt-4">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-blue-50">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
              <FaDatabase className="text-blue-500 text-xl" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Dataset</h3>
            <p className="text-gray-500 text-sm">PD Speech Features Dataset</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-blue-600 font-medium">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              {info ? `${info.dataset_size} samples` : "Loading..."}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-blue-50">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
              <FaCogs className="text-blue-500 text-xl" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Models</h3>
            <div className="space-y-1.5">
              {(info?.models || ["xgboost", "random_forest"]).map((m, i) => (
                <p
                  key={m}
                  className="text-gray-500 text-sm flex items-center gap-2"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      i === 0 ? "bg-blue-600" : "bg-blue-400"
                    }`}
                  />
                  {formatModelName(m)}
                </p>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 text-white">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
              <FaBullseye className="text-white text-xl" />
            </div>
            <h3 className="text-lg font-bold mb-2">Best Accuracy</h3>
            <p className="text-4xl font-bold">
              {info
                ? `${(info.best_accuracy * 100).toFixed(1)}%`
                : "Loading..."}
            </p>
            <p className="text-blue-200 text-sm mt-1">
              {formatModelName(info?.best_model || "xgboost")} Model
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
