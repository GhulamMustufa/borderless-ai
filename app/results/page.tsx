"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { parseStoredResult, RESULT_STORAGE_KEY } from "@/lib/storage";
import type { StoredResult } from "@/lib/storage";
import type { VisaProfile, RankedPathway } from "@/lib/types";
import { PathwayCard } from "@/components/PathwayCard";
import { WhatIfSimulator } from "@/components/WhatIfSimulator";
import { normalizeProfile } from "@/lib/profile";
import { PATHWAY_REGISTRY } from "@/lib/domain";

function getProfileHeuristicScore(p: VisaProfile) {
  // Education points (0 - 28)
  let educationPts = 5;
  if (p.education === "bachelor") educationPts = 16;
  else if (p.education === "master") educationPts = 24;
  else if (p.education === "phd") educationPts = 28;

  // Work experience points (0 - 24)
  const exp = Number(p.yearsExperience) || 0;
  let expPts = 0;
  if (exp >= 8) expPts = 24;
  else if (exp >= 5) expPts = 20;
  else if (exp >= 3) expPts = 15;
  else if (exp >= 1) expPts = 8;

  // Savings points (0 - 24)
  const savings = Number(p.savingsUsd) || 0;
  let savingsPts = 0;
  if (savings >= 50000) savingsPts = 24;
  else if (savings >= 25000) savingsPts = 18;
  else if (savings >= 10000) savingsPts = 12;
  else if (savings >= 5000) savingsPts = 6;

  // Language points (0 - 24)
  let langPts = 0;
  if (p.englishTest === "ielts") {
    const score = Number(p.testScore) || 0;
    if (score >= 8) langPts = 24;
    else if (score >= 7) langPts = 18;
    else if (score >= 6) langPts = 12;
    else if (score >= 5) langPts = 6;
  } else if (p.englishTest === "toefl") {
    const score = Number(p.testScore) || 0;
    if (score >= 100) langPts = 24;
    else if (score >= 85) langPts = 18;
    else if (score >= 70) langPts = 12;
    else if (score >= 50) langPts = 6;
  }

  return {
    total: educationPts + expPts + savingsPts + langPts,
    educationPts,
    expPts,
    savingsPts,
    langPts,
  };
}

function simulatePathway(
  pathway: RankedPathway,
  initialProfile: VisaProfile,
  simProfile: VisaProfile
): RankedPathway {
  const isChanged =
    initialProfile.education !== simProfile.education ||
    initialProfile.yearsExperience !== simProfile.yearsExperience ||
    initialProfile.savingsUsd !== simProfile.savingsUsd ||
    initialProfile.englishTest !== simProfile.englishTest ||
    initialProfile.testScore !== simProfile.testScore;

  const hasOriginalScore =
    (typeof pathway.baseScore === "number" && Number.isFinite(pathway.baseScore)) ||
    (typeof (pathway as any).score === "number" && Number.isFinite((pathway as any).score));

  const originalScore =
    typeof pathway.baseScore === "number" && Number.isFinite(pathway.baseScore)
      ? pathway.baseScore
      : typeof (pathway as any).score === "number" && Number.isFinite((pathway as any).score)
        ? (pathway as any).score
        : 0;

  const initialH = getProfileHeuristicScore(initialProfile);
  const simH = getProfileHeuristicScore(simProfile);
  const delta = simH.total - initialH.total;

  const baselineProfileStrength = Math.min(
    100,
    Math.max(0, Math.round(((initialH.educationPts + initialH.expPts) / 52) * 100))
  );
  const baselineCompetitiveness = Math.min(
    100,
    Math.max(0, Math.round(((initialH.langPts + initialH.expPts + initialH.savingsPts) / 72) * 100))
  );
  const baselineScore = hasOriginalScore ? originalScore : initialH.total;

  if (!isChanged) {
    return {
      ...pathway,
      baseScore: baselineScore,
      scoreBreakdown: {
        eligibilityFit: pathway.scoreBreakdown?.eligibilityFit ?? baselineScore,
        profileStrength: pathway.scoreBreakdown?.profileStrength ?? baselineProfileStrength,
        competitiveness: pathway.scoreBreakdown?.competitiveness ?? baselineCompetitiveness,
        evidenceQuality: pathway.scoreBreakdown?.evidenceQuality ?? 100,
      },
    };
  }

  const rawScore = !hasOriginalScore ? simH.total : originalScore + delta;

  const newBaseScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  let newStatus = pathway.status;
  if (newBaseScore >= 70) {
    newStatus = "ELIGIBLE";
  } else if (newBaseScore >= 45) {
    newStatus = "CONDITIONALLY_ELIGIBLE";
  } else {
    newStatus = "BLOCKED";
  }

  const profileStrength = Math.min(
    100,
    Math.max(0, Math.round(((simH.educationPts + simH.expPts) / 52) * 100))
  );
  const competitiveness = Math.min(
    100,
    Math.max(0, Math.round(((simH.langPts + simH.expPts + simH.savingsPts) / 72) * 100))
  );
  const eligibilityFit = newBaseScore;

  return {
    ...pathway,
    baseScore: newBaseScore,
    status: newStatus as any,
    scoreBreakdown: {
      eligibilityFit,
      profileStrength,
      competitiveness,
      evidenceQuality: pathway.scoreBreakdown?.evidenceQuality || 100,
    },
  };
}

export default function ResultsPage() {
  const [data, setData] = useState<StoredResult | null | undefined>(undefined);
  const [simulatedProfile, setSimulatedProfile] = useState<VisaProfile | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(RESULT_STORAGE_KEY);
    const parsed = parseStoredResult(raw);
    setData(parsed);
    if (parsed?.profileSummary) {
      setSimulatedProfile(parsed.profileSummary);
    }
  }, []);

  const handleSimulate = (newProfile: VisaProfile) => {
    setSimulatedProfile(newProfile);
  };

  const handleReset = () => {
    if (data?.profileSummary) {
      setSimulatedProfile(data.profileSummary);
    }
  };

  const simulatedPathways = useMemo(() => {
    if (!data || !simulatedProfile || !data.profileSummary) return data?.pathways || [];
    
    return data.pathways.map((pathway) =>
      simulatePathway(pathway, data.profileSummary, simulatedProfile)
    );
  }, [data, simulatedProfile]);

  if (data === undefined) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-24 text-center text-slate-600">
        Loading…
      </main>
    );
  }

  if (!data || !simulatedProfile) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">No visa results yet</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Fill out the quick check form first — your results will appear right here.
        </p>
        <Link
          href="/form"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-accent px-6 text-sm font-medium text-white shadow-soft hover:bg-indigo-600"
        >
          Start Visa Check
        </Link>
      </main>
    );
  }

  const readableGoal =
    data.profileSummary.goal === "pr"
      ? "Stay Long-Term (PR)"
      : data.profileSummary.goal === "work"
        ? "Work Visa"
        : "Student Visa";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        
        {/* Print-Only Executive Letterhead */}
        <div className="hidden print:flex flex-row items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base">
              B
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Borderless AI</h2>
              <p className="text-xs text-slate-500">Personal Visa Eligibility Report</p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Date: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            <p className="font-mono text-[10px] text-slate-400">REF: {data.profileSummary.nationality.slice(0,3).toUpperCase()}-{data.profileSummary.targetRegion.toUpperCase()}</p>
          </div>
        </div>

        {/* Header Area */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">
              Your Results
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Your Visa Plan
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              We checked your details against {simulatedPathways.length} visa options.
              Below is an honest view of where you qualify, what may hold you back, and what to do next.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <button
              onClick={() => window.print()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-soft transition hover:bg-indigo-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Save / Print Plan (PDF)</span>
            </button>
            <Link
              href="/form"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Check Another Country
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12 items-start">
          
          {/* Left Sidebar: Applicant Snapshot & Simulator */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
            
            {/* Applicant Snapshot */}
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-slate-400 dark:text-slate-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                Your Details
              </h2>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Type of Work</p>
                  <p className="font-medium text-slate-900 dark:text-white truncate" title={data.profileSummary.fieldOfWork}>{data.profileSummary.fieldOfWork}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Nationality</p>
                  <p className="font-medium text-slate-900 dark:text-white">{data.profileSummary.nationality}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Goal</p>
                  <p className="font-medium text-slate-900 dark:text-white">{readableGoal}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Age</p>
                  <p className="font-medium text-slate-900 dark:text-white">{data.profileSummary.age} years</p>
                </div>
              </div>
            </section>

            {/* What-If Simulator (Interactive only, hidden in printed document) */}
            <div className="print:hidden">
              <WhatIfSimulator 
                initialProfile={data.profileSummary}
                onChange={handleSimulate}
                onReset={handleReset}
              />
            </div>

            {/* Disclaimer */}
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-4 border border-amber-200 dark:border-amber-800/60">
              <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                <strong>Important:</strong> These results give practical guidance based on official rules, not formal legal advice. Always check the official government website or talk to a licensed immigration lawyer before applying.
              </p>
            </div>
          </div>

          {/* Main Content Area: Pathways */}
          <div className="lg:col-span-8 space-y-6">
            {simulatedPathways.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-sm">
                <p className="text-slate-500 dark:text-slate-400">No matching visa options were found for those details.</p>
              </div>
            ) : (
              simulatedPathways.map((pathway, idx) => (
                <PathwayCard key={`${pathway.pathwayId}-${idx}`} pathway={pathway} />
              ))
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
