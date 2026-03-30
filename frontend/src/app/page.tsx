"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FaArrowRight,
  FaBrain,
  FaChartLine,
  FaCircle,
  FaClipboardCheck,
  FaFlask,
  FaMicroscope,
  FaWaveSquare,
} from "react-icons/fa";
import {
  fetchMetrics,
  fetchModelInfo,
  type MetricsData,
  type ModelInfo,
} from "@/lib/api";
import { formatModelName } from "@/lib/prediction-utils";
import {
  LinkButton,
  MetricCard,
  Panel,
  SectionHeading,
  SiteContainer,
  StatusPill,
} from "@/components/site/ui";

const workflowSteps = [
  {
    title: "Capture a voice sample profile",
    description:
      "Use structured CSV input or the manual analysis workspace to submit acoustic measurements.",
  },
  {
    title: "Run the strongest saved model",
    description:
      "Compare support for XGBoost and Random Forest without changing the backend contract.",
  },
  {
    title: "Inspect explainable evidence",
    description:
      "Review grouped SHAP drivers, plain-language explanations, and model performance context.",
  },
];

const researchHighlights = [
  "A faculty-ready narrative that connects dataset quality, model choice, and interpretability.",
  "An analysis workflow built to show both plain-language summaries and technical depth.",
  "A restrained interface that foregrounds evidence instead of decorative UI noise.",
];

const featureGroups = [
  { label: "Voice instability", width: "82%" },
  { label: "Frequency pattern shifts", width: "68%" },
  { label: "Energy variation", width: "56%" },
  { label: "Wave-pattern complexity", width: "43%" },
];

export default function Home() {
  const [info, setInfo] = useState<ModelInfo | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  useEffect(() => {
    fetchModelInfo().then(setInfo).catch(console.error);
    fetchMetrics().then(setMetrics).catch(console.error);
  }, []);

  const bestModelKey = info?.best_model || metrics?.best_model || "xgboost";
  const bestModelMetrics = metrics?.models?.[bestModelKey];
  const supportMetrics = [
    {
      label: "Dataset",
      value: info ? `${info.dataset_size}` : "756",
      description:
        "Voice-derived study samples available to the deployed interface.",
    },
    {
      label: "Feature set",
      value: info ? `${info.n_selected_features}` : "22",
      description:
        "Selected acoustic indicators surfaced through the upload workspace.",
    },
    {
      label: "Best accuracy",
      value: info ? `${(info.best_accuracy * 100).toFixed(1)}%` : "94.0%",
      description: `Current headline benchmark from ${formatModelName(
        bestModelKey
      )}.`,
    },
  ];

  return (
    <div className="pb-20">
      <section className="relative overflow-hidden border-b border-[var(--border-subtle)] bg-[linear-gradient(145deg,#18373d_0%,#10292f_58%,#0d2126_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(219,194,151,0.14),transparent_24%),radial-gradient(circle_at_20%_18%,rgba(119,154,160,0.18),transparent_28%)]" />
        <SiteContainer className="relative grid min-h-[calc(100svh-78px)] gap-16 py-14 lg:grid-cols-[1.08fr_0.92fr] lg:items-end lg:py-20">
          <div className="hero-reveal max-w-3xl">
            <StatusPill tone="accent" className="mb-7">
              <FaBrain className="text-xs" />
              Explainable AI research showcase
            </StatusPill>
            <h1 className="display-title">
              Parkinson&apos;s voice screening, presented with evidence instead
              of hype.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-[rgba(248,245,239,0.76)] sm:text-xl">
              This platform turns acoustic voice features into a clear research
              workflow: upload inputs, compare saved models, inspect prediction
              confidence, and surface the grouped SHAP drivers behind each
              result.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <LinkButton
                href="/upload"
                className="!bg-[#f8f5ef] !text-[var(--accent-strong)]"
              >
                Run the analysis workspace
              </LinkButton>
              <LinkButton
                href="/about"
                variant="ghost"
                className="!border-[rgba(248,245,239,0.18)] !text-[#f8f5ef]"
              >
                Review methodology
              </LinkButton>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-[rgba(248,245,239,0.78)]">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[rgba(248,245,239,0.44)]">
                  Audience
                </p>
                <p className="mt-2 font-medium">
                  Faculty, judges, and research reviewers
                </p>
              </div>
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[rgba(248,245,239,0.44)]">
                  Focus
                </p>
                <p className="mt-2 font-medium">
                  Prediction, interpretability, and model credibility
                </p>
              </div>
            </div>
          </div>

          <div className="hero-reveal flex items-center justify-end [animation-delay:140ms]">
            <Panel tone="strong" className="hero-drift w-full max-w-xl overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[rgba(248,245,239,0.46)]">
                    Live study snapshot
                  </p>
                  <h2 className="mt-3 font-display text-4xl text-[#f8f5ef]">
                    {formatModelName(bestModelKey)}
                  </h2>
                </div>
                <StatusPill tone="accent">Reviewer-ready output</StatusPill>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-[rgba(248,245,239,0.1)] bg-[rgba(248,245,239,0.06)] p-5">
                  <p className="text-[0.72rem] uppercase tracking-[0.2em] text-[rgba(248,245,239,0.44)]">
                    Best accuracy
                  </p>
                  <p className="mt-3 font-display text-5xl">
                    {info ? `${(info.best_accuracy * 100).toFixed(1)}%` : "Loading"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-[rgba(248,245,239,0.1)] bg-[rgba(248,245,239,0.06)] p-5">
                  <p className="text-[0.72rem] uppercase tracking-[0.2em] text-[rgba(248,245,239,0.44)]">
                    Study features
                  </p>
                  <p className="mt-3 font-display text-5xl">
                    {info ? info.n_selected_features : "..."}
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                {workflowSteps.map((step, index) => (
                  <div key={step.title} className="flex gap-4">
                    <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(248,245,239,0.14)] bg-[rgba(248,245,239,0.08)] text-xs font-semibold text-[#f8f5ef]">
                      {index + 1}
                    </div>
                    <div className="flex-1 border-b border-[rgba(248,245,239,0.08)] pb-4 last:border-b-0 last:pb-0">
                      <p className="font-semibold text-[#f8f5ef]">{step.title}</p>
                      <p className="mt-1 text-sm leading-7 text-[rgba(248,245,239,0.68)]">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {bestModelMetrics ? (
                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-[0.18em] text-[rgba(248,245,239,0.44)]">
                      Recall
                    </p>
                    <p className="mt-2 text-xl font-semibold text-[#f8f5ef]">
                      {(bestModelMetrics.recall * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-[0.18em] text-[rgba(248,245,239,0.44)]">
                      Precision
                    </p>
                    <p className="mt-2 text-xl font-semibold text-[#f8f5ef]">
                      {(bestModelMetrics.precision * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-[0.18em] text-[rgba(248,245,239,0.44)]">
                      AUC
                    </p>
                    <p className="mt-2 text-xl font-semibold text-[#f8f5ef]">
                      {bestModelMetrics.auc.toFixed(3)}
                    </p>
                  </div>
                </div>
              ) : null}
            </Panel>
          </div>
        </SiteContainer>
      </section>

      <SiteContainer className="space-y-20 pt-16">
        <section>
          <SectionHeading
            eyebrow="Study posture"
            title="A sharper first impression without changing the research workflow."
            description="The redesign keeps the deployed app architecture intact while reframing the interface around trust, readability, and evidence-led presentation."
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {supportMetrics.map((metric, index) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                description={metric.description}
                accent={index === 2 ? "accent" : "default"}
              />
            ))}
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Workflow"
              title="The platform now reads like a guided review instead of a disconnected set of demos."
              description="Each route supports one part of the story: capture inputs, inspect the result, explain the model, and compare saved evaluation benchmarks."
            />
            <div className="mt-7 space-y-4">
              {researchHighlights.map((item) => (
                <div key={item} className="flex gap-3">
                  <FaCircle className="mt-2 text-[10px] text-[var(--accent-strong)]" />
                  <p className="text-sm leading-7 text-[var(--text-muted)]">
                    {item}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link
                href="/performance"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]"
              >
                Review performance benchmarks
                <FaArrowRight className="text-xs" />
              </Link>
            </div>
          </div>

          <Panel className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] border border-[var(--border-subtle)] bg-white/40 p-5">
              <FaFlask className="text-2xl text-[var(--accent-strong)]" />
              <h3 className="mt-5 text-lg font-semibold text-[var(--text-strong)]">
                Analysis workspace
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
                Upload a CSV or enter feature values manually without leaving the
                review flow.
              </p>
            </div>
            <div className="rounded-[24px] border border-[var(--border-subtle)] bg-white/40 p-5">
              <FaClipboardCheck className="text-2xl text-[var(--accent-strong)]" />
              <h3 className="mt-5 text-lg font-semibold text-[var(--text-strong)]">
                Clear result framing
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
                Probability, confidence, model context, and next-step links are
                grouped for fast review.
              </p>
            </div>
            <div className="rounded-[24px] border border-[var(--border-subtle)] bg-white/40 p-5">
              <FaMicroscope className="text-2xl text-[var(--accent-strong)]" />
              <h3 className="mt-5 text-lg font-semibold text-[var(--text-strong)]">
                Evidence trail
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
                Explainability and performance routes turn the prediction into a
                defensible research narrative.
              </p>
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Panel>
            <SectionHeading
              eyebrow="Explainability"
              title="Grouped SHAP outputs keep the science visible."
              description="Instead of hiding the model behind a single percentage, the platform surfaces which families of signal changes drove the score."
            />
            <div className="mt-8 space-y-4">
              {featureGroups.map((group) => (
                <div key={group.label}>
                  <div className="mb-2 flex items-center justify-between text-sm text-[var(--text-muted)]">
                    <span>{group.label}</span>
                    <span>{group.width}</span>
                  </div>
                  <div className="h-3 rounded-full bg-[rgba(17,33,38,0.08)]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent)_0%,var(--accent-strong)_100%)]"
                      style={{ width: group.width }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel tone="muted">
            <SectionHeading
              eyebrow="Performance framing"
              title="Model benchmarks stay readable for non-technical reviewers."
              description="Plain-language metric summaries coexist with the original technical tables so judges can scan first and dive deeper second."
            />
            <div className="mt-8 space-y-4">
              <div className="data-row">
                <div className="flex items-center gap-3">
                  <FaChartLine className="text-[var(--accent-strong)]" />
                  <span className="text-sm text-[var(--text-muted)]">
                    Headline model benchmark
                  </span>
                </div>
                <span className="font-semibold text-[var(--text-strong)]">
                  {formatModelName(bestModelKey)}
                </span>
              </div>
              <div className="data-row">
                <div className="flex items-center gap-3">
                  <FaWaveSquare className="text-[var(--accent-strong)]" />
                  <span className="text-sm text-[var(--text-muted)]">
                    Explainability route
                  </span>
                </div>
                <span className="font-semibold text-[var(--text-strong)]">
                  Grouped drivers + raw SHAP
                </span>
              </div>
              <div className="data-row">
                <div className="flex items-center gap-3">
                  <FaBrain className="text-[var(--accent-strong)]" />
                  <span className="text-sm text-[var(--text-muted)]">
                    Review stance
                  </span>
                </div>
                <span className="font-semibold text-[var(--text-strong)]">
                  Decision-support, not diagnosis
                </span>
              </div>
            </div>
          </Panel>
        </section>

        <section className="rounded-[32px] border border-[var(--border-subtle)] bg-[rgba(248,245,239,0.78)] px-6 py-10 shadow-[var(--shadow-soft)] sm:px-10">
          <SectionHeading
            eyebrow="Next step"
            title="Open the analysis workspace and evaluate the full prediction-to-explanation flow."
            description="The visual redesign is meant to support the live demo, so the strongest proof is the complete path from feature input to interpreted result."
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/upload">Start with upload</LinkButton>
            <LinkButton href="/prediction" variant="secondary">
              See result layout
            </LinkButton>
          </div>
        </section>
      </SiteContainer>
    </div>
  );
}
