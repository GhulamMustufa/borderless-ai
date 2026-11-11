import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  listRecentSubmissions,
  countMonthlySubmissions,
  getUserSubscription,
} from "@/lib/persistence";
import { FREE_MONTHLY_LIMIT, PLANS } from "@/lib/stripe";
import { RecentAssessmentCard } from "./RecentAssessmentCard";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
      : score >= 40
        ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60"
        : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums ${color}`}>
      {score}%
    </span>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { upgrade?: string };
}) {
  const user = await currentUser();
  const { userId } = await auth();

  if (!user || !userId) redirect("/");

  const [subscription, recentItems, monthlyUsed] = await Promise.all([
    getUserSubscription(userId),
    listRecentSubmissions({ userId, limit: 10 }),
    countMonthlySubmissions(userId),
  ]);

  const isPro = subscription?.plan === "pro" && subscription?.status === "active";
  const plan = isPro ? PLANS.pro : PLANS.free;
  const usagePercent = isPro ? 0 : Math.min(100, (monthlyUsed / FREE_MONTHLY_LIMIT) * 100);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {searchParams.upgrade === "success" && (
        <div className="mb-6 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/50 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
          You&apos;re now on Pro. Unlimited visa checks are unlocked.
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-accent">Dashboard</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.emailAddresses[0]?.emailAddress || ""}</p>
        </div>
        <Link
          href="/form"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-6 text-sm font-medium text-white shadow-soft transition hover:bg-indigo-600"
        >
          New visa check
        </Link>
      </div>

      {/* Subscription card */}
      <div className="mb-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Your Plan</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-lg font-semibold text-slate-900 dark:text-white">{plan.name}</span>
              {isPro && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-white">
                  Active
                </span>
              )}
            </div>
            {!isPro && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {monthlyUsed} / {FREE_MONTHLY_LIMIT} visa checks used this month
              </p>
            )}
            {isPro && subscription?.currentPeriodEnd && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>

          {!isPro ? (
            <form action="/api/create-checkout" method="POST">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-5 text-sm font-medium text-white shadow-soft hover:bg-indigo-600 transition-colors"
              >
                Upgrade to Pro — $9/mo
              </button>
            </form>
          ) : (
            <form action="/api/create-portal" method="POST">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Manage billing
              </button>
            </form>
          )}
        </div>

        {!isPro && (
          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Pro gives you unlimited visa checks + priority support.
            </p>
          </div>
        )}
      </div>

      {/* Recent assessments */}
      <div>
        <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Your recent visa checks</h2>

        {recentItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-12 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">You haven&apos;t run any visa checks yet.</p>
            <Link
              href="/form"
              className="mt-3 inline-flex h-9 items-center justify-center rounded-md bg-accent px-4 text-xs font-medium text-white hover:bg-indigo-600"
            >
              Start your first check
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {recentItems.map((item) => {
              const firstPathway = item.result.pathways[0] as any;
              const rawTopScore =
                typeof firstPathway?.baseScore === "number"
                  ? firstPathway.baseScore
                  : typeof firstPathway?.score === "number"
                    ? firstPathway.score
                    : 0;
              const topScore = Math.min(100, Math.max(0, Math.round(rawTopScore)));
              const topName = firstPathway?.name ?? "—";

              const avgScore =
                item.result.pathways.length > 0
                  ? Math.round(
                      item.result.pathways.reduce((s, p) => {
                        const raw =
                          typeof (p as any).baseScore === "number"
                            ? (p as any).baseScore
                            : typeof p.score === "number"
                              ? p.score
                              : 0;
                        return s + Math.min(100, Math.max(0, raw));
                      }, 0) / item.result.pathways.length,
                    )
                  : topScore;
              return (
                <RecentAssessmentCard key={item.id} item={item}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                        {" · "}
                        {item.profile.goal === "pr" ? "Permanent Stay (PR)" : item.profile.goal === "work" ? "Work" : "Study"}
                        {" · "}
                        {item.profile.targetRegion}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {topName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Average across {item.result.pathways.length} visa options
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ScoreBadge score={topScore} />
                      <span className="text-xs text-slate-400 dark:text-slate-500">best</span>
                      <ScoreBadge score={avgScore} />
                      <span className="text-xs text-slate-400 dark:text-slate-500">avg</span>
                    </div>
                  </div>
                </RecentAssessmentCard>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
