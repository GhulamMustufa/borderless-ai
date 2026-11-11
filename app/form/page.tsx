"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Education, EnglishTest, Goal, TargetRegion } from "@/lib/types";
import { RESULT_STORAGE_KEY } from "@/lib/storage";
import { pushRecentSubmission } from "@/lib/submissions";
import { DEMO_PRESETS } from "@/lib/demo";
import { CERTIFIED_TARGET_REGIONS, EXPLORE_TO_FORM_REGION_MAP } from "@/lib/regions";

const REGIONS: { id: string; value: TargetRegion; label: string }[] = [
  { id: "canada", value: "canada", label: "Canada" },
  { id: "uk", value: "uk", label: "UK" },
  { id: "australia-new-zealand", value: "australia-new-zealand", label: "Australia/New Zealand" },
  { id: "germany-nordics", value: "germany-nordics", label: "Germany/Northern Europe" },
  { id: "southern-europe", value: "southern-europe", label: "Southern Europe" },
  { id: "middle-east", value: "middle-east", label: "Middle East" },
  { id: "usa", value: "usa", label: "USA" },
  { id: "sg-my", value: "sg-my", label: "Singapore/Malaysia" },
  { id: "jp-kr", value: "jp-kr", label: "Japan/South Korea" },
  { id: "easy-entry", value: "easy-entry", label: "Easy Entry Countries" },
  { id: "latam", value: "latam", label: "Latin America" },
  { id: "eastern-europe", value: "eastern-europe", label: "Eastern Europe & Caucasus" },
  { id: "greater-china", value: "greater-china", label: "Greater China" },
  { id: "africa", value: "africa", label: "Africa" },
];

const REGION_QUERY_MAP = EXPLORE_TO_FORM_REGION_MAP;

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria", "Bangladesh", 
  "Belgium", "Brazil", "Canada", "China", "Colombia", "Denmark", "Egypt", "Ethiopia",
  "France", "Germany", "Ghana", "Greece", "India", "Indonesia", "Iran", "Iraq", "Ireland",
  "Italy", "Japan", "Kenya", "Malaysia", "Mexico", "Morocco", "Myanmar", "Nepal", 
  "Netherlands", "New Zealand", "Nigeria", "Pakistan", "Peru", "Philippines", "Poland", 
  "Portugal", "Russia", "Saudi Arabia", "Singapore", "South Africa", "South Korea", 
  "Spain", "Sri Lanka", "Sweden", "Switzerland", "Taiwan", "Tanzania", "Thailand", 
  "Turkey", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", 
  "United States", "Venezuela", "Vietnam", "Zimbabwe", "Other"
];

const FIELD_OF_WORK_OPTIONS = [
  "Software & IT",
  "Healthcare & Medical",
  "Engineering & Architecture",
  "Finance & Accounting",
  "Education & Teaching",
  "Construction & Trades",
  "Business & Management",
  "Sales & Marketing",
  "Sciences & Research",
  "Arts, Design & Media",
  "Hospitality & Tourism",
  "Legal & Compliance",
  "Operations & Logistics",
  "Other"
];

const STEPS = [
  { id: 1, title: "You & where you want to go", short: "Basics" },
  { id: 2, title: "Education & work", short: "Experience" },
  { id: 3, title: "English, savings & goal", short: "Final Step" },
] as const;

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-accent focus:ring-4 focus:ring-[var(--ring)]";

export default function FormPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegionLabel, setSelectedRegionLabel] = useState<string | null>(null);
  const [targetRegionValue, setTargetRegionValue] = useState<TargetRegion>("canada");
  const submitByButtonRef = useRef(false);

  const progressPct = useMemo(() => (step / STEPS.length) * 100, [step]);

  useEffect(() => {
    const rawRegion = new URLSearchParams(window.location.search).get("region");
    if (!rawRegion) return;
    const mapped = REGION_QUERY_MAP[rawRegion];
    if (!mapped) return;
    setSelectedRegionLabel(mapped.label);
    setTargetRegionValue(mapped.targetRegion);
  }, []);

  function validateStep1(form: HTMLFormElement): string | null {
    const fd = new FormData(form);
    if (!String(fd.get("nationality") ?? "").trim()) return "Please choose your nationality.";
    if (!fd.get("targetRegion")) return "Please pick where you want to move.";
    const age = Number(fd.get("age"));
    if (!Number.isFinite(age) || age < 18 || age > 80) return "Age must be between 18 and 80.";
    return null;
  }

  function validateStep2(form: HTMLFormElement): string | null {
    const fd = new FormData(form);
    if (!fd.get("education")) return "Please choose your education level.";
    const y = Number(fd.get("yearsExperience"));
    if (!Number.isFinite(y) || y < 0 || y > 60) return "Please enter work experience between 0 and 60 years.";
    if (!String(fd.get("fieldOfWork") ?? "").trim()) return "Please choose your kind of work.";
    return null;
  }

  function validateStep3(form: HTMLFormElement): string | null {
    const fd = new FormData(form);
    if (!fd.get("englishTest")) return "Please pick an English test option.";
    const s = Number(fd.get("savingsUsd"));
    if (!Number.isFinite(s) || s < 0) return "Please enter your savings in USD (0 or more).";
    if (!fd.get("goal")) return "Please choose your main goal.";
    const test = String(fd.get("englishTest"));
    const scoreRaw = String(fd.get("testScore") ?? "").trim();
    if (scoreRaw && test === "ielts") {
      const sc = Number(scoreRaw);
      if (!Number.isFinite(sc) || sc < 0 || sc > 9) return "Please enter an IELTS score between 0 and 9.";
    }
    if (scoreRaw && test === "toefl") {
      const sc = Number(scoreRaw);
      if (!Number.isFinite(sc) || sc < 0 || sc > 120) return "Please enter a TOEFL score between 0 and 120.";
    }
    return null;
  }

  function next() {
    const form = document.getElementById("visa-form") as HTMLFormElement | null;
    if (!form) return;
    setError(null);
    if (step === 1) {
      const e = validateStep1(form);
      if (e) {
        setError(e);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const e = validateStep2(form);
      if (e) {
        setError(e);
        return;
      }
      setStep(3);
    }
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  function handleFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter") return;
    if (step !== 3) return;
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag === "textarea") return;
    e.preventDefault();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!submitByButtonRef.current) {
      return;
    }
    submitByButtonRef.current = false;
    setError(null);
    const form = e.currentTarget;
    const e1 = validateStep1(form);
    if (e1) {
      setError(e1);
      setStep(1);
      return;
    }
    const e2 = validateStep2(form);
    if (e2) {
      setError(e2);
      setStep(2);
      return;
    }
    const e3 = validateStep3(form);
    if (e3) {
      setError(e3);
      return;
    }

    const fd = new FormData(form);
    const nationality = String(fd.get("nationality") ?? "").trim();
    const targetRegion = fd.get("targetRegion") as TargetRegion;
    const age = Number(fd.get("age"));
    const education = fd.get("education") as Education;
    const yearsExperience = Number(fd.get("yearsExperience"));
    const fieldOfWork = String(fd.get("fieldOfWork") ?? "").trim();
    const englishTest = fd.get("englishTest") as EnglishTest;
    const scoreStr = String(fd.get("testScore") ?? "").trim();
    const testScore =
      scoreStr === "" || englishTest === "none" ? null : Number(scoreStr);
    const savingsUsd = Number(fd.get("savingsUsd"));
    const goal = fd.get("goal") as Goal;
    const hasJobOffer = fd.get("hasJobOffer") === "on";

    setSubmitting(true);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nationality,
          targetRegion,
          age,
          education,
          yearsExperience,
          fieldOfWork,
          englishTest,
          testScore,
          savingsUsd,
          goal,
          hasJobOffer,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Request failed");
        setSubmitting(false);
        return;
      }
      if (!Array.isArray(data.pathways)) {
        setError("Unexpected response");
        setSubmitting(false);
        return;
      }
      sessionStorage.setItem(
        RESULT_STORAGE_KEY,
        JSON.stringify({
          overall_score: typeof data.overall_score === "number" ? data.overall_score : 0,
          summary: typeof data.summary === "string" ? data.summary : "",
          pathways: data.pathways,
          profileSummary: {
            nationality,
            targetRegion,
            age,
            education,
            yearsExperience,
            fieldOfWork,
            englishTest,
            testScore,
            savingsUsd,
            goal,
            hasJobOffer,
          },
        }),
      );
      const logEntry = {
        submittedAt: new Date().toISOString(),
        nationality,
        targetRegion,
        goal,
        fieldOfWork,
      };
      pushRecentSubmission(logEntry);
      router.push("/results");
    } catch {
      setError("Network error—try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-accent">
          Visa Eligibility Check
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Tell us about yourself
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Takes 3 quick steps. Gives you practical guidance based on government rules—not official legal advice.
        </p>
        
        {/* Quick 1-Click Client Presets */}
        <div className="mt-4 rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/40 p-3.5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <span>⚡</span> Try a Sample Profile (Instant Preview):
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Skip filling out the form</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {DEMO_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(preset.result));
                  router.push("/results");
                }}
                className="flex flex-col items-start rounded-lg border border-indigo-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-2.5 text-left shadow-xs transition hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-sm"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  <span>{preset.flag}</span>
                  <span className="truncate">{preset.title.split(" to ")[0]}</span>
                </div>
                <span className="mt-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 truncate w-full">
                  {preset.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        {selectedRegionLabel ? (
          <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-card px-3 py-2 text-sm text-slate-800 dark:text-slate-200">
            Selected region: <span className="font-semibold">{selectedRegionLabel}</span>
          </div>
        ) : null}
      </div>

      <div className="mb-6">
        <div className="mb-3 flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>
            Step {step} of {STEPS.length}
          </span>
          <span className="text-slate-700 dark:text-slate-300 font-semibold">{STEPS[step - 1]?.title}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-4 flex gap-2">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`flex-1 rounded-md border px-2 py-2 text-center text-xs transition-colors ${
                step === s.id
                  ? "border-accent bg-[var(--accent-soft)] text-indigo-950 dark:text-white font-semibold shadow-sm"
                  : step > s.id
                    ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-medium"
                    : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 font-medium"
              }`}
            >
              {s.short}
            </div>
          ))}
        </div>
      </div>

      <form
        id="visa-form"
        noValidate
        onSubmit={handleSubmit}
        onKeyDown={handleFormKeyDown}
        className="space-y-6"
      >
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-6 shadow-soft">
          {/* Keep all inputs mounted so final submit includes every field */}
          <div className={step === 1 ? "space-y-5" : "hidden"} aria-hidden={step !== 1}>
            <div>
              <label htmlFor="nationality" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Your nationality (passport country)
              </label>
              <select
                id="nationality"
                name="nationality"
                required
                defaultValue="Pakistan"
                className={inputClass}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="targetRegion" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Where do you want to move?
              </label>
              <select
                id="targetRegion"
                name="targetRegion"
                required
                value={targetRegionValue}
                onChange={(e) => setTargetRegionValue(e.target.value as TargetRegion)}
                className={inputClass}
              >
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {!CERTIFIED_TARGET_REGIONS.has(targetRegionValue) && (
                <p
                  data-testid="uncertified-region-notice"
                  className="mt-1.5 text-xs text-amber-700 dark:text-amber-400"
                >
                  Live scoring is currently ready for Canada, the UK, the USA, Germany/Northern Europe, and Australia/New Zealand. Other regions are not available for live scoring yet.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="age" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Your age
              </label>
              <input
                id="age"
                name="age"
                type="number"
                required
                min={18}
                max={80}
                defaultValue={28}
                className={inputClass}
              />
            </div>
          </div>

          <div className={step === 2 ? "space-y-5" : "hidden"} aria-hidden={step !== 2}>
            <div>
              <label htmlFor="education" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Highest education completed
              </label>
              <select
                id="education"
                name="education"
                required
                defaultValue="bachelor"
                className={inputClass}
              >
                <option value="high_school">High School</option>
                <option value="bachelor">Bachelor&apos;s Degree</option>
                <option value="master">Master&apos;s Degree</option>
                <option value="phd">PhD / Doctorate</option>
              </select>
            </div>
            <div>
              <label htmlFor="yearsExperience" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Years of skilled work experience
              </label>
              <input
                id="yearsExperience"
                name="yearsExperience"
                type="number"
                required
                min={0}
                max={60}
                defaultValue={4}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="fieldOfWork" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                What kind of work do you do?
              </label>
              <select
                id="fieldOfWork"
                name="fieldOfWork"
                required
                defaultValue="Software & IT"
                className={inputClass}
              >
                {FIELD_OF_WORK_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                id="hasJobOffer"
                name="hasJobOffer"
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-accent focus:ring-accent"
              />
              <span>I already have a job offer in that country</span>
            </label>
          </div>

          <div className={step === 3 ? "space-y-5" : "hidden"} aria-hidden={step !== 3}>
            <div>
              <label htmlFor="englishTest" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                English language test
              </label>
              <select
                id="englishTest"
                name="englishTest"
                required
                defaultValue="none"
                className={inputClass}
              >
                <option value="none">No test yet</option>
                <option value="ielts">IELTS</option>
                <option value="toefl">TOEFL</option>
              </select>
            </div>
            <div>
              <label htmlFor="testScore" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Your test score <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span>
              </label>
              <input
                id="testScore"
                name="testScore"
                type="number"
                min={0}
                max={120}
                step={0.5}
                placeholder="Example: 7.5 for IELTS or 100 for TOEFL"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Leave blank if you haven&apos;t taken a test yet. Enter your overall IELTS score (0–9) or TOEFL score (0–120).
              </p>
            </div>
            <div>
              <label htmlFor="savingsUsd" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Available savings (in US Dollars)
              </label>
              <input
                id="savingsUsd"
                name="savingsUsd"
                type="number"
                required
                min={0}
                step={100}
                defaultValue={12000}
                className={inputClass}
              />
            </div>
            <fieldset>
              <legend className="text-sm font-medium text-slate-800 dark:text-slate-200">What is your main goal?</legend>
              <div className="mt-3 flex flex-col gap-2">
                {(
                  [
                    { value: "work" as const, label: "Work Visa (move for a job)" },
                    { value: "study" as const, label: "Student Visa (study abroad)" },
                    { value: "pr" as const, label: "Stay Long-Term (Permanent Residency / PR)" },
                  ] as const
                ).map((g) => (
                  <label
                    key={g.value}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 has-[:checked]:border-accent dark:has-[:checked]:border-indigo-500 has-[:checked]:bg-[var(--accent-soft)] transition-colors"
                  >
                    <input
                      type="radio"
                      name="goal"
                      value={g.value}
                      defaultChecked={g.value === "pr"}
                      required
                      className="h-4 w-4 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-accent focus:ring-accent"
                    />
                    {g.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        {error ? (
          <p data-testid="form-error" className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="order-3 text-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 sm:order-1 sm:text-left transition-colors"
          >
            ← Home
          </Link>
          <div className="order-1 flex w-full gap-2 sm:order-2 sm:w-auto sm:justify-end">
            {step > 1 ? (
              <button
                type="button"
                onClick={back}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors sm:flex-none"
              >
                Back
              </button>
            ) : null}
            {step < 3 ? (
              <button
                type="button"
                onClick={next}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-accent px-5 text-sm font-medium text-white shadow-soft hover:bg-indigo-600 sm:flex-none transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                onClick={() => {
                  submitByButtonRef.current = true;
                }}
                disabled={submitting}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-accent px-5 text-sm font-medium text-white shadow-soft hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none transition-colors"
              >
                {submitting ? "Checking…" : "Check My Chances"}
              </button>
            )}
          </div>
        </div>
      </form>
    </main>
  );
}
