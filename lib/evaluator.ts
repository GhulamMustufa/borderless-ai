import type {
  Citation,
  Condition,
  DeterministicEvaluation,
  EligibilityStatus,
  EvaluatedRequirement,
  Evidence,
  NormalizedProfile,
  Requirement,
  WhatIfScenario,
} from "./types";
import type { PathwayDomain } from "./domain";
import { calculateMarginalImprovements } from "./marginal";
import { normalizeCountry } from "./countries";

function resolveFieldValue(profile: NormalizedProfile, fieldPath: string): unknown {
  const parts = fieldPath.split(".");
  let current: unknown = profile;
  for (const part of parts) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function evaluateCondition(condition: Condition, profile: NormalizedProfile): boolean {
  if ("conditions" in condition) {
    if (condition.operator === "and") {
      return condition.conditions.every((c) => evaluateCondition(c, profile));
    }
    return condition.conditions.some((c) => evaluateCondition(c, profile));
  }

  const actual = resolveFieldValue(profile, condition.field);

  switch (condition.operator) {
    case ">=":
      return typeof actual === "number" && typeof condition.value === "number" && actual >= condition.value;
    case "<=":
      return typeof actual === "number" && typeof condition.value === "number" && actual <= condition.value;
    case ">":
      return typeof actual === "number" && typeof condition.value === "number" && actual > condition.value;
    case "<":
      return typeof actual === "number" && typeof condition.value === "number" && actual < condition.value;
    case "===":
      return actual === condition.value;
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(actual);
    default:
      return false;
  }
}

export function findMatchingDomainPathway(
  aiName: string,
  aiCountry: string,
  regionPathways: PathwayDomain[]
): PathwayDomain | undefined {
  const nameLower = aiName.trim().toLowerCase();
  if (!nameLower) return undefined;

  const exact = regionPathways.find(
    (p) => p.id.toLowerCase() === nameLower || p.name.toLowerCase() === nameLower
  );
  if (exact) return exact;

  const targetCountry = normalizeCountry(aiCountry) ?? aiCountry.trim().toLowerCase();
  const sameCountry = regionPathways.filter((p) => {
    const pCountry = normalizeCountry(p.country) ?? p.country.trim().toLowerCase();
    return pCountry === targetCountry;
  });

  if (sameCountry.length === 0) return undefined;

  // Match canonical domain pathways only when the name clearly refers to that pathway
  if (/\b(express entry|federal skilled worker|fsw|cec|ca-express-entry)\b/i.test(nameLower)) {
    return sameCountry.find((p) => p.id === "ca-express-entry");
  }
  if (/\bskilled worker\b/i.test(nameLower) && !/\badvanced\b/i.test(nameLower)) {
    return sameCountry.find((p) => p.id === "uk-skilled-worker");
  }
  if (/\bh-?1b\b/i.test(nameLower)) {
    return sameCountry.find((p) => p.id === "us-h1b");
  }
  if (/\b(189|skilled independent)\b/i.test(nameLower)) {
    return sameCountry.find((p) => p.id === "au-skilled-independent");
  }
  if (/\bblue card\b/i.test(nameLower)) {
    return sameCountry.find((p) => p.id === "de-blue-card");
  }

  return sameCountry.find(
    (p) => nameLower.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(nameLower)
  );
}

export function computeEvidenceQuality(
  evidenceList: Evidence[],
  country?: string,
  pathwayName?: string
): number {
  const canonicalCountry = country ? normalizeCountry(country) : null;
  const scoped = evidenceList.filter((e) => {
    if (canonicalCountry && e.country !== canonicalCountry) return false;
    if (pathwayName && e.pathway) {
      return (
        e.pathway.toLowerCase().includes(pathwayName.toLowerCase()) ||
        pathwayName.toLowerCase().includes(e.pathway.toLowerCase())
      );
    }
    return true;
  });

  const pool = scoped.length > 0 ? scoped : evidenceList;
  if (pool.length === 0) return 0;

  const bestTier = Math.min(...pool.map((e) => e.authority_tier));
  if (bestTier === 1) return 100;
  if (bestTier === 2) return 92;
  if (bestTier === 3) return 80;
  return 0;
}

function buildVerifiedProfileStrengths(profile: NormalizedProfile): EvaluatedRequirement[] {
  const strengths: EvaluatedRequirement[] = [];
  const orig = profile.original;

  if (orig.education === "phd" || orig.education === "master" || orig.education === "bachelor") {
    const labelMap = {
      bachelor: "Bachelor's degree",
      master: "Master's degree",
      phd: "PhD / Doctorate",
    };
    strengths.push({
      id: "profile-education",
      type: "points",
      description: `Completed education: ${labelMap[orig.education]}`,
      pointsAwarded: orig.education === "phd" ? 28 : orig.education === "master" ? 24 : 16,
      met: true,
      scoreImpact: orig.education === "phd" ? 28 : orig.education === "master" ? 24 : 16,
    });
  }

  if (profile.languageLevelCEFR !== "none") {
    const scoreDetail =
      orig.englishTest !== "none" && orig.testScore !== null
        ? ` (${orig.englishTest.toUpperCase()} ${orig.testScore})`
        : "";
    strengths.push({
      id: "profile-language",
      type: "points",
      description: `English test score provided${scoreDetail}`,
      pointsAwarded: 20,
      met: true,
      scoreImpact: 20,
    });
  }

  if (orig.yearsExperience >= 1) {
    strengths.push({
      id: "profile-experience",
      type: "points",
      description: `Work experience: ${orig.yearsExperience} year${orig.yearsExperience === 1 ? "" : "s"} in ${profile.canonicalOccupation}`,
      pointsAwarded: Math.min(24, orig.yearsExperience * 4),
      met: true,
      scoreImpact: Math.min(24, orig.yearsExperience * 4),
    });
  }

  if (orig.savingsUsd >= 10000) {
    strengths.push({
      id: "profile-savings",
      type: "conditional",
      description: `Available savings: $${orig.savingsUsd.toLocaleString()} USD`,
      pointsAwarded: 12,
      met: true,
      scoreImpact: 12,
    });
  }

  if (profile.hasJobOffer) {
    strengths.push({
      id: "profile-job-offer",
      type: "hard",
      description: "You indicated you already have a job offer.",
      pointsAwarded: 30,
      met: true,
      scoreImpact: 30,
    });
  }

  return strengths;
}

export function evaluateDomainRequirements(
  domain: PathwayDomain,
  profile: NormalizedProfile,
  evidenceList: Evidence[]
): {
  satisfiedRequirements: EvaluatedRequirement[];
  missingRequirements: EvaluatedRequirement[];
  blockingRequirements: EvaluatedRequirement[];
  marginalImprovements: ReturnType<typeof calculateMarginalImprovements>;
  topWhatIfScenario?: WhatIfScenario;
  deterministicScore: number;
  deterministicStatus: EligibilityStatus;
  evidenceQuality: number;
} {
  const evaluatedReqs: EvaluatedRequirement[] = domain.requirements.map((req: Requirement) => {
    const met = req.condition ? evaluateCondition(req.condition, profile) : false;
    return {
      ...req,
      met,
      scoreImpact: met ? req.pointsAwarded : 0,
    };
  });

  const satisfiedRequirements = evaluatedReqs.filter((r) => r.met);
  const missingRequirements = evaluatedReqs.filter((r) => !r.met);
  const blockingRequirements = missingRequirements.filter((r) => r.type === "hard");

  const earnedPoints = satisfiedRequirements.reduce((s, r) => s + r.scoreImpact, 0);
  const maxPoints = domain.requirements.reduce((s, r) => s + r.pointsAwarded, 0);
  const normalizedPoints = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;

  let deterministicStatus: EligibilityStatus = "ELIGIBLE";
  if (blockingRequirements.length > 0) {
    deterministicStatus = "BLOCKED";
  } else if (missingRequirements.some((r) => r.type === "conditional")) {
    deterministicStatus = "CONDITIONALLY_ELIGIBLE";
  } else if (domain.baseScoreThreshold && normalizedPoints < domain.baseScoreThreshold) {
    deterministicStatus = "CONDITIONALLY_ELIGIBLE";
  }

  const marginalImprovements = calculateMarginalImprovements(evaluatedReqs, normalizedPoints);

  let topWhatIfScenario: WhatIfScenario | undefined;
  if (marginalImprovements.length > 0) {
    const topAction = marginalImprovements[0];
    const simulatedScore = Math.min(100, normalizedPoints + topAction.pointImpact);
    const remainingBlockers = blockingRequirements.filter((b) => b.id !== topAction.requirementId);
    const simulatedStatus: EligibilityStatus =
      remainingBlockers.length > 0
        ? "BLOCKED"
        : simulatedScore >= 70
          ? "ELIGIBLE"
          : "CONDITIONALLY_ELIGIBLE";

    topWhatIfScenario = {
      targetAction: topAction,
      newEligibilityStatus: simulatedStatus,
      newBaseScore: simulatedScore,
    };
  }

  return {
    satisfiedRequirements,
    missingRequirements,
    blockingRequirements,
    marginalImprovements,
    topWhatIfScenario,
    deterministicScore: normalizedPoints,
    deterministicStatus,
    evidenceQuality: computeEvidenceQuality(evidenceList, domain.country, domain.name),
  };
}

export function evaluatePathwayForProfile(params: {
  aiName: string;
  aiCountry: string;
  regionPathways: PathwayDomain[];
  profile: NormalizedProfile;
  evidenceList: Evidence[];
}): DeterministicEvaluation & { matchedDomain?: PathwayDomain } {
  const matchedDomain = findMatchingDomainPathway(
    params.aiName,
    params.aiCountry,
    params.regionPathways
  );

  if (matchedDomain) {
    const res = evaluateDomainRequirements(matchedDomain, params.profile, params.evidenceList);
    return {
      matchedDomain,
      pathwayId: matchedDomain.id,
      status: res.deterministicStatus,
      baseScore: res.deterministicScore,
      maxScore: 100,
      scoreBreakdown: {
        eligibilityFit: res.deterministicScore,
        profileStrength: res.deterministicScore,
        evidenceQuality: res.evidenceQuality,
        competitiveness: res.deterministicScore,
      },
      satisfiedRequirements: res.satisfiedRequirements,
      missingRequirements: res.missingRequirements,
      blockingRequirements: res.blockingRequirements,
      marginalImprovements: res.marginalImprovements,
      topWhatIfScenario: res.topWhatIfScenario,
    };
  }

  // Fallback for verified DB pathways not codified in data/pathways.json (e.g. Study Permit, Graduate visa)
  const slug = `${normalizeCountry(params.aiCountry) ?? params.aiCountry}-${params.aiName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    pathwayId: slug || "verified-pathway",
    status: "CONDITIONALLY_ELIGIBLE",
    baseScore: 0,
    maxScore: 100,
    scoreBreakdown: {
      eligibilityFit: 0,
      profileStrength: 0,
      evidenceQuality: computeEvidenceQuality(params.evidenceList, params.aiCountry, params.aiName),
      competitiveness: 0,
    },
    satisfiedRequirements: buildVerifiedProfileStrengths(params.profile),
    missingRequirements: [],
    blockingRequirements: [],
    marginalImprovements: [],
  };
}

function normalizeUrlForCompare(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

/**
 * Strips any citations whose URL does not appear verbatim in the retrieved
 * verified evidence set, and backstops with matching DB evidence citations if
 * all LLM citations were stripped.
 */
export function sanitizeCitationsForPathway(
  aiCitations: Citation[] | undefined,
  evidenceList: Evidence[],
  aiCountry?: string,
  aiPathwayName?: string
): { citations: Citation[]; invalidUrls: string[] } {
  const evidenceByUrl = new Map<string, Evidence>();
  for (const e of evidenceList) {
    if (e.source_url) {
      evidenceByUrl.set(normalizeUrlForCompare(e.source_url), e);
    }
  }

  const validCitations: Citation[] = [];
  const seenUrls = new Set<string>();
  const invalidUrls: string[] = [];

  for (const c of aiCitations || []) {
    if (!c || typeof c.url !== "string" || !c.url.trim()) continue;
    const norm = normalizeUrlForCompare(c.url);
    const matched = evidenceByUrl.get(norm);
    if (!matched) {
      invalidUrls.push(c.url);
      continue;
    }
    if (!seenUrls.has(norm)) {
      seenUrls.add(norm);
      validCitations.push({
        title: c.title?.trim() || matched.source_title,
        url: matched.source_url,
      });
    }
  }

  // If the AI cited only non-evidence URLs (or nothing), pull verified citations from matching evidence rows
  if (validCitations.length === 0 && evidenceList.length > 0) {
    const canonicalCountry = aiCountry ? normalizeCountry(aiCountry) : null;
    const nameLower = aiPathwayName?.toLowerCase() ?? "";

    const byPathwayAndCountry = evidenceList.filter((e) => {
      if (canonicalCountry && e.country !== canonicalCountry) return false;
      if (!nameLower || !e.pathway) return false;
      const ePath = e.pathway.toLowerCase();
      return nameLower.includes(ePath) || ePath.includes(nameLower);
    });

    const byCountry =
      byPathwayAndCountry.length > 0
        ? byPathwayAndCountry
        : evidenceList.filter((e) => !canonicalCountry || e.country === canonicalCountry);

    const candidates = byCountry.length > 0 ? byCountry : evidenceList;
    for (const e of candidates) {
      const norm = normalizeUrlForCompare(e.source_url);
      if (!seenUrls.has(norm)) {
        seenUrls.add(norm);
        validCitations.push({ title: e.source_title, url: e.source_url });
      }
      if (validCitations.length >= 2) break;
    }
  }

  return { citations: validCitations, invalidUrls };
}
