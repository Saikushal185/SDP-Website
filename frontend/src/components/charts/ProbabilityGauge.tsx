"use client";

interface ProbabilityGaugeProps {
  probability: number;
}

export default function ProbabilityGauge({ probability }: ProbabilityGaugeProps) {
  const percentage = Math.round(probability * 100);
  const angle = probability * 180;
  const riskLevel = probability >= 0.7 ? "High" : probability >= 0.4 ? "Medium" : "Low";
  const riskColor =
    probability >= 0.7
      ? "text-red-500"
      : probability >= 0.4
      ? "text-yellow-500"
      : "text-green-500";

  const strokeColor =
    probability >= 0.7 ? "#ef4444" : probability >= 0.4 ? "#eab308" : "#22c55e";

  // SVG arc for semicircle gauge
  const radius = 80;
  const circumference = Math.PI * radius;
  const dashOffset = circumference - (probability * circumference);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-52 h-28 overflow-hidden">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={strokeColor}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={dashOffset}
            style={{
              transition: "stroke-dashoffset 1s ease-out",
            }}
          />
          {/* Needle */}
          <line
            x1="100"
            y1="100"
            x2={100 + 60 * Math.cos(Math.PI - (angle * Math.PI) / 180)}
            y2={100 - 60 * Math.sin((angle * Math.PI) / 180)}
            stroke="#1e3a5f"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="100" cy="100" r="5" fill="#1e3a5f" />
        </svg>
      </div>
      <div className="text-center mt-2">
        <p className="text-2xl font-bold text-gray-800">{percentage}%</p>
        <p className={`text-sm font-semibold ${riskColor}`}>
          Risk Level: {riskLevel}
        </p>
      </div>
    </div>
  );
}
