"use client";

import { useEffect, useMemo, useState } from "react";
import type { Goal, TargetRegion, VisaProfile } from "@/lib/types";

type HistoryPathway = {
  name: string;
  country: string;
  score?: number;
  baseScore?: number;
};

type HistoryItem = {
  id: number;
  requestId: string;
  createdAt: string;
  promptVersion: string;
  model: string;
  profile: VisaProfile;
  result: { pathways: HistoryPathway[] };
};

const REGIONS: Array<{ value: TargetRegion; label: string }> = [
  { value: "canada", label: "Canada" },
  { value: "uk", label: "UK" },
  { value: "australia-new-zealand", label: "Australia/New Zealand" },
  { value: "germany-nordics", label: "Germany/Northern Europe" },
  { value: "southern-europe", label: "Southern Europe" },
  { value: "middle-east", label: "Middle East" },
  { value: "usa", label: "USA" },
  { value: "sg-my", label: "Singapore/Malaysia" },
  { value: "jp-kr", label: "Japan/South Korea" },
  { value: "easy-entry", label: "Easy Entry Countries" },
  { value: "latam", label: "Latin America" },
  { value: "eastern-europe", label: "Eastern Europe & Caucasus" },
  { value: "greater-china", label: "Greater China" },
  { value: "africa", label: "Africa" },
];

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goal, setGoal] = useState<"" | Goal>("");
  const [region, setRegion] = useState<"" | TargetRegion>("");
  const [compareIds, setCompareIds] = useState<number[]>([]);

  useEffect(() => {
    let ignore = false;
    async function run() {
      setLoading(true);
      setError(null);
      const q = new URLSearchParams();
      q.set("limit", "40");
      if (goal) q.set("goal", goal);
      if (region) q.set("region", region);
      const res = await fetch(`/api/history?${q.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (ignore) return;
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to load history");
        setItems([]);
      } else {
        setItems(Array.isArray(data.items) ? data.items : []);
      }
      setLoading(false);
    }
    run().catch(() => {
      if (!ignore) {
        setError("Failed to load history");
        setLoading(false);
      }
    });
    return () => {
      ignore = true;
    };
  }, [goal, region]);

  const compareItems = useMemo(
    () => items.filter((i) => compareIds.includes(i.id)).slice(0, 2),
    [items, compareIds],
  );

  function avgScore(item: HistoryItem): number {
    if (!item.result.pathways.length) return 0;
    return Math.round(
      item.result.pathways.reduce((sum, p: any) => sum + Number(p.baseScore ?? p.score ?? 0), 0) /
        item.result.pathways.length,
    );
  }

  function toggleCompare(id: number) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Your saved visa checks</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Filter by goal or region, and pick any two checks to compare side-by-side.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <select
          value={goal}
          onChange={(e) => setGoal((e.target.value || "") as "" | Goal)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-accent"
        >
          <option value="">All goals</option>
          <option value="work">Work Visa</option>
          <option value="study">Student Visa</option>
          <option value="pr">Permanent Stay (PR)</option>
        </select>
        <select
          value={region}
          onChange={(e) => setRegion((e.target.value || "") as "" | TargetRegion)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-accent"
        >
          <option value="">All regions</option>
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <p className="self-center text-sm text-slate-500 dark:text-slate-400">Selected to compare: {compareIds.length}/2</p>
      </div>

      {compareItems.length === 2 ? (
        <div className="mb-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-card p-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Side-by-side comparison</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {compareItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(item.createdAt).toLocaleString()} -{" "}
                  {item.profile.goal === "pr" ? "Permanent Stay (PR)" : item.profile.goal === "work" ? "Work" : "Study"} -{" "}
                  {item.profile.targetRegion}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  Average score: {avgScore(item)}%
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Best visa option: {item.result.pathways[0]?.name ?? "N/A"} (
                  {item.result.pathways[0]?.baseScore ?? item.result.pathways[0]?.score ?? 0}%)
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">
            Score difference: {avgScore(compareItems[0]) - avgScore(compareItems[1])} points
          </p>
        </div>
      ) : null}

      {loading ? <p className="text-sm text-slate-600 dark:text-slate-400">Loading your saved checks...</p> : null}
      {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
      {!loading && !error && items.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">You don&apos;t have any saved visa checks yet.</p>
      ) : null}

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {item.profile.nationality} -{" "}
                  {item.profile.goal === "pr" ? "Permanent Stay (PR)" : item.profile.goal === "work" ? "Work" : "Study"} -{" "}
                  {item.profile.targetRegion}
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Average score: {avgScore(item)}% · {item.result.pathways.length} visa options checked
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleCompare(item.id)}
                className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors ${
                  compareIds.includes(item.id)
                    ? "border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {compareIds.includes(item.id) ? "Selected" : "Compare"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
