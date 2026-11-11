"use client";

import { useRouter } from "next/navigation";
import { RESULT_STORAGE_KEY } from "@/lib/storage";

export function RecentAssessmentCard({ 
  item, 
  children 
}: { 
  item: any; 
  children: React.ReactNode 
}) {
  const router = useRouter();

  const handleClick = () => {
    // Rehydrate the stored result format completely so timeline, breakdown, and strengths survive reload
    const storedData = {
      overall_score: typeof item.result?.overall_score === "number" ? item.result.overall_score : 0,
      summary: typeof item.result?.summary === "string" ? item.result.summary : "",
      profileSummary: item.profile,
      pathways: (item.result?.pathways || []).map((p: any, idx: number) => ({
        ...p,
        pathwayId: p.pathwayId || `saved-pathway-${idx}`,
        baseScore: typeof p.baseScore === "number" ? p.baseScore : (typeof p.score === "number" ? p.score : 0),
        maxScore: typeof p.maxScore === "number" ? p.maxScore : 100,
        status: p.status || "CONDITIONALLY_ELIGIBLE",
        satisfiedRequirements: Array.isArray(p.satisfiedRequirements) ? p.satisfiedRequirements : [],
        missingRequirements: Array.isArray(p.missingRequirements) ? p.missingRequirements : [],
        blockingRequirements: Array.isArray(p.blockingRequirements) ? p.blockingRequirements : [],
        marginalImprovements: Array.isArray(p.marginalImprovements) ? p.marginalImprovements : [],
      })),
    };
    
    sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(storedData));
    router.push("/results");
  };

  return (
    <li 
      onClick={handleClick} 
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-soft cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors"
    >
      {children}
    </li>
  );
}
