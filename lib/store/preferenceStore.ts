"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PreferenceState {
  glucoseUnit: "mg/dL" | "mmol/L";
  cholesterolUnit: "mg/dL" | "mmol/L";
  setGlucoseUnit: (unit: "mg/dL" | "mmol/L") => void;
  setCholesterolUnit: (unit: "mg/dL" | "mmol/L") => void;
}

export const usePreferenceStore = create<PreferenceState>()(
  persist(
    (set) => ({
      glucoseUnit: "mg/dL",
      cholesterolUnit: "mg/dL",
      setGlucoseUnit: (glucoseUnit) => set({ glucoseUnit }),
      setCholesterolUnit: (cholesterolUnit) => set({ cholesterolUnit }),
    }),
    {
      name: "healthtrack_preferences",
    }
  )
);
