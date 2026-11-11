import type { RankedPathway } from "@/lib/types";
import { useState } from "react";

function getStatusStyling(status: string) {
  switch (status) {
    case "ELIGIBLE":
    case "LIKELY_ELIGIBLE":
      return "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60";
    case "CONDITIONALLY_ELIGIBLE":
      return "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800/60";
    case "BLOCKED":
      return "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-800/60";
    default:
      return "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "ELIGIBLE":
    case "LIKELY_ELIGIBLE":
      return "Strong Fit";
    case "CONDITIONALLY_ELIGIBLE":
      return "Conditionally Eligible";
    case "BLOCKED":
      return "Blocked";
    default:
      return "Needs Verification";
  }
}

// Simple heuristic for document readiness visualization
function categorizeDocument(docName: string) {
  const lower = docName.toLowerCase();
  if (lower.includes("offer") || lower.includes("sponsor") || lower.includes("nomination") || lower.includes("reference")) {
    return { type: "Needs Verification", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60" };
  }
  if (lower.includes("passport") || lower.includes("resume") || lower.includes("cv") || lower.includes("degree") || lower.includes("ielts") || lower.includes("bank")) {
    return { type: "Ready", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60" };
  }
  return { type: "Missing", color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60" };
}

export function PathwayCard({ pathway }: { pathway: RankedPathway }) {
  const [showSources, setShowSources] = useState(false);

  const statusStyle = getStatusStyling(pathway.status);
  const statusLabel = getStatusLabel(pathway.status);

  // Resolve effective score safely from baseScore or legacy score field
  const safeScore = 
    typeof pathway.baseScore === "number" && !isNaN(pathway.baseScore)
      ? pathway.baseScore
      : typeof (pathway as any).score === "number" && !isNaN((pathway as any).score)
        ? (pathway as any).score
        : 0;

  // Score breakdown fields with defensive fallbacks
  const rawBreakdown = pathway.scoreBreakdown;
  const hasValidBreakdown = rawBreakdown && 
    (Number(rawBreakdown.eligibilityFit) > 0 || Number(rawBreakdown.profileStrength) > 0 || Number(rawBreakdown.competitiveness) > 0);

  const breakdown = hasValidBreakdown
    ? {
        eligibilityFit: Number(rawBreakdown?.eligibilityFit) || safeScore,
        profileStrength: Number(rawBreakdown?.profileStrength) || safeScore,
        competitiveness: Number(rawBreakdown?.competitiveness) || safeScore,
        evidenceQuality: Number(rawBreakdown?.evidenceQuality) || 100
      }
    : {
        eligibilityFit: safeScore,
        profileStrength: safeScore,
        competitiveness: safeScore,
        evidenceQuality: 100
      };

  const topAction = pathway.topWhatIfScenario?.targetAction || (pathway.marginalImprovements && pathway.marginalImprovements.length > 0 ? pathway.marginalImprovements[0] : null);

  return (
    <article className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col">
      
      {/* Header */}
      <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {pathway.name}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span>{pathway.country}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
              <span>{pathway.estimated_timeline || "Timeline unknown"}</span>
            </p>
          </div>
          <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase ${statusStyle}`}>
            {statusLabel}
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-5 sm:p-6 grid gap-8 lg:grid-cols-12">
        
        {/* Left Column: Scores & Why */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Why This Pathway? */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Why this pathway?</h3>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              {pathway.reason}
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Positive Factors (Satisfied reqs + General) */}
              <div>
                <h4 className="flex items-center gap-1.5 text-sm font-medium text-emerald-800 dark:text-emerald-400 mb-2">
                  <span className="text-emerald-500">⊕</span> Positive Factors
                </h4>
                <ul className="space-y-2">
                  {pathway.satisfiedRequirements?.filter(r => r.type === "points" || r.type === "hard" || r.type === "conditional").map(r => (
                    <li key={r.id} className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 flex items-start gap-2">
                      <span className="text-emerald-500 font-bold mt-[-1px]">✓</span>
                      <span>{r.description}</span>
                    </li>
                  ))}
                  {(!pathway.satisfiedRequirements || pathway.satisfiedRequirements.length === 0) && (
                    <li className="text-xs text-slate-500 dark:text-slate-400">No major strengths detected.</li>
                  )}
                </ul>
              </div>

              {/* Negative / Blocking Factors */}
              <div>
                <h4 className="flex items-center gap-1.5 text-sm font-medium text-rose-800 dark:text-rose-400 mb-2">
                  <span className="text-rose-500">⊖</span> Risk Factors
                </h4>
                <ul className="space-y-2">
                  {pathway.blockingRequirements?.map(r => (
                    <li key={r.id} className="text-xs leading-relaxed text-rose-600 dark:text-rose-300 flex items-start gap-2 bg-rose-50 dark:bg-rose-950/50 px-2 py-1.5 rounded border border-rose-200 dark:border-rose-900/60">
                      <span className="font-bold mt-[-1px]">BLOCK:</span>
                      <span>{r.description}</span>
                    </li>
                  ))}
                  {pathway.weaknesses?.map((w, idx) => (
                    <li key={idx} className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 flex items-start gap-2">
                      <span className="text-slate-400 dark:text-slate-500 mt-[-1px]">-</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Next Best Action */}
          {topAction && (
            <section className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">Next Best Action</h3>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">{topAction.actionName}</p>
                  <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300">
                    Highest ROI improvement (+{topAction.pointImpact} pts). Difficulty: {topAction.metrics?.difficulty}/5.
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Metrics & Documents */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Score Breakdown */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Score Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: "Eligibility Fit", value: breakdown.eligibilityFit, color: "bg-blue-500" },
                { label: "Profile Strength", value: breakdown.profileStrength, color: "bg-violet-500" },
                { label: "Competitiveness", value: breakdown.competitiveness, color: "bg-amber-500" },
              ].map(metric => {
                const numericValue = typeof metric.value === "number" && !isNaN(metric.value) ? metric.value : 0;
                const displayPct = Math.min(100, Math.max(0, Math.round(numericValue)));
                return (
                  <div key={metric.label}>
                    <div className="flex justify-between text-xs mb-1.5 font-medium text-slate-700 dark:text-slate-300">
                      <span>{metric.label}</span>
                      <span>{displayPct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${metric.color} transition-all duration-500`} style={{ width: `${displayPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Document Readiness */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Document Readiness</h3>
            <ul className="space-y-2">
              {pathway.documents?.map((doc, idx) => {
                const cat = categorizeDocument(doc);
                return (
                  <li key={idx} className="flex items-start justify-between gap-3 text-xs border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-700 dark:text-slate-300">{doc}</span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 border text-[10px] uppercase font-semibold ${cat.color}`}>
                      {cat.type}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      {/* Footer / Source Panel */}
      <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3 sm:px-6 flex flex-col">
        <div className="flex justify-between items-center w-full">
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
            Data grounded in official sources
          </p>
          {pathway.citations && pathway.citations.length > 0 && (
            <button 
              onClick={() => setShowSources(!showSources)}
              className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              {showSources ? "Hide Sources" : "Inspect Sources"}
              <svg className={`h-3 w-3 transform transition-transform ${showSources ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
        
        {showSources && pathway.citations && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 grid gap-3 animate-in fade-in slide-in-from-top-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Official Citations</p>
            {pathway.citations.map((cite, idx) => (
              <a 
                key={idx}
                href={cite.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-3 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-accent dark:group-hover:text-accent transition-colors line-clamp-1">{cite.title}</span>
                  <span className="shrink-0 rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-300">Government Authority</span>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1">{cite.url}</span>
              </a>
            ))}
          </div>
        )}
      </div>

    </article>
  );
}
