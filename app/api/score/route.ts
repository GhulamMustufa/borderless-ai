import { NextResponse } from "next/server";
import type { VisaProfile } from "@/lib/types";
import { profileSchema, parseOptionalTestScore } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { createRequestId, log } from "@/lib/logger";
import { runVisaAssessment } from "@/lib/orchestrator";
import { EvidenceUnavailableError } from "@/lib/evidence";
import {
  persistSubmission,
  countMonthlySubmissions,
  getUserSubscription,
} from "@/lib/persistence";
import { auth } from "@clerk/nextjs/server";
import { FREE_MONTHLY_LIMIT } from "@/lib/stripe";

export async function POST(req: Request) {
  const startedAt = Date.now();
  const requestId = createRequestId();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    log("warn", "rate_limited", { requestId, ip, retryAfterMs: rate.retryAfterMs });
    return NextResponse.json(
      { error: "Too many requests. Please retry shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
      },
    );
  }

  const { userId } = await auth();

  if (userId) {
    const subscription = await getUserSubscription(userId);
    const isPro = subscription?.plan === "pro" && subscription.status === "active";
    if (!isPro) {
      const used = await countMonthlySubmissions(userId);
      if (used >= FREE_MONTHLY_LIMIT) {
        return NextResponse.json(
          {
            error: `Free plan limit reached (${FREE_MONTHLY_LIMIT} assessments/month). Upgrade to Pro.`,
            upgradeRequired: true,
          },
          { status: 402 },
        );
      }
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = profileSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const d = validation.data;
  const profile: VisaProfile = {
    nationality: d.nationality,
    targetRegion: d.targetRegion,
    age: Math.round(d.age),
    education: d.education,
    yearsExperience: Math.round(d.yearsExperience),
    fieldOfWork: d.fieldOfWork,
    englishTest: d.englishTest,
    testScore: parseOptionalTestScore(d.englishTest, d.testScore),
    savingsUsd: Math.round(d.savingsUsd),
    goal: d.goal,
    ...(d.hasJobOffer !== undefined ? { hasJobOffer: d.hasJobOffer } : {}),
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  const promptVersion = "visa-prompt-v7-agentic";
  const modelUsed = "gpt-4o-mini";

  try {
    const { response, evidenceList } = await runVisaAssessment(profile, requestId);

    try {
      await persistSubmission({
        requestId,
        ip,
        userId: userId ?? null,
        promptVersion,
        model: modelUsed,
        profile,
        sources: evidenceList.map(e => e.source_id),
        result: {
          overall_score: response.overall_score,
          summary: response.summary,
          pathways: response.pathways.map(p => ({
            pathwayId: p.pathwayId,
            name: p.name,
            country: p.country,
            score: p.baseScore,
            baseScore: p.baseScore,
            status: p.status,
            scoreBreakdown: p.scoreBreakdown,
            satisfiedRequirements: p.satisfiedRequirements,
            missingRequirements: p.missingRequirements,
            blockingRequirements: p.blockingRequirements,
            marginalImprovements: p.marginalImprovements,
            reason: p.reason,
            weaknesses: p.weaknesses,
            documents: p.documents,
            next_steps: p.next_steps,
            citations: p.citations,
            estimated_timeline: p.estimated_timeline,
            top_improvement: p.top_improvement,
            source_freshness: p.source_freshness,
          })),
        },
        latencyMs: Date.now() - startedAt,
      });
    } catch (err) {
      log("warn", "score_persist_failed", { requestId, ip, promptVersion, modelUsed, details: String(err) });
    }

    log("info", "score_request_completed", { requestId, ip, modelUsed, promptVersion, latencyMs: Date.now() - startedAt });
    return NextResponse.json(response);

  } catch (error) {
    if (error instanceof EvidenceUnavailableError) {
      log("warn", "score_request_evidence_unavailable", {
        requestId,
        ip,
        code: error.code,
        message: error.message,
      });
      return NextResponse.json(
        {
          error: "Assessment unavailable: Reliable, human-verified immigration evidence is not available for this pathway. Automated scoring has been stopped to ensure accurate legal guidance.",
          code: error.code,
          details: error.message,
        },
        { status: 503 }
      );
    }
    log("error", "score_request_pipeline_failure", { requestId, ip, error: (error as Error).message });
    return NextResponse.json({ error: "An error occurred during evaluation." }, { status: 500 });
  }
}
