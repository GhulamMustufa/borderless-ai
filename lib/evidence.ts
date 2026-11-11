import { db } from "./db";
import type { Evidence, VisaProfile, NormalizedProfile } from "./types";
import { resolveRegionCountries, UnsupportedCountryError, CanonicalCountry } from "./countries";

export class EvidenceUnavailableError extends Error {
  code: string;

  constructor(message: string, code: string = "EVIDENCE_UNAVAILABLE") {
    super(message);
    this.name = "EvidenceUnavailableError";
    this.code = code;
  }
}

const APPROVED_GOV_PATTERNS = [
  /\.gov$/i,
  /\.gov\.[a-z]{2}$/i,
  /\.gob\.[a-z]{2}$/i,
  /\.gouv\.[a-z]{2}$/i,
  /\.govt\.[a-z]{2}$/i,
  /(^|\.)canada\.ca$/i,
  /(^|\.)gc\.ca$/i,
  /(^|\.)europa\.eu$/i,
  /(^|\.)admin\.ch$/i,
  /(^|\.)overheid\.nl$/i,
  /(^|\.)bund\.de$/i,
  /(^|\.)bamf\.de$/i,
  /(^|\.)make-it-in-germany\.com$/i,
];

/**
 * Validates authority tier and guards against commercial or third-party sources
 * falsely masquerading as Tier 1 official legislation/government sources.
 */
export function isEligibleAuthority(e: Partial<Evidence>): boolean {
  if (typeof e.authority_tier !== "number") return false;
  // Tier 1 (Official Legislation), Tier 2 (Official Guidance), Tier 3 (Accredited Legal Analysis)
  // Strictly reject Tier 4 and Tier 5 (commercial/unvetted blog/community aggregators)
  if (e.authority_tier < 1 || e.authority_tier > 3) return false;

  if (e.source_url) {
    try {
      const url = new URL(e.source_url);
      const host = url.hostname.toLowerCase();
      const isGovDomain = APPROVED_GOV_PATTERNS.some((pattern) => pattern.test(host));

      // Commercial or third-party sources must not be treated as Tier 1 official sources
      if (e.authority_tier === 1 && !isGovDomain) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Strict Gate: An evidence record qualifies for user-facing assessment ONLY when:
 * 1. verification_status = 'VERIFIED'
 * 2. human_reviewed_at IS NOT NULL and is not in the future
 * 3. human_reviewed_by is not NULL, not empty, and not whitespace-only
 * 4. authority_tier is 1, 2, or 3 (Tier 4/5 rejected; commercial masquerading rejected)
 * 5. Temporal Validity Policy:
 *    - If effective_until is present, must be >= now (expired evidence rejected)
 *    - If effective_from is present, must be <= now (future rules rejected)
 *    - If effective_until is missing (undated rule), human review must have occurred
 *      within the past 180 days to guarantee legal currency.
 */
export function isEvidenceEligible(
  e: Partial<Evidence> | null | undefined,
  now: Date = new Date()
): boolean {
  if (!e) return false;
  if (e.verification_status !== "VERIFIED") return false;

  // Reviewer metadata validation
  if (!e.human_reviewed_at) return false;
  const reviewedAt = new Date(e.human_reviewed_at);
  if (isNaN(reviewedAt.getTime()) || reviewedAt.getTime() > now.getTime()) {
    return false;
  }

  if (
    !e.human_reviewed_by ||
    typeof e.human_reviewed_by !== "string" ||
    e.human_reviewed_by.trim() === ""
  ) {
    return false;
  }

  // Authority tier validation
  if (!isEligibleAuthority(e)) return false;

  // Temporal Validity:
  // 1. Expired evidence rejection & invalid date validation
  if (e.effective_until != null && e.effective_until !== "") {
    const effectiveUntil = new Date(e.effective_until);
    if (isNaN(effectiveUntil.getTime()) || effectiveUntil.getTime() < now.getTime()) {
      return false; // Reject if invalid date format OR expired
    }
  }

  // 2. Future-effective evidence rejection & invalid date validation
  if (e.effective_from != null && e.effective_from !== "") {
    const effectiveFrom = new Date(e.effective_from);
    if (isNaN(effectiveFrom.getTime()) || effectiveFrom.getTime() > now.getTime()) {
      return false; // Reject if invalid date format OR in the future
    }
  }

  // 3. Conservative review horizon for undated evidence:
  // Statutory rules without an explicit sunset clause must be re-certified within 180 days.
  const hasEffectiveUntil = e.effective_until != null && e.effective_until !== "";
  if (!hasEffectiveUntil) {
    const msIn180Days = 180 * 24 * 60 * 60 * 1000;
    if (now.getTime() - reviewedAt.getTime() > msIn180Days) {
      return false;
    }
  }

  return true;
}

/**
 * Generates an embedding vector using OpenAI.
 * Fails closed if the API key is missing or the external API call fails.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new EvidenceUnavailableError(
      "Missing OPENAI_API_KEY for embedding generation.",
      "MISSING_API_KEY"
    );
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: text.replace(/\n/g, " "),
      model: "text-embedding-3-small",
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new EvidenceUnavailableError(
      `OpenAI embedding generation failed: ${errorText}`,
      "EMBEDDING_FAILURE"
    );
  }

  const data = await res.json();
  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new EvidenceUnavailableError(
      "OpenAI returned an empty or invalid embedding vector.",
      "EMBEDDING_FAILURE"
    );
  }
  return embedding;
}

/**
 * Retrieves and filters verified immigration evidence.
 * Fails closed on:
 * - Unsupported target regions (no null cross-country fallthrough)
 * - Missing API key or embedding failures
 * - Database retrieval failures
 */
export async function retrieveEvidence(
  profile: VisaProfile,
  normalizedProfile: NormalizedProfile,
  pathwayId?: string,
  limit: number = 10
): Promise<Evidence[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new EvidenceUnavailableError(
      "Missing OPENAI_API_KEY for evidence retrieval.",
      "MISSING_API_KEY"
    );
  }

  // 1. Strict country resolution: multi-country regions explicitly expand without dropping countries
  let filterCountries: CanonicalCountry[];
  try {
    filterCountries = resolveRegionCountries(profile.targetRegion);
  } catch (err) {
    if (err instanceof UnsupportedCountryError) {
      throw new EvidenceUnavailableError(
        `Unsupported target region "${profile.targetRegion}". Assessment stopped because country cannot be safely resolved.`,
        "UNSUPPORTED_COUNTRY"
      );
    }
    throw err;
  }

  const targetCountryDescription = filterCountries.join(" or ");

  // 2. Query Transformation: Generate targeted search queries
  let searchQueries: string[] = [];
  try {
    const goalContext =
      profile.goal === "study"
        ? "Study permits, student visas, and post-graduation work pathways"
        : profile.goal === "work"
          ? "Skilled worker visas, employer-sponsored permits, and work authorization pathways"
          : "Permanent residency, points-tested skilled migration, and settlement pathways";

    const prompt = `You are an expert immigration paralegal. Generate 3 distinct, highly targeted search queries to find the exact legal requirements, exceptions, or processing times for this applicant.
    
Applicant Info: ${profile.age} years old, ${profile.nationality} citizen, ${normalizedProfile.canonicalOccupation}, ${profile.education}, savings $${profile.savingsUsd} USD, job offer: ${normalizedProfile.hasJobOffer ? "yes" : "no"}.
Primary Goal: ${profile.goal} (${goalContext}) in ${targetCountryDescription}.
Pathway Filter: ${pathwayId || "any matching pathways aligned with goal"}

Output EXACTLY 3 queries as a JSON array of strings. No markdown formatting. Example: ["Express Entry CRS cutoff score tech draw", "Federal Skilled Worker proof of funds requirement", "Software Engineer NOC code Canada LMIA"]`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      signal: controller.signal,
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        messages: [{ role: "user", content: prompt }]
      }),
    });
    clearTimeout(timer);
    
    if (res.ok) {
      const data = await res.json();
      const content = data.choices[0].message.content.trim();
      const cleanContent = content.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      searchQueries = JSON.parse(cleanContent);
    }
  } catch (err) {
    console.warn("Query transformation failed, falling back to basic query.", err);
  }

  if (!Array.isArray(searchQueries) || searchQueries.length === 0) {
    searchQueries = [
      `Visa requirements for ${normalizedProfile.canonicalOccupation} seeking ${profile.goal} in ${targetCountryDescription}.`
    ];
  }

  // 3. Execute vector searches: query versioned match_evidence_v2 directly
  let allEvidence: Evidence[] = [];
  try {
    const searchPromises = searchQueries.map(async (queryText) => {
      const embedding = await getEmbedding(queryText);
      const embeddingStr = `[${embedding.join(",")}]`;
      
      const res = await db.query(
        `SELECT * FROM match_evidence_v2($1, $2, $3, $4, $5)`,
        [embeddingStr, 0.3, limit, filterCountries, pathwayId || null]
      );
      return (res.rows as Evidence[]) || [];
    });

    const resultsList = await Promise.all(searchPromises);
    allEvidence = resultsList.flat();
  } catch (err: any) {
    if (err instanceof EvidenceUnavailableError) {
      throw err;
    }
    throw new EvidenceUnavailableError(
      `Database evidence retrieval failed: ${err?.message || String(err)}`,
      "DATABASE_ERROR"
    );
  }

  // 4. Deduplicate and enforce application-level eligibility & authority gating
  const uniqueEvidenceMap = new Map<string, Evidence>();
  for (const e of allEvidence) {
    if (e && e.id) {
      uniqueEvidenceMap.set(e.id, e);
    }
  }

  return filterByAuthority(Array.from(uniqueEvidenceMap.values()));
}

/**
 * Shared, trusted retrieval helper for free-form queries (used by Chat and direct inquiries).
 * Enforces mandatory country scoping, calls match_evidence_v2(), fails closed on database errors,
 * and re-verifies eligibility in TypeScript before returning results.
 */
export async function retrieveEvidenceForQuery(
  queryText: string,
  targetCountries: CanonicalCountry[],
  pathwayId?: string,
  limit: number = 5
): Promise<Evidence[]> {
  if (!targetCountries || targetCountries.length === 0) {
    throw new EvidenceUnavailableError(
      "Evidence retrieval requires at least one target country.",
      "MISSING_COUNTRY_SCOPE"
    );
  }

  const embedding = await getEmbedding(queryText);
  const embeddingStr = `[${embedding.join(",")}]`;

  let res: any;
  try {
    res = await db.query(
      `SELECT * FROM match_evidence_v2($1, $2, $3, $4, $5)`,
      [embeddingStr, 0.3, limit, targetCountries, pathwayId || null]
    );
  } catch (err: any) {
    throw new EvidenceUnavailableError(
      `Database evidence retrieval failed: ${err?.message || String(err)}`,
      "DATABASE_ERROR"
    );
  }

  const rawRows = (res?.rows as Evidence[]) || [];
  return filterByAuthority(rawRows);
}

/**
 * Ensures that:
 * 1. Every candidate evidence record passes strict human-review eligibility and temporal validity.
 * 2. If high-authority (Tier 1-2) evidence exists for a claim, lower-authority evidence is dropped.
 * 3. Tier 4 and Tier 5 evidence NEVER enters the prompt.
 */
export function filterByAuthority(evidence: Evidence[], now: Date = new Date()): Evidence[] {
  // Reject unreviewed, quarantined, pending, null status, expired, or ineligible authority records
  const eligible = evidence.filter((e) => isEvidenceEligible(e, now));
  if (eligible.length === 0) return [];

  // Group by claim_type + country + pathway
  const groups: Record<string, Evidence[]> = {};
  for (const e of eligible) {
    const key = `${e.claim_type}-${e.country}-${e.pathway || "general"}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }

  const filtered: Evidence[] = [];
  for (const key in groups) {
    const group = groups[key];
    const hasHighAuthority = group.some((e) => e.authority_tier <= 2);

    if (hasHighAuthority) {
      filtered.push(...group.filter((e) => e.authority_tier <= 2));
    } else {
      filtered.push(...group.filter((e) => e.authority_tier <= 3));
    }
  }

  return Array.from(new Map(filtered.map((e) => [e.id, e])).values());
}
