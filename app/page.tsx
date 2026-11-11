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
              Official Gov Rules · Honest Visa Chances · Zero Guesswork
            </div>

            <h1 className="text-balance text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Know Your Real <br />
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-500 bg-clip-text text-transparent">
                Visa Chances
              </span>{" "}
              Before You Apply
            </h1>

            <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              Stop guessing or paying expensive agents just to see what visas fit you.
              Borderless AI checks your profile against <strong>real government rules</strong>, spots{" "}
              <strong>what might get your visa rejected</strong>, and gives you a clear plan with our{" "}
              <strong>AI Visa Assistant</strong>.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/form"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-700 hover:shadow-indigo-500/35 active:scale-98"
              >
                <span>Check My Chances — Free</span>
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
                <span>Ask AI Assistant</span>
              </Link>

              <Link
                href="/explore"
                className="inline-flex h-12 items-center justify-center rounded-xl px-4 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              >
                Explore Countries →
              </Link>
            </div>

            {/* Quick 1-Click Client Presets */}
            <div className="mt-8 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/50 p-4 shadow-xs backdrop-blur-xs">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  ⚡ Try a Sample Profile (No Form Needed):
                </p>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Instant Preview</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
                { value: "Official", label: "Government Rules" },
                { value: "Honest", label: "Spots Rejection Risks" },
                { value: "2 Mins", label: "Free Visa Plan" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-3 text-center sm:text-left">
                  <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{s.value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-slate-400">
              🔒 Private &amp; free. No card or account needed for your first visa check.
            </p>
          </div>

          {/* Example Result Interactive Card */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl shadow-slate-200/50 dark:shadow-none lg:sticky lg:top-8">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🇨🇦</span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Sample Result
                </span>
              </div>
              <span className="rounded-full bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800">
                Score: 64 / 100
              </span>
            </div>

            <p className="font-bold text-lg text-slate-900 dark:text-white">Canada Express Entry (Skilled Worker)</p>
            <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full w-[64%] rounded-full bg-amber-500 transition-all duration-1000" />
            </div>

            <p className="mt-3.5 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              You meet the basic rules to apply, but your estimated points (~440) are below recent cut-offs (~480). A provincial job nomination or Canadian job offer would boost your score for an invitation.
            </p>

            <div className="mt-4 space-y-2.5">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 text-xs">
                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-2">What Helps &amp; Hurts Your Score</p>
                <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
                  <li className="flex justify-between">
                    <span>Master&apos;s degree</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+12 pts</span>
                  </li>
                  <li className="flex justify-between">
                    <span>High English score (IELTS 8.0+)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+10 pts</span>
                  </li>
                  <li className="flex justify-between">
                    <span>No Canadian work experience</span>
                    <span className="text-rose-500 dark:text-rose-400 font-semibold">−18 pts</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-3.5 text-xs border border-indigo-100 dark:border-indigo-900/50">
                <p className="font-semibold text-indigo-900 dark:text-indigo-200">Best Way to Boost Your Score</p>
                <p className="mt-1 text-indigo-700 dark:text-indigo-300 leading-relaxed">
                  Apply through provincial tech programs (like Ontario or BC) — adds 600 points and makes an invite far more likely.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span>⏱</span> Typical Wait Time: <strong>12–18 mos</strong>
                </span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  📄 Printable Plan Ready
                </span>
              </div>
            </div>

            <button
              onClick={handleTryDemo}
              className="mt-4 w-full rounded-xl bg-slate-900 dark:bg-slate-800 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 dark:hover:bg-slate-700 shadow-sm"
            >
              See Full Sample Report →
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
              Why People Choose Borderless AI Over Costly Agents &amp; Fake Quizzes
            </h3>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
              Most free visa quizzes hand out unrealistic high scores, and consultants charge high fees upfront. We give you the truth and clear steps first.
            </p>
          </div>

          <div className="mt-12 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
                  <th className="p-4 font-bold text-slate-700 dark:text-slate-300">What Matters</th>
                  <th className="p-4 font-bold text-slate-500 dark:text-slate-400">Paid Visa Agents</th>
                  <th className="p-4 font-bold text-slate-500 dark:text-slate-400">Free Online Quizzes</th>
                  <th className="p-4 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40">
                    Borderless AI
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">Upfront Cost</td>
                  <td className="p-4 text-rose-500 font-medium">$3,000 – $8,000 upfront</td>
                  <td className="p-4 text-amber-600">&ldquo;Free&rdquo; (often sells your email)</td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                    100% Free to Start
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">Honest Scores</td>
                  <td className="p-4 text-rose-500">Often promise easy approval to win clients</td>
                  <td className="p-4 text-rose-500">Unrealistic 90%+ scores for anyone</td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                    Strict &amp; Honest (Spots Rejection Risks)
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">Proof &amp; Official Links</td>
                  <td className="p-4 text-slate-500">Rarely explained upfront</td>
                  <td className="p-4 text-slate-500">No official government sources</td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                    Direct Links to Gov Websites
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">24/7 Q&amp;A Help</td>
                  <td className="p-4 text-slate-500">Wait days for email replies</td>
                  <td className="p-4 text-slate-500">Static one-page result</td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                    Instant AI Assistant Using Gov Rules
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">Checklist &amp; PDF Plan</td>
                  <td className="p-4 text-slate-500">Only after paying full fees</td>
                  <td className="p-4 text-slate-500">No downloadable plan</td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                    1-Click Printable Visa Checklist
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">Country Options</td>
                  <td className="p-4 text-slate-500">Only 1 or 2 countries they specialize in</td>
                  <td className="p-4 text-slate-500">Few basic suggestions</td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                    14 Global Regions &amp; Live Top-Country Rules
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
            Everything in One Place
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
            Four Simple Tools to Plan Your Move
          </h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Check where you qualify, ask questions, and get a step-by-step plan before paying any visa fees.
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
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">1. Honest Visa Eligibility Check</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Checks your age, degree, work experience, English score, and savings against real visa rules for Canada, the UK, the US, Germany, and Australia/NZ.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Shows what could hurt your chances before you apply
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Ranks your best visa options in order
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Takes about 2 minutes to fill out
              </li>
            </ul>
            <div className="mt-6">
              <Link href="/form" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                Start Free Check →
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
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">2. AI Visa Assistant</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Ask questions about visas, salary rules, or documents in everyday words. Answers come straight from verified government pages—never guesses.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Includes direct links to official government websites
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Saves your chats safely to your account
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Free to use with a free account
              </li>
            </ul>
            <div className="mt-6">
              <Link href="/chat" className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">
                Ask AI Assistant →
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
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">3. Country &amp; Region Explorer</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Compare 14 major regions side-by-side. Filter by your goal (Work, Study, or Permanent Stay), budget, and how strict the visa rules are.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Clear pros and cons for every region
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Speed, cost, and difficulty badges at a glance
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Jump straight into an eligibility check for any region
              </li>
            </ul>
            <div className="mt-6">
              <Link href="/explore" className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline">
                Explore All Regions →
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
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">4. Printable Plan &amp; Saved Results</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Download a clean, printable checklist showing what documents you need, why you got your score, and how small changes improve your odds.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> 1-click printable PDF to keep or share with family
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Interactive &ldquo;What-If&rdquo; tool to test score changes
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Past visa checks saved in your personal dashboard
              </li>
            </ul>
            <div className="mt-6">
              <button onClick={handleTryDemo} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                View Sample Plan →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. WHAT YOU ACTUALLY GET ───────────────────────────── */}
      <section className="border-y border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f1d] py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            What You Get
          </h2>
          <h3 className="mt-2 text-center text-3xl font-bold text-slate-900 dark:text-white">
            Included in Every Visa Check
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500 dark:text-slate-400">
            Not just a random percentage — a clear checklist and action plan you can follow today.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "🎯",
                title: "Honest Visa Chances",
                text: "Based on real visa rejection reasons. A 64% score tells you the truth and shows what could block your approval.",
              },
              {
                icon: "📋",
                title: "Document Checklist",
                text: "A clear list of papers to gather for each visa, such as police checks, degree records, and bank statements.",
              },
              {
                icon: "📉",
                title: "Clear Score Breakdown",
                text: "See exactly what raises or lowers your score (+12 for a Master's degree, −18 if you don't have a job offer yet).",
              },
              {
                icon: "🔧",
                title: "Top Way to Improve",
                text: "One prioritized action that raises your chances the most before you spend money applying.",
              },
              {
                icon: "⏱",
                title: "Realistic Wait Times",
                text: "Honest estimates of how long processing actually takes, not overly rosy best-case numbers.",
              },
              {
                icon: "📎",
                title: "Official Government Links",
                text: "Direct links to official government portals (Canada IRCC, UK GOV.UK, Germany BAMF, US USCIS, Australia Home Affairs).",
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
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Why Our Scores Are Strict</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              We score like a strict visa officer — not a salesperson
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Many free visa quizzes give everyone 90%+ scores just to collect emails. We do the opposite. Our checker penalizes low savings, missing English tests, and limited work history — because <strong>those are the real reasons visas get rejected</strong>.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Seeing a 45% score today can save you <strong>thousands in non-refundable visa fees</strong> and months of wasted waiting time.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Savings under $5,000", impact: "Big Score Drop (High Rejection Risk)" },
              { label: "No English Test (IELTS/TOEFL)", impact: "Lowers Score on Most Visas" },
              { label: "Under 2 Years Experience", impact: "Fewer Points" },
              { label: "High School Only", impact: "Limits Skilled Work Visas" },
              { label: "Master's or PhD", impact: "Score Boost (+12–15 pts)" },
              { label: "Confirmed Job Offer", impact: "Major Boost (Unlocks Work Visas)" },
            ].map((r) => (
              <div key={r.label} className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{r.label}</span>
                <span className={`mt-1 font-medium ${r.impact.includes("Boost") ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
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
            Destinations We Cover
          </h2>
          <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            Compare Options Across 14 World Regions
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-xs text-slate-500 dark:text-slate-400">
            Live scoring covers top English &amp; European destinations, with regional guides across the globe:
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
              <span>Browse All Regions</span>
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
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Your Recent Checks</h2>
              <Link href="/history" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                View all past checks →
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
                    {" · "}{item.goal === "pr" ? "Permanent Stay (PR)" : item.goal === "work" ? "Work" : "Study"}
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
          Common Questions
        </h2>
        <h3 className="mt-1 text-center text-2xl font-bold text-slate-900 dark:text-white">
          Simple Answers Before You Start
        </h3>

        <div className="mt-8 space-y-4">
          {[
            {
              q: "How is Borderless AI different from ChatGPT?",
              a: "General AI chatbots can guess outdated fees or make up visa rules. Borderless AI searches our verified collection of official government pages first, gives direct links to the source, and tells you honestly if a country isn't covered yet.",
            },
            {
              q: "Why are the visa scores strict?",
              a: "Because real visa officers are strict. Visas often get denied for missing language scores, low bank savings, or no job offer. Highlighting those weak spots early helps you fix them before spending non-refundable government fees.",
            },
            {
              q: "Can I use this without signing up?",
              a: "Yes! You can run free eligibility checks, browse all 14 regions, and try sample reports without an account. Creating a free account is only needed for the AI Chat and saving your history.",
            },
            {
              q: "Where do your visa rules come from?",
              a: "Directly from official government immigration websites, including Canada (IRCC), the UK (GOV.UK), Germany (BAMF / Make it in Germany), Australia (Home Affairs), New Zealand (INZ), and the US (USCIS).",
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
              ✨ Free to Start · No Card Needed
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Stop Guessing. See Your Real Visa Options Today.
            </h2>
            <p className="mx-auto mt-4 text-sm sm:text-base leading-relaxed text-indigo-200">
              A 2-minute check or a quick chat with our AI Assistant saves months of blind searching. Know where you qualify and what to fix next.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/form"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-indigo-900 shadow-lg hover:bg-slate-100 transition active:scale-98"
              >
                Start Free Check
              </Link>
              <Link
                href="/chat"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl border border-indigo-400/40 bg-indigo-950/60 px-6 text-sm font-semibold text-white hover:bg-indigo-900/60 transition active:scale-98"
              >
                Ask AI Assistant
              </Link>
            </div>

            <p className="mt-5 text-xs text-indigo-300/70">
              Backed by official government websites · Your data stays private
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

