"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppLanguage } from "@/lib/i18n/translations";

export interface UserProfile {
  fullName: string;
  age: string;
  sex: "" | "Male" | "Female" | "Other";
  bloodGroup: string;
  heightCm: string;
  weightKg: string;
  conditions: string;
  avatarDataUrl: string;
}

export const EMPTY_USER_PROFILE: UserProfile = {
  fullName: "",
  age: "",
  sex: "",
  bloodGroup: "",
  heightCm: "",
  weightKg: "",
  conditions: "",
  avatarDataUrl: "",
};

export interface PreferenceState {
  glucoseUnit: "mg/dL" | "mmol/L";
  cholesterolUnit: "mg/dL" | "mmol/L";
  language: AppLanguage;
  activeProfileOwner: string;
  profilesByOwner: Record<string, UserProfile>;
  profile: UserProfile;
  setGlucoseUnit: (unit: "mg/dL" | "mmol/L") => void;
  setCholesterolUnit: (unit: "mg/dL" | "mmol/L") => void;
  setLanguage: (language: AppLanguage) => void;
  setProfileOwner: (ownerId: string) => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
  mergeExtractedProfile: (extracted: Partial<UserProfile>) => void;
  resetProfileAvatar: () => void;
  clearActiveProfile: () => void;
}

export const usePreferenceStore = create<PreferenceState>()(
  persist(
    (set) => ({
      glucoseUnit: "mg/dL",
      cholesterolUnit: "mg/dL",
      language: "en",
      activeProfileOwner: "guest",
      profilesByOwner: {},
      profile: { ...EMPTY_USER_PROFILE },
      setGlucoseUnit: (glucoseUnit) => set({ glucoseUnit }),
      setCholesterolUnit: (cholesterolUnit) => set({ cholesterolUnit }),
      setLanguage: (language) => set({ language }),
      setProfileOwner: (ownerId) =>
        set((state) => {
          const nextOwner = ownerId || "guest";
          if (state.activeProfileOwner === nextOwner) {
            return state;
          }
          const updatedMap: Record<string, UserProfile> = {
            ...state.profilesByOwner,
            [state.activeProfileOwner]: state.profile,
          };
          const nextProfile = updatedMap[nextOwner]
            ? { ...EMPTY_USER_PROFILE, ...updatedMap[nextOwner] }
            : { ...EMPTY_USER_PROFILE };
          return {
            activeProfileOwner: nextOwner,
            profilesByOwner: updatedMap,
            profile: nextProfile,
          };
        }),
      updateProfile: (partial) =>
        set((state) => {
          const updated = { ...state.profile, ...partial };
          return {
            profile: updated,
            profilesByOwner: {
              ...state.profilesByOwner,
              [state.activeProfileOwner]: updated,
            },
          };
        }),
      mergeExtractedProfile: (extracted) =>
        set((state) => {
          const next = { ...state.profile };
          if (!next.fullName && extracted.fullName) next.fullName = extracted.fullName;
          if (!next.age && extracted.age) next.age = extracted.age;
          if (!next.sex && extracted.sex) next.sex = extracted.sex;
          return {
            profile: next,
            profilesByOwner: {
              ...state.profilesByOwner,
              [state.activeProfileOwner]: next,
            },
          };
        }),
      resetProfileAvatar: () =>
        set((state) => {
          const updated = { ...state.profile, avatarDataUrl: "" };
          return {
            profile: updated,
            profilesByOwner: {
              ...state.profilesByOwner,
              [state.activeProfileOwner]: updated,
            },
          };
        }),
      clearActiveProfile: () =>
        set((state) => {
          const cleared = { ...EMPTY_USER_PROFILE };
          return {
            profile: cleared,
            profilesByOwner: {
              ...state.profilesByOwner,
              [state.activeProfileOwner]: cleared,
            },
          };
        }),
    }),
    {
      name: "healthtrack_preferences",
      version: 2,
      migrate: (persistedState: any, version) => {
        if (!persistedState || version < 2) {
          // Reset un-scoped pre-v2 profile data so different accounts never inherit old test data or DPs
          return {
            glucoseUnit: persistedState?.glucoseUnit || "mg/dL",
            cholesterolUnit: persistedState?.cholesterolUnit || "mg/dL",
            language: persistedState?.language || "en",
            activeProfileOwner: "guest",
            profilesByOwner: {},
            profile: { ...EMPTY_USER_PROFILE },
          };
        }
        return persistedState;
      },
    }
  )
);
