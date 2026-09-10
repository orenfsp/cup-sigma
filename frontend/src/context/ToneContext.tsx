"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type ApplicantType = "student" | "parent" | "teacher";

interface ToneContextType {
  applicantType: ApplicantType;
  setApplicantType: (type: ApplicantType) => void;
  tone: "ty" | "vy";
  t: (studentText: string, adultText: string) => string;
}

const ToneContext = createContext<ToneContextType | undefined>(undefined);

export function ToneProvider({ children }: { children: ReactNode }) {
  const [applicantType, setApplicantType] = useState<ApplicantType>("student");

  const tone = applicantType === "student" ? "ty" : "vy";

  const t = (studentText: string, adultText: string) => {
    return tone === "ty" ? studentText : adultText;
  };

  return (
    <ToneContext.Provider value={{ applicantType, setApplicantType, tone, t }}>
      {children}
    </ToneContext.Provider>
  );
}

export function useTone() {
  const context = useContext(ToneContext);
  if (!context) {
    throw new Error("useTone must be used within a ToneProvider");
  }
  return context;
}
