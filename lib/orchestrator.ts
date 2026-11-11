import type { VisaProfile, ScoreResponse, RankedPathway, Evidence, EligibilityStatus } from "./types";
import { normalizeProfile } from "./profile";
import { getPathwaysForRegion } from "./domain";
import { buildAIOrchestratorPrompt } from "./ai";
import { retrieveEvidence, EvidenceUnavailableError } from "./evidence";
import { detectConflicts } from "./validation";
import { TraceContext } from "./trace";
import { log } from "./logger";
import { withRetry, RetryableError } from "./retry";
import { openAiCircuitBreaker } from "./circuit-breaker";
import { evaluatePathwayForProfile, sanitizeCitationsForPathway } from "./evaluator";

function safeJsonParse(input: string): { pathways: any[], summary: string } | null {
  try {
    const parsed = JSON.parse(input);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function runVisaAssessment(profile: VisaProfile, requestId: string): Promise<{ response: ScoreResponse, trace: TraceContext, evidenceList: Evidence[] }> {
  const trace = new TraceContext(requestId);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  let finalResponse: ScoreResponse | null = null;
  let modelUsed = "gpt-4o-mini";
  
  try {
    const normalizedProfile = normalizeProfile(profile);
    const pathways = getPathwaysForRegion(profile.targetRegion);
    
    // Phase 1: Evidence Grounding (Retrieval)
    // Pass undefined as pathwayId (NULL to match_evidence_v2) so all verified pathways in the region can be retrieved
    const evidenceList = await trace.runStep("retrieveEvidence", async () => {
      return await retrieveEvidence(profile, normalizedProfile, undefined, 12);
    });
    
    // FAIL CLOSED: Never run scoring if verified human-reviewed evidence is unavailable
    if (!evidenceList || evidenceList.length === 0) {
      log("warn", "assessment_stopped_no_verified_evidence", {
        requestId,
        targetRegion: profile.targetRegion,
      });
      throw new EvidenceUnavailableError(
        `Assessment unavailable: No certified, human-reviewed official evidence found for target region "${profile.targetRegion}". Automated scoring stopped to prevent ungrounded legal determinations.`,
        "NO_VERIFIED_EVIDENCE"
      );
    }

    trace.recordRetrieval(evidenceList.map(e => e.source_id));
    const conflicts = detectConflicts(evidenceList);
    if (conflicts.length > 0) {
      log("info", "evidence_conflicts_detected", {
        requestId,
        targetRegion: profile.targetRegion,
        conflictCount: conflicts.length,
        messages: conflicts.map((c) => c.message),
      });
    }
    
    // Phase 2: AI Synthesizer (Single Pass, Strict JSON)
    const currentPrompt = buildAIOrchestratorPrompt(normalizedProfile, pathways, evidenceList);
    let parsedAIResponse: any = null;
    let approved = false;
    
    // Check Circuit Breaker before starting AI loop
    if (await openAiCircuitBreaker.isOpen()) {
      log("warn", "circuit_breaker_open_skipping_ai", { requestId });
    } else {
      const text = await trace.runStep(`synthesize_iteration`, async () => {
        return await withRetry(async () => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 25_000);
          try {
            const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
              signal: controller.signal,
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({
                model: modelUsed,
                temperature: 0.2,
                max_tokens: 2400,
                response_format: { type: "json_schema", json_schema: { name: "visa_analysis", schema: {
                  type: "object", additionalProperties: false, required: ["summary", "pathways"],
                  properties: {
                    summary: { type: "string" },
                    pathways: {
                      type: "array", minItems: 1, items: {
                        type: "object", additionalProperties: false, required: [
                          "name", "country", "baseScore", "reason", "weaknesses", "documents", "next_steps", "citations", "estimated_timeline", "top_improvement", "eligibilityStatus", "source_freshness"
                        ], properties: {
                          name: { type: "string" }, country: { type: "string" }, baseScore: { type: "number" }, reason: { type: "string" }, weaknesses: { type: "array", items: { type: "string" } }, documents: { type: "array", items: { type: "string" } }, next_steps: { type: "array", items: { type: "string" } }, citations: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "url"], properties: { title: { type: "string" }, url: { type: "string" } } } }, estimated_timeline: { type: "string" }, top_improvement: { type: "string" }, eligibilityStatus: { type: "string" }, source_freshness: { type: "string", enum: ["VERIFIED", "STALE", "UNKNOWN"] }
                        }
                      }
                    }
                  }
                }}},
                messages: [{ role: "user", content: currentPrompt }],
              }),
            });
            
            if (!openaiRes.ok) {
              if (openaiRes.status === 429) {
                const retryAfter = openaiRes.headers.get("Retry-After");
                const ms = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
                throw new RetryableError("Rate limited by OpenAI", ms);
              }
              throw new Error(await openaiRes.text());
            }
            const resJson = await openaiRes.json();
            trace.recordModelInfo(modelUsed, resJson.usage?.prompt_tokens || 0, resJson.usage?.completion_tokens || 0);
            await openAiCircuitBreaker.recordSuccess();
            return resJson.choices?.[0]?.message?.content?.trim() ?? "";
          } catch (err: any) {
            if (err.name !== "RetryableError" && err.name !== "AbortError") {
              await openAiCircuitBreaker.recordFailure();
            }
            throw err;
          } finally {
            clearTimeout(timer);
          }
        }, { attempts: 3, baseDelayMs: 1000 });
      });

      parsedAIResponse = safeJsonParse(text);
      if (parsedAIResponse) {
        approved = true;
      }
    }

    if (!approved) {
      log("warn", "agent_exhausted_retries", { requestId });
      throw new EvidenceUnavailableError(
        "Assessment unavailable: AI evaluation could not safely verify eligibility against official evidence.",
        "SYNTHESIS_FAILED"
      );
    }

    // Calculate profile metrics for diagnostic breakdown (never used as fallback eligibility score)
    const eduScore = profile.education === "phd" ? 28 : profile.education === "master" ? 24 : profile.education === "bachelor" ? 16 : 8;
    const expScore = profile.yearsExperience >= 8 ? 24 : profile.yearsExperience >= 5 ? 20 : profile.yearsExperience >= 3 ? 15 : profile.yearsExperience >= 1 ? 8 : 0;
    const savingsScore = profile.savingsUsd >= 50000 ? 24 : profile.savingsUsd >= 25000 ? 18 : profile.savingsUsd >= 10000 ? 12 : profile.savingsUsd >= 5000 ? 6 : 0;
    const langScore = profile.englishTest !== "none" ? 20 : 0;
    
    const profileStrength = Math.min(100, Math.round(((eduScore + expScore) / 52) * 100));
    const competitiveness = Math.min(100, Math.round(((langScore + expScore + savingsScore) / 68) * 100));

    const VALID_STATUSES = new Set<EligibilityStatus>([
      "ELIGIBLE",
      "LIKELY_ELIGIBLE",
      "CONDITIONALLY_ELIGIBLE",
      "BLOCKED",
      "INSUFFICIENT_EVIDENCE",
    ]);

    const finalPathways: RankedPathway[] = parsedAIResponse.pathways.map((aiData: any) => {
      const detEval = evaluatePathwayForProfile({
        aiName: String(aiData.name || ""),
        aiCountry: String(aiData.country || ""),
        regionPathways: pathways,
        profile: normalizedProfile,
        evidenceList,
      });

      const { citations, invalidUrls } = sanitizeCitationsForPathway(
        Array.isArray(aiData.citations) ? aiData.citations : [],
        evidenceList,
        String(aiData.country || ""),
        String(aiData.name || "")
      );

      if (invalidUrls.length > 0) {
        trace.recordValidationFailure(
          `Stripped unverified citations for ${aiData.name}: ${invalidUrls.join(", ")}`
        );
        log("warn", "stripped_unverified_citations", {
          requestId,
          pathway: aiData.name,
          invalidUrls,
        });
      }

      const effectiveBaseScore = typeof aiData.baseScore === "number" && Number.isFinite(aiData.baseScore)
        ? Math.min(100, Math.max(0, Math.round(aiData.baseScore)))
        : 0;

      const rawStatus = typeof aiData.eligibilityStatus === "string"
        ? aiData.eligibilityStatus.trim().toUpperCase()
        : "";
      let resolvedStatus: EligibilityStatus = VALID_STATUSES.has(rawStatus as EligibilityStatus)
        ? (rawStatus as EligibilityStatus)
        : (effectiveBaseScore >= 70 ? "ELIGIBLE" : effectiveBaseScore >= 45 ? "CONDITIONALLY_ELIGIBLE" : "BLOCKED");

      if (detEval.matchedDomain && detEval.blockingRequirements.length > 0) {
        const onlySponsorshipBlocker = detEval.blockingRequirements.every((b) =>
          b.id === "req-uk-sponsor" ||
          b.id === "req-uk-salary" ||
          b.id === "req-us-sponsor" ||
          b.id === "req-de-job"
        );
        if (!onlySponsorshipBlocker || effectiveBaseScore < 50) {
          resolvedStatus = "BLOCKED";
        } else if (resolvedStatus === "ELIGIBLE" || resolvedStatus === "LIKELY_ELIGIBLE") {
          resolvedStatus = "CONDITIONALLY_ELIGIBLE";
        }
      }

      return {
        pathwayId: detEval.pathwayId,
        name: aiData.name,
        country: aiData.country,
        status: resolvedStatus,
        baseScore: effectiveBaseScore,
        maxScore: 100,
        scoreBreakdown: { 
          eligibilityFit: effectiveBaseScore, 
          profileStrength, 
          evidenceQuality: detEval.scoreBreakdown.evidenceQuality || 95, 
          competitiveness 
        },
        satisfiedRequirements: detEval.satisfiedRequirements,
        missingRequirements: detEval.missingRequirements,
        blockingRequirements: detEval.blockingRequirements,
        marginalImprovements: detEval.marginalImprovements,
        topWhatIfScenario: detEval.topWhatIfScenario,
        reason: aiData.reason, 
        weaknesses: Array.isArray(aiData.weaknesses) ? aiData.weaknesses : [], 
        documents: Array.isArray(aiData.documents) ? aiData.documents : [],
        next_steps: Array.isArray(aiData.next_steps) ? aiData.next_steps : [], 
        citations, 
        estimated_timeline: aiData.estimated_timeline,
        top_improvement: aiData.top_improvement || detEval.marginalImprovements[0]?.actionName || "",
        source_freshness: (aiData.source_freshness || "VERIFIED") as RankedPathway["source_freshness"],
      };
    }).sort((a: RankedPathway, b: RankedPathway) => b.baseScore - a.baseScore);

    const overallScore = finalPathways.length > 0 
      ? Math.round(finalPathways.reduce((sum: number, e: RankedPathway) => sum + e.baseScore, 0) / finalPathways.length)
      : 0;

    finalResponse = {
      overall_score: overallScore,
      summary: parsedAIResponse.summary,
      pathways: finalPathways
    };

    trace.complete("success");
    return { response: finalResponse, trace, evidenceList };

  } catch (error) {
    trace.complete("error");
    throw error;
  }
}
