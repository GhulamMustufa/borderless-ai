"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  readRecentSubmissions,
  type RecentSubmission,
} from "@/lib/submissions";
import { DEMO_RESULT, DEMO_PRESETS } from "@/lib/demo";
import { RESULT_STORAGE_KEY } from "@/lib/storage";

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown time";
  return d.toLocaleString();
}

const REGIONS: Record<string, string> = {
  canada: "🇨🇦 Canada",
  uk: "🇬🇧 United Kingdom",
  "australia-new-zealand": "🇦🇺 Australia / NZ",
  "germany-nordics": "🇩🇪 Germany & EU Blue Card",
  "southern-europe": "🇪🇸 Portugal & Spain Nomad",
  "middle-east": "🇦🇪 UAE Golden Visa",
  usa: "🇺🇸 United States",
  "sg-my": "🇸🇬 Singapore & Malaysia",
  "jp-kr": "🇯🇵 Japan & South Korea",
  "easy-entry": "✈️ Fast-Track Nomad",
  latam: "🌎 Latin America",
  "eastern-europe": "🏰 Eastern Europe",
  "greater-china": "🐉 Greater China",
  africa: "🦁 Africa",
};

export default function Home() {
  const router = useRouter();
  const [recent, setRecent] = useState<RecentSubmission[]>([]);

  useEffect(() => {
    setRecent(readRecentSubmissions());
  }, []);

  const handleTryDemo = () => {
    sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(DEMO_RESULT));
    router.push("/results");
  };

  return (
    <main className="relative overflow-hidden">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-[650px] bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_70%)]" />

      {/* ── 1. HERO SECTION ───────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-800/70 bg-indigo-50/80 dark:bg-indigo-950/40 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 backdrop-blur-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              1,450+ Verified Pathways · 70+ Countries · Zero Hallucinations
            </div>

            <h1 className="text-balance text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Know Your Real <br />
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-500 bg-clip-text text-transparent">
                Visa Chances
              </span>{" "}
              Before You Apply
            </h1>

            <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              Stop wasting thousands on predatory consultants or trusting feel-good 90% quizzes. 
              Borderless AI uses <strong>refusal-calibrated algorithms</strong>, an <strong>AI Immigration Copilot</strong>, 
              and a database of <strong>1,454 official pathways</strong> so you invest only where you qualify.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/form"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-700 hover:shadow-indigo-500/35 active:scale-98"
              >
                <span>Check My Eligibility — Free</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>

              <Link
                href="/chat"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 active:scale-98"
              >
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span>Ask AI Copilot</span>
              </Link>

              <Link
                href="/explore"
                className="inline-flex h-12 items-center justify-center rounded-xl px-4 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              >
                Explore 1,450+ Visas →
              </Link>
            </div>

            {/* Quick 1-Click Client Presets */}
            <div className="mt-8 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/50 p-4 shadow-xs backdrop-blur-xs">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  ⚡ 1-Click Interactive Demos (Skip Form):
                </p>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Instant PDF Preview</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DEMO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(preset.result));
                      router.push("/results");
                    }}
                    className="flex flex-col items-start rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-left transition hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 group"
                  >
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="text-base">{preset.flag}</span>
                      <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {preset.title}
                      </span>
                    </div>
                    <span className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 truncate w-full">
                      {preset.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { value: "1,454", label: "Verified Pathways" },
                { value: "70+", label: "Countries Covered" },
                { value: "pgvector", label: "Government RAG" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-3 text-center sm:text-left">
                  <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{s.value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-slate-400">
              🔒 100% confidential. No credit card or account needed to run your first check.
            </p>
          </div>

          {/* Example Result Interactive Card */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl shadow-slate-200/50 dark:shadow-none lg:sticky lg:top-8">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🇨🇦</span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Sample Assessment Result
                </span>
              </div>
              <span className="rounded-full bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800">
                Score: 64 / 100
              </span>
            </div>

            <p className="font-bold text-lg text-slate-900 dark:text-white">Canada Express Entry (FSW)</p>
            <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full w-[64%] rounded-full bg-amber-500 transition-all duration-1000" />
            </div>

            <p className="mt-3.5 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Profile enters Express Entry pool, but CRS score (~440) falls below recent draw cutoffs (~480). A provincial nomination (PNP) or Canadian job offer would guarantee an ITA.
            </p>

            <div className="mt-4 space-y-2.5">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 text-xs">
                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Score Drivers (Refusal Breakdown)</p>
                <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
                  <li className="flex justify-between">
                    <span>Master&apos;s degree evaluated</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+12 pts</span>
                  </li>
                  <li className="flex justify-between">
                    <span>IELTS CLB 9 equivalent</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+10 pts</span>
                  </li>
                  <li className="flex justify-between">
                    <span>No Canadian work experience</span>
                    <span className="text-rose-500 dark:text-rose-400 font-semibold">−18 pts</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-3.5 text-xs border border-indigo-100 dark:border-indigo-900/50">
                <p className="font-semibold text-indigo-900 dark:text-indigo-200">Top High-Impact Fix</p>
                <p className="mt-1 text-indigo-700 dark:text-indigo-300 leading-relaxed">
                  Target Ontario/BC PNP tech stream draws — adds 600 CRS points and eliminates refusal probability.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span>⏱</span> Realistic Processing: <strong>12–18 mos</strong>
                </span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  📄 PDF Action Plan Ready
                </span>
              </div>
            </div>

            <button
              onClick={handleTryDemo}
              className="mt-4 w-full rounded-xl bg-slate-900 dark:bg-slate-800 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 dark:hover:bg-slate-700 shadow-sm"
            >
              Open Full Interactive Results Report →
            </button>
          </div>
        </div>
      </section>

      {/* ── 2. WHY BORDERLESS AI VS TRADITIONAL ADVICE ────────── */}
      <section className="border-y border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f1d] py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Why We Are Different
            </h2>
            <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Why Applicants Choose Borderless AI over Shady Consultants & Generic Quizzes
            </h3>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
              Traditional immigration services make money by keeping you in the dark. We give you transparent legal intelligence instantly.
            </p>
          </div>

          <div className="mt-12 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
                  <th className="p-4 font-bold text-slate-700 dark:text-slate-300">Key Criteria</th>
                  <th className="p-4 font-bold text-slate-500 dark:text-slate-400">Predatory Consultants</th>
                  <th className="p-4 font-bold text-slate-500 dark:text-slate-400">Generic Online Quizzes</th>
                  <th className="p-4 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40">
                    Borderless AI
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">Upfront Cost</td>
                  <td className="p-4 text-rose-500 font-medium">$3,000 – $8,000 upfront</td>
                  <td className="p-4 text-amber-600">"Free" (harvests & sells email)</td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                    100% Free to Start
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">Scoring Honesty</td>
                  <td className="p-4 text-rose-500">Overpromises to close retainers</td>
                  <td className="p-4 text-rose-500">Inflated 90%+ feel-good scores</td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                    Refusal-Calibrated & Strict
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">Legal Evidence Citations</td>
                  <td className="p-4 text-slate-500">Hidden behind consultations</td>
                  <td className="p-4 text-slate-500">None (Wikipedia summaries)</td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                    Official Gazette & Gov Citations
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">Interactive AI Copilot</td>
                  <td className="p-4 text-slate-500">Wait days for slow email replies</td>
                  <td className="p-4 text-slate-500">Static single-page quiz</td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                    Instant RAG Policy Assistant
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">Action Plan PDF Export</td>
                  <td className="p-4 text-slate-500">Only after full fee paid</td>
                  <td className="p-4 text-slate-500">No downloadable plan</td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                    1-Click Printable Legal Roadmap
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">Coverage</td>
                  <td className="p-4 text-slate-500">Only 1 or 2 countries they sell</td>
                  <td className="p-4 text-slate-500">Limited generic routes</td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                    1,454 Pathways across 70+ Countries
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 3. FOUR CORE PLATFORM PILLARS ──────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Full-Stack Immigration Intelligence
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
            Everything You Need to Navigate Moving Abroad
          </h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Four integrated tools working together so you never make a blind immigration decision.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Pillar 1: Scoring */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-5">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">1. Refusal-Calibrated Assessment</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Evaluates your human capital score, age, language test scores, savings, and field against points thresholds (e.g., German Chancenkarte, Canadian CRS, UK Skilled Worker salary floors).
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Identifies point deductions before you apply
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Recommends top 3 viable alternatives
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Takes just 2 minutes to complete
              </li>
            </ul>
            <div className="mt-6">
              <Link href="/form" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                Launch Assessment Form →
              </Link>
            </div>
          </div>

          {/* Pillar 2: AI Copilot */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-5">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">2. AI Immigration Copilot</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Ask policy, salary, and tax questions in natural language. Powered by Neon PostgreSQL pgvector cosine similarity search over government gazettes — with zero hallucinated rules.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Cites verified official sources with direct URLs
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Persistent chat threads saved to your cloud account
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Included free with your Borderless AI account
              </li>
            </ul>
            <div className="mt-6">
              <Link href="/chat" className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">
                Chat with Immigration Copilot →
              </Link>
            </div>
          </div>

          {/* Pillar 3: Pathway Explorer */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-5">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">3. Global Pathway Explorer</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Browse 1,454 verified visa categories across 70+ nations. Filter by your goals: Digital Nomad, Skilled Worker, Founder/Startup, Investor, Study-to-PR, or Working Holiday.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Direct links to official government application pages
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Speed, cost, and difficulty ratings for every route
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Filter by budget (Low, Medium, High)
              </li>
            </ul>
            <div className="mt-6">
              <Link href="/explore" className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline">
                Explore All 1,454 Pathways →
              </Link>
            </div>
          </div>

          {/* Pillar 4: Action Plan & Dashboard */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-5">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">4. PDF Action Plan & Dashboard</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Generate a printable legal roadmap complete with required document checklists, score drivers, and percentile benchmarking against thousands of applicant profiles.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> 1-click printable PDF to share with family or advisors
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Human capital benchmarks in personal dashboard
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Cloud-synced assessment history
              </li>
            </ul>
            <div className="mt-6">
              <button onClick={handleTryDemo} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                View Sample Action Plan →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. WHAT YOU ACTUALLY GET ───────────────────────────── */}
      <section className="border-y border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f1d] py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Actionable Deliverables
          </h2>
          <h3 className="mt-2 text-center text-3xl font-bold text-slate-900 dark:text-white">
            What You Receive From Every Assessment
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500 dark:text-slate-400">
            Not a vague percentage — a structured, verifiable roadmap you can act on today.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "🎯",
                title: "Refusal-Calibrated Probability",
                text: "Calibrated to real visa refusal rates. A score of 64% is honest and highlights exactly what will trigger refusal.",
              },
              {
                icon: "📋",
                title: "Pathway-Specific Document Checklist",
                text: "5–8 specific documents you must gather (police clearance, apostilles, certified bank statements) for each route.",
              },
              {
                icon: "📉",
                title: "Mathematical Score Drivers",
                text: "See the exact mathematical drivers (+12 Master's, −18 no job offer) so you know what will move the needle.",
              },
              {
                icon: "🔧",
                title: "Highest-Impact Improvement",
                text: "A single, prioritized action that provides the maximum points boost before you submit an application.",
              },
              {
                icon: "⏱",
                title: "Realistic Processing Timelines",
                text: "Actual processing duration based on current consular backlogs, not marketing best-case scenarios.",
              },
              {
                icon: "📎",
                title: "Verified Government Citations",
                text: "Direct source links to official immigration ministries (IRCC, BAMF, UK Home Office, USCIS, Home Affairs).",
              },
            ].map((f) => (
              <article key={f.title} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
                <span className="text-2xl">{f.icon}</span>
                <h4 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">{f.title}</h4>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{f.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. PHILOSOPHY ─────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Our Legal Philosophy</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              We score like a skeptical immigration officer — not a travel agent
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Most free visa tools inflate scores to 90%+ to keep you happy and collect your data. We do the opposite. Our model aggressively penalizes low savings, missing language tests, and insufficient work experience — because <strong>those are the exact reasons visas get refused</strong>.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Finding out you have a 45% chance today saves you <strong>$3,500 in non-refundable government fees</strong> and months of wasted waiting time.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Savings under $5,000", impact: "Heavy Penalty (Automatic Refusal Risk)" },
              { label: "No Language Test (IELTS/PTE)", impact: "Heavy Penalty" },
              { label: "Under 2 Years Experience", impact: "Penalized" },
              { label: "High School Only", impact: "Strict Mode (Degree Required)" },
              { label: "Master's or PhD", impact: "Score Boost (+12–15 pts)" },
              { label: "Official Job Offer / PNP", impact: "Invitation Guarantee" },
            ].map((r) => (
              <div key={r.label} className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{r.label}</span>
                <span className={`mt-1 font-medium ${r.impact.includes("Boost") || r.impact.includes("Guarantee") ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
                  {r.impact}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. COVERED REGIONS ────────────────────────────────── */}
      <section className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0a0f1d] py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Global Jurisdiction Coverage
          </h2>
          <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            1,454 Visa Pathways Across 70+ Countries
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-xs text-slate-500 dark:text-slate-400">
            Explore dedicated legal criteria across all major immigration hubs:
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {Object.values(REGIONS).map((label) => (
              <span
                key={label}
                className="rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-xs"
              >
                {label}
              </span>
            ))}
          </div>
          <div className="mt-6">
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <span>Search complete directory in Explorer</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 7. RECENT CHECKS (LOCALSTORAGE) ───────────────────── */}
      {recent.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Your Recent Profile Checks</h2>
              <Link href="/history" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                View all past assessments →
              </Link>
            </div>
            <ul className="space-y-2">
              {recent.map((item) => (
                <li
                  key={`${item.submittedAt}-${item.nationality}-${item.fieldOfWork}`}
                  className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
                >
                  <span>
                    <span className="font-semibold">{item.nationality}</span>
                    {" · "}{REGIONS[item.targetRegion] ?? item.targetRegion}
                    {" · "}{item.goal.toUpperCase()}
                    {" · "}{item.fieldOfWork}
                  </span>
                  <span className="ml-4 shrink-0 text-slate-400">{fmtTime(item.submittedAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── 8. FREQUENTLY ASKED QUESTIONS ─────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          Frequently Asked Questions
        </h2>
        <h3 className="mt-1 text-center text-2xl font-bold text-slate-900 dark:text-white">
          Everything You Need to Know
        </h3>

        <div className="mt-8 space-y-4">
          {[
            {
              q: "How is Borderless AI different from ChatGPT?",
              a: "Standard LLMs hallucinate outdated immigration thresholds and invent non-existent rules. Borderless AI uses Retrieval-Augmented Generation (RAG) with vector embeddings over official government immigration evidence. When it answers your questions, it is strictly bound to official legal gazettes and cites exact government links.",
            },
            {
              q: "Why are the probability scores conservative?",
              a: "Because real immigration officers are conservative. Consulates refuse applications for missing language exams, insufficient funds, or missing job verification. We incorporate refusal penalties into our scoring so you fix weak spots before spending non-refundable application fees.",
            },
            {
              q: "Can I use this without creating an account?",
              a: "Yes! You can run free eligibility assessments, browse all 1,454 visas, and test 1-click presets without an account. Creating a free account lets you sync chat history and save assessment plans to your personal dashboard.",
            },
            {
              q: "Where does your visa data come from?",
              a: "Our database is sourced directly from official ministerial immigration portals including IRCC (Canada), GOV.UK (UK), BAMF & Make it in Germany, Department of Home Affairs (Australia), USCIS/State Dept (USA), and European Ministry gazettes.",
            },
          ].map((item) => (
            <div key={item.q} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">{item.q}</h4>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 9. FINAL HIGH-CONVERSION CTA ──────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="rounded-3xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-8 sm:p-14 text-center shadow-2xl relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.25),transparent_70%)]" />
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-400/30 mb-4">
              ✨ Free Instant Access · No Card Needed
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Stop Guessing. Discover Your Real Global Visa Options Today.
            </h2>
            <p className="mx-auto mt-4 text-sm sm:text-base leading-relaxed text-indigo-200">
              A 2-minute assessment or a quick question with our AI Copilot is worth months of blind research. Know where you qualify and what to fix.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/form"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-indigo-900 shadow-lg hover:bg-slate-100 transition active:scale-98"
              >
                Start Free Assessment
              </Link>
              <Link
                href="/chat"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl border border-indigo-400/40 bg-indigo-950/60 px-6 text-sm font-semibold text-white hover:bg-indigo-900/60 transition active:scale-98"
              >
                Ask AI Copilot
              </Link>
            </div>

            <p className="mt-5 text-xs text-indigo-300/70">
              Grounded in 1,454 official pathways · Zero data selling · 100% confidential
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

