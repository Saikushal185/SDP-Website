"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import type { PredictionResult } from "@/lib/api";

interface PredictionContextType {
  lastPrediction: PredictionResult | null;
  setLastPrediction: (p: PredictionResult | null) => void;
}

const PredictionContext = createContext<PredictionContextType>({
  lastPrediction: null,
  setLastPrediction: () => {},
});

export function PredictionProvider({ children }: { children: ReactNode }) {
  const [lastPrediction, setLastPrediction] =
    useState<PredictionResult | null>(null);

  return (
    <PredictionContext.Provider value={{ lastPrediction, setLastPrediction }}>
      {children}
    </PredictionContext.Provider>
  );
}

export function usePrediction() {
  return useContext(PredictionContext);
}
