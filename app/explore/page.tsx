"use client";

import Link from "next/link";
import { REGIONS } from "@/lib/regions";
import { useMemo, useState } from "react";

function toneForCost(value: "Low" | "Medium" | "High") {
  if (value === "Low") return "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400";
  if (value === "Medium") return "border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400";
  return "border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400";
}

function toneForDifficulty(value: "Easy" | "Medium" | "Hard") {
  if (value === "Easy") return "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400";
  if (value === "Medium") return "border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400";
  return "border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400";
}

function toneForSpeed(value: "Fast" | "Medium" | "Slow") {
  if (value === "Fast") return "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400";
  if (value === "Medium") return "border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400";
  return "border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400";
}

type GoalFilter = "Any" | "Work" | "Study" | "PR";
type BudgetFilter = "Any" | "Low" | "Medium" | "High";
type DifficultyFilter = "Any" | "Easy" | "Medium" | "Hard";

function matchesGoal(goal: GoalFilter, regionText: string): boolean {
  if (goal === "Any") return true;
  if (goal === "Work") return /(work|job|employer|sponsor|employment)/i.test(regionText);
  if (goal === "Study") return /(study|student|graduate|university|post-study)/i.test(regionText);
  return /(pr|permanent residen|stay permanently|permanent stay|citizenship|long-term)/i.test(regionText);
}

export default function ExplorePage() {
  const [goal, setGoal] = useState<GoalFilter>("Any");
  const [budget, setBudget] = useState<BudgetFilter>("Any");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("Any");

  const cards = useMemo(() => {
    return REGIONS.map((region) => {
      const regionText = [
        region.name,
        region.shortDescription,
        region.bestFor,
        ...region.pros,
        ...region.cons,
      ].join(" ");
      const goalMatch = matchesGoal(goal, regionText);
      const budgetMatch = budget === "Any" || region.cost === budget;
      const difficultyMatch =
        difficulty === "Any" || region.difficulty === difficulty;
      const isMatch = goalMatch && budgetMatch && difficultyMatch;
      return { region, isMatch };
    });
  }, [goal, budget, difficulty]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-accent">
          Explore
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Explore Visa Options by Region
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
          Compare how expensive, tough, and fast each region is before you check your personal visa chances.
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-4xl gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-4 shadow-soft sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-800 dark:text-slate-200">Your Main Goal</span>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value as GoalFilter)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-accent focus:ring-4 focus:ring-[var(--ring)]"
          >
            <option value="Any">Any Goal</option>
            <option value="Work">Work Visa</option>
            <option value="Study">Study Abroad</option>
            <option value="PR">Stay Long-Term (PR)</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-800 dark:text-slate-200">Moving Budget</span>
          <select
            value={budget}
            onChange={(e) => setBudget(e.target.value as BudgetFilter)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-accent focus:ring-4 focus:ring-[var(--ring)]"
          >
            <option value="Any">Any Budget</option>
            <option value="Low">Low Cost</option>
            <option value="Medium">Medium Cost</option>
            <option value="High">High Cost</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-800 dark:text-slate-200">Visa Difficulty</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as DifficultyFilter)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-accent focus:ring-4 focus:ring-[var(--ring)]"
          >
            <option value="Any">Any Difficulty</option>
            <option value="Easy">Easier to Qualify</option>
            <option value="Medium">Moderate</option>
            <option value="Hard">Harder / Competitive</option>
          </select>
        </label>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ region, isMatch }) => (
          <article
            key={region.id}
            className={`flex h-full flex-col rounded-2xl border bg-card p-5 shadow-soft transition-all ${
              isMatch
                ? "border-accent ring-2 ring-accent/40"
                : "border-slate-200 dark:border-slate-800 opacity-45 saturate-50"
            }`}
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{region.name}</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {region.countries.join(", ")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {region.shortDescription}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneForCost(region.cost)}`}
              >
                Cost: {region.cost}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneForDifficulty(region.difficulty)}`}
              >
                Difficulty: {region.difficulty}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneForSpeed(region.speed)}`}
              >
                Speed: {region.speed}
              </span>
            </div>

            <div className="mt-4 text-sm">
              <p className="text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">Best for:</span>{" "}
                {region.bestFor}
              </p>
            </div>

            <details className="mt-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-800 dark:text-slate-200">
                Pros &amp; Cons
              </summary>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">Pros</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700 dark:text-slate-300">
                    {region.pros.map((pro) => (
                      <li key={pro}>{pro}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-rose-700 dark:text-rose-400">Cons</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700 dark:text-slate-300">
                    {region.cons.map((con) => (
                      <li key={con}>{con}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>

            <div className="mt-5 pt-1">
              <Link
                href={`/form?region=${encodeURIComponent(region.id)}`}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-white transition hover:bg-indigo-600"
              >
                Check My Chances
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
