"use client";
import {
  FaDatabase,
  FaCogs,
  FaBrain,
  FaChartBar,
  FaLightbulb,
  FaDesktop,
  FaArrowDown,
} from "react-icons/fa";

const pipelineSteps = [
  {
    icon: FaDatabase,
    title: "Speech Dataset",
    description: "PD Speech Features dataset with 756 samples and multiple acoustic features",
    color: "from-blue-400 to-blue-500",
  },
  {
    icon: FaChartBar,
    title: "Feature Extraction",
    description: "Extract key speech features: PPE, DFA, RPDE, Jitter, Shimmer",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: FaCogs,
    title: "Machine Learning Models",
    description: "Train Logistic Regression, SVM, and XGBoost classifiers",
    color: "from-blue-600 to-blue-700",
  },
  {
    icon: FaBrain,
    title: "Prediction",
    description: "Generate predictions for Parkinson's Disease detection",
    color: "from-blue-700 to-indigo-600",
  },
  {
    icon: FaLightbulb,
    title: "Explainable AI (SHAP)",
    description: "Explain model predictions using SHAP values and feature importance",
    color: "from-indigo-500 to-indigo-600",
  },
  {
    icon: FaDesktop,
    title: "Web Dashboard",
    description: "Interactive dashboard for visualization and interpretation",
    color: "from-indigo-600 to-purple-600",
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">About the Project</h1>
        <p className="text-gray-500 mt-1">
          Explainable AI for Parkinson&apos;s Disease Detection using Speech Features
        </p>
      </div>

      {/* Project Description */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-blue-50 mb-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Project Overview
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          This research project focuses on detecting Parkinson&apos;s Disease
          using speech feature analysis combined with machine learning models.
          The system not only provides accurate predictions but also explains
          the reasoning behind each prediction using Explainable AI techniques.
        </p>
        <p className="text-gray-600 leading-relaxed">
          By leveraging SHAP (SHapley Additive exPlanations), we provide
          transparent and interpretable results that help medical professionals
          understand which speech features contribute most to the diagnosis,
          making the AI system trustworthy and clinically actionable.
        </p>
      </div>

      {/* Pipeline Diagram */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-blue-50">
        <h2 className="text-xl font-bold text-gray-800 mb-8 text-center">
          Project Pipeline
        </h2>
        <div className="max-w-lg mx-auto">
          {pipelineSteps.map((step, index) => (
            <div key={step.title}>
              {/* Step */}
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}
                >
                  <step.icon className="text-white text-xl" />
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800">{step.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Arrow connector */}
              {index < pipelineSteps.length - 1 && (
                <div className="flex items-center justify-start ml-6 my-2">
                  <div className="w-0.5 h-6 bg-blue-200" />
                  <FaArrowDown className="text-blue-300 text-sm -ml-[7px] mt-1" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="grid md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50 text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <FaDesktop className="text-blue-500 text-xl" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">Frontend</h3>
          <p className="text-sm text-gray-500">Next.js, TailwindCSS, Recharts</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50 text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <FaCogs className="text-blue-500 text-xl" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">Backend</h3>
          <p className="text-sm text-gray-500">Python Flask API</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50 text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <FaLightbulb className="text-yellow-500 text-xl" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">Explainability</h3>
          <p className="text-sm text-gray-500">SHAP, Feature Importance</p>
        </div>
      </div>
    </div>
  );
}
