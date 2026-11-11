import { z } from "zod";
import type { Evidence, DataFreshness, CitationValidationResult, ConflictDetectionResult, Citation, EnglishTest } from "./types";

const REGIONS = [
  "canada",
  "uk",
  "australia-new-zealand",
  "germany-nordics",
  "southern-europe",
  "middle-east",
  "usa",
  "sg-my",
  "jp-kr",
  "easy-entry",
  "latam",
  "eastern-europe",
  "greater-china",
  "africa",
] as const;
const EDUCATION = ["high_school", "bachelor", "master", "phd"] as const;
const ENGLISH = ["none", "ielts", "toefl"] as const;
const GOALS = ["work", "study", "pr"] as const;

export const profileSchema = z
  .object({
    nationality: z
      .string()
      .trim()
      .min(1, "nationality is required")
      .max(60, "nationality too long")
      .regex(/^[a-zA-Z\u00C0-\u024F\s'\-.]+$/, "Invalid characters in nationality"),
    targetRegion: z.enum(REGIONS),
    age: z.coerce.number().int().min(18).max(80),
    education: z.enum(EDUCATION),
    yearsExperience: z.coerce.number().int().min(0).max(60),
    fieldOfWork: z
      .string()
      .trim()
      .min(1, "fieldOfWork is required")
      .max(60, "fieldOfWork too long")
      .regex(/^[a-zA-Z0-9\s,.\-&/]+$/, "Invalid characters in field of work"),
    englishTest: z.enum(ENGLISH),
    testScore: z.coerce.number().nullable().optional(),
    savingsUsd: z.coerce.number().min(0).max(50_000_000),
    goal: z.enum(GOALS),
    hasJobOffer: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.testScore == null || val.englishTest === "none") return;
    if (!Number.isFinite(val.testScore)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["testScore"],
        message: "Test score must be a valid number",
      });
      return;
    }
    if (val.englishTest === "ielts" && (val.testScore < 0 || val.testScore > 9)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["testScore"],
        message: "IELTS band score must be between 0 and 9",
      });
    }
    if (val.englishTest === "toefl" && (val.testScore < 0 || val.testScore > 120)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["testScore"],
        message: "TOEFL total score must be between 0 and 120",
      });
    }
  });

export function parseOptionalTestScore(
  englishTest: EnglishTest,
  raw: unknown,
): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (englishTest === "none") return null;
  if (englishTest === "ielts") return Math.min(9, Math.max(0, n));
  return Math.min(120, Math.max(0, n));
}

export function evaluateFreshness(evidence: Evidence): DataFreshness {
  const now = new Date();
  
  if (evidence.effective_until) {
    const expiration = new Date(evidence.effective_until);
    if (now > expiration) {
      return "EXPIRED";
    }
  }

  // If we retrieved it more than 180 days ago and it has no explicit expiration, flag it as stale
  const retrieved = new Date(evidence.retrieved_at);
  const msIn180Days = 180 * 24 * 60 * 60 * 1000;
  
  if (now.getTime() - retrieved.getTime() > msIn180Days) {
    return "STALE";
  }

  return "VERIFIED";
}

export function detectConflicts(evidenceList: Evidence[]): ConflictDetectionResult[] {
  const results: ConflictDetectionResult[] = [];
  
  // Group by claim type
  const groups: Record<string, Evidence[]> = {};
  for (const e of evidenceList) {
    const key = `${e.claim_type}-${e.country}-${e.pathway || "general"}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }

  for (const key in groups) {
    const group = groups[key];
    if (group.length <= 1) continue;

    // Check if the contents (or hashes) differ significantly between items of the same claim.
    // In a real system, you'd extract the exact numeric value (e.g. $10,000 vs $12,000).
    // Here we just check if content_hash differs across the group.
    const firstHash = group[0].content_hash;
    const hasConflict = group.some(e => e.content_hash !== firstHash);
    
    if (hasConflict) {
      // User preference: Do not throw an error. Resolve by preferring the highest authority tier (lowest number),
      // then by freshness (most recently retrieved).
      const sorted = [...group].sort((a, b) => {
        if (a.authority_tier !== b.authority_tier) {
          return a.authority_tier - b.authority_tier;
        }
        return new Date(b.retrieved_at).getTime() - new Date(a.retrieved_at).getTime();
      });

      results.push({
        hasConflict: true,
        conflictingClaims: group,
        resolvedEvidence: sorted[0],
        message: `Conflict detected for ${key}. Resolved by trusting Tier ${sorted[0].authority_tier} source over others.`
      });
    }
  }

  return results;
}

export function validateCitations(llmCitations: Citation[], providedEvidence: Evidence[]): CitationValidationResult {
  const errors: string[] = [];

  for (const citation of llmCitations) {
    // Look for a matching URL in the evidence provided to the LLM
    const matchedEvidence = providedEvidence.find(
      e => e.source_url.toLowerCase() === citation.url.toLowerCase() || 
           e.source_title.toLowerCase().includes(citation.title.toLowerCase())
    );

    if (!matchedEvidence) {
      errors.push(`Citation mismatch: The LLM cited '${citation.title}' (${citation.url}) which was NOT in the provided evidence. Potential hallucination.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
