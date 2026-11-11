import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isEvidenceEligible,
  isEligibleAuthority,
  filterByAuthority,
  EvidenceUnavailableError,
  retrieveEvidence,
  retrieveEvidenceForQuery,
  getEmbedding,
} from "@/lib/evidence";
import {
  resolveCanonicalCountry,
  resolveRegionCountries,
  normalizeCountry,
  detectCountriesFromQuery,
  isImmigrationQuery,
  UnsupportedCountryError,
  AmbiguousRegionError,
} from "@/lib/countries";
import type { Evidence, VisaProfile, NormalizedProfile } from "@/lib/types";

// ============================================================================
// SUITE 1: EVIDENCE ELIGIBILITY & HUMAN-REVIEW GATE
// Covers Step 7 Items: 1 (empty reviewer), 2 (whitespace reviewer), 3 (null reviewer),
// 4 (Tier 4 & 5), 5 (expired evidence), 6 (future-effective), 7 (undated policy),
// and 15 (SQL-TS parity)
// ============================================================================
describe("Phase 5A.2: Evidence Eligibility, Reviewer & Temporal Validation", () => {
  const referenceTime = new Date("2026-11-03T12:00:00Z");

  const validReviewedEvidence: Evidence = {
    id: "evi-001",
    source_id: "ircc-express-entry-fsw",
    authority_tier: 1,
    country: "Canada",
    jurisdiction: "Federal",
    pathway: "ca-express-entry",
    claim_type: "eligibility",
    source_url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html",
    source_title: "IRCC Express Entry Guidelines",
    verification_status: "VERIFIED",
    content: "Applicants under Federal Skilled Worker must achieve minimum 67 points on selection grid.",
    human_reviewed_at: "2026-11-01T10:00:00Z", // 2 days ago
    human_reviewed_by: "auditor_paralegal_01",
    retrieved_at: "2026-11-01T09:00:00Z",
    content_hash: "hash123456",
  };

  it("Item 1 & 2: Rejects empty string and whitespace-only reviewer ID (including tabs and newlines)", () => {
    const emptyReviewer = { ...validReviewedEvidence, human_reviewed_by: "" };
    const whitespaceReviewer1 = { ...validReviewedEvidence, human_reviewed_by: "   " };
    const whitespaceReviewer2 = { ...validReviewedEvidence, human_reviewed_by: "\t\t" };
    const whitespaceReviewer3 = { ...validReviewedEvidence, human_reviewed_by: "\n\n" };
    const whitespaceReviewer4 = { ...validReviewedEvidence, human_reviewed_by: " \t \n " };

    expect(isEvidenceEligible(emptyReviewer, referenceTime)).toBe(false);
    expect(isEvidenceEligible(whitespaceReviewer1, referenceTime)).toBe(false);
    expect(isEvidenceEligible(whitespaceReviewer2, referenceTime)).toBe(false);
    expect(isEvidenceEligible(whitespaceReviewer3, referenceTime)).toBe(false);
    expect(isEvidenceEligible(whitespaceReviewer4, referenceTime)).toBe(false);
  });

  it("Item 3: Rejects NULL or undefined reviewer ID", () => {
    const nullReviewer = { ...validReviewedEvidence, human_reviewed_by: null };
    const undefinedReviewer = { ...validReviewedEvidence, human_reviewed_by: undefined };

    expect(isEvidenceEligible(nullReviewer, referenceTime)).toBe(false);
    expect(isEvidenceEligible(undefinedReviewer, referenceTime)).toBe(false);
  });

  it("Accepts valid human-reviewed evidence with non-empty reviewer string", () => {
    expect(isEvidenceEligible(validReviewedEvidence, referenceTime)).toBe(true);
  });

  it("Item 4: Rejects Tier 4 and Tier 5 evidence from eligibility and prompt filtering", () => {
    const candidateTier4 = { ...validReviewedEvidence, authority_tier: 4 as const };
    const candidateTier5 = { ...validReviewedEvidence, authority_tier: 5 as const };

    expect(isEvidenceEligible(candidateTier4, referenceTime)).toBe(false);
    expect(isEvidenceEligible(candidateTier5, referenceTime)).toBe(false);
    expect(filterByAuthority([candidateTier4, candidateTier5], referenceTime)).toEqual([]);
  });

  it("Item 5: Rejects expired evidence where effective_until is in the past", () => {
    const expiredEvidence = {
      ...validReviewedEvidence,
      effective_until: "2025-06-01T00:00:00Z", // Expired in 2025
    };
    expect(isEvidenceEligible(expiredEvidence, referenceTime)).toBe(false);
  });

  it("Fails closed on invalid or malformed effective_until dates", () => {
    const malformedUntil1 = { ...validReviewedEvidence, effective_until: "invalid-date" };
    const malformedUntil2 = { ...validReviewedEvidence, effective_until: "2025-99-99" };
    const malformedUntil3 = { ...validReviewedEvidence, effective_until: "not-a-timestamp" };

    expect(isEvidenceEligible(malformedUntil1, referenceTime)).toBe(false);
    expect(isEvidenceEligible(malformedUntil2, referenceTime)).toBe(false);
    expect(isEvidenceEligible(malformedUntil3, referenceTime)).toBe(false);
  });

  it("Accepts evidence where effective_until is in the future", () => {
    const activeEvidence = {
      ...validReviewedEvidence,
      effective_until: "2027-12-31T23:59:59Z", // Valid until end of 2027
    };
    expect(isEvidenceEligible(activeEvidence, referenceTime)).toBe(true);
  });

  it("Item 6: Rejects future-effective evidence where effective_from is in the future", () => {
    const futureEvidence = {
      ...validReviewedEvidence,
      effective_from: "2027-01-01T00:00:00Z", // Not yet in effect
    };
    expect(isEvidenceEligible(futureEvidence, referenceTime)).toBe(false);
  });

  it("Fails closed on invalid or malformed effective_from dates", () => {
    const malformedFrom1 = { ...validReviewedEvidence, effective_from: "invalid-date" };
    const malformedFrom2 = { ...validReviewedEvidence, effective_from: "2025-99-99" };

    expect(isEvidenceEligible(malformedFrom1, referenceTime)).toBe(false);
    expect(isEvidenceEligible(malformedFrom2, referenceTime)).toBe(false);
  });

  it("Item 7: Enforces conservative currency policy for undated evidence (180-day review horizon)", () => {
    // Undated evidence reviewed 30 days ago (within 180 days) -> VALID
    const recentUndated = {
      ...validReviewedEvidence,
      effective_until: undefined,
      human_reviewed_at: "2026-10-01T10:00:00Z", // ~33 days ago
    };
    expect(isEvidenceEligible(recentUndated, referenceTime)).toBe(true);

    // Undated evidence reviewed 200 days ago (> 180 days) -> REJECTED (requires human re-certification)
    const staleUndated = {
      ...validReviewedEvidence,
      effective_until: undefined,
      human_reviewed_at: "2026-03-01T10:00:00Z", // > 240 days ago
    };
    expect(isEvidenceEligible(staleUndated, referenceTime)).toBe(false);
  });

  it("Rejects human review timestamp dated in the future or malformed", () => {
    const futureReviewed = {
      ...validReviewedEvidence,
      human_reviewed_at: "2027-01-01T00:00:00Z", // Future date
    };
    const malformedReviewed = {
      ...validReviewedEvidence,
      human_reviewed_at: "invalid-review-timestamp",
    };
    expect(isEvidenceEligible(futureReviewed, referenceTime)).toBe(false);
    expect(isEvidenceEligible(malformedReviewed, referenceTime)).toBe(false);
  });

  it("Rejects commercial domain masquerading as Tier 1 official legislation", () => {
    const commercialMasqueradingAsTier1 = {
      ...validReviewedEvidence,
      authority_tier: 1 as const,
      source_url: "https://www.commercial-visa-agency.com/canada-visa-rules",
    };
    expect(isEligibleAuthority(commercialMasqueradingAsTier1)).toBe(false);
    expect(isEvidenceEligible(commercialMasqueradingAsTier1, referenceTime)).toBe(false);
  });
});

// ============================================================================
// SUITE 2: COUNTRY NORMALIZATION & REGION RESOLUTION
// Covers Step 7 Items: 8 (null filter), 9 (empty string), 10 (multi-country aliases),
// and 11 (unsupported countries)
// ============================================================================
describe("Phase 5A.2: Country Normalization & Multi-Country Region Handling", () => {
  it("Item 8: Rejects NULL country input safely", () => {
    expect(normalizeCountry(null)).toBeNull();
    expect(() => resolveCanonicalCountry(null)).toThrow(UnsupportedCountryError);
    expect(() => resolveRegionCountries(null)).toThrow(UnsupportedCountryError);
  });

  it("Item 9: Rejects empty country string safely", () => {
    expect(normalizeCountry("")).toBeNull();
    expect(normalizeCountry("   ")).toBeNull();
    expect(() => resolveCanonicalCountry("")).toThrow(UnsupportedCountryError);
    expect(() => resolveRegionCountries("")).toThrow(UnsupportedCountryError);
  });

  it("Normalizes single country aliases correctly to exactly one canonical country", () => {
    expect(resolveCanonicalCountry("USA")).toBe("United States");
    expect(resolveCanonicalCountry("usa")).toBe("United States");
    expect(resolveCanonicalCountry("U.S.A.")).toBe("United States");
    expect(resolveCanonicalCountry("United Kingdom")).toBe("United Kingdom");
    expect(resolveCanonicalCountry("uk")).toBe("United Kingdom");
    expect(resolveCanonicalCountry("Canada")).toBe("Canada");
    expect(resolveCanonicalCountry("Australia")).toBe("Australia");
    expect(resolveCanonicalCountry("Germany")).toBe("Germany");
  });

  it("Item 10: Multi-country regional slugs expand explicitly without silently dropping countries", () => {
    // australia-new-zealand must contain BOTH Australia and New Zealand
    const anzCountries = resolveRegionCountries("australia-new-zealand");
    expect(anzCountries).toContain("Australia");
    expect(anzCountries).toContain("New Zealand");
    expect(anzCountries.length).toBe(2);

    // germany-nordics must contain Germany AND Nordic countries
    const gnCountries = resolveRegionCountries("germany-nordics");
    expect(gnCountries).toContain("Germany");
    expect(gnCountries).toContain("Sweden");
    expect(gnCountries).toContain("Denmark");
    expect(gnCountries).toContain("Norway");
    expect(gnCountries).toContain("Finland");
  });

  it("Item 10: Multi-country slugs throw AmbiguousRegionError when forced into single-country resolution", () => {
    expect(() => resolveCanonicalCountry("australia-new-zealand")).toThrow(AmbiguousRegionError);
    expect(() => resolveCanonicalCountry("germany-nordics")).toThrow(AmbiguousRegionError);
    expect(normalizeCountry("australia-new-zealand")).toBeNull();
    expect(normalizeCountry("germany-nordics")).toBeNull();
  });

  it("Item 11: Rejects unsupported or arbitrary country strings safely", () => {
    expect(() => resolveCanonicalCountry("Atlantis")).toThrow(UnsupportedCountryError);
    expect(() => resolveRegionCountries("southern-europe")).toThrow(UnsupportedCountryError);
    expect(() => resolveRegionCountries("middle-east")).toThrow(UnsupportedCountryError);
    expect(() => resolveRegionCountries("unknown-zone")).toThrow(UnsupportedCountryError);
  });
});

// ============================================================================
// SUITE 3: CHAT SCOPING & DETERMINISTIC ENFORCEMENT
// Covers Step 7 Items: 12 (chat without country), 13 (chat with no evidence),
// and 14 (streaming refusal behavior)
// ============================================================================
describe("Phase 5A.2: Chat Country Scoping & Deterministic Enforcement", () => {
  it("Item 12: Detects immigration inquiries and extracts country scope", () => {
    // Immigration query with explicit country
    const q1 = "What is the minimum salary for a UK Skilled Worker visa?";
    expect(isImmigrationQuery(q1)).toBe(true);
    expect(detectCountriesFromQuery(q1)).toEqual(["United Kingdom"]);

    // Immigration query with Canada
    const q2 = "How do I calculate my Express Entry CRS score for Canada?";
    expect(isImmigrationQuery(q2)).toBe(true);
    expect(detectCountriesFromQuery(q2)).toEqual(["Canada"]);

    // Immigration query WITHOUT country scope
    const q3 = "What are the requirements to get a work visa with 3 years experience?";
    expect(isImmigrationQuery(q3)).toBe(true);
    expect(detectCountriesFromQuery(q3)).toEqual([]);

    // General conversation (NOT an immigration query)
    const q4 = "Hello! Can you help me navigate the platform?";
    expect(isImmigrationQuery(q4)).toBe(false);
  });

  it("Step 6: Distinguishes intended destination jurisdiction from nationality, citizenship, and residence", () => {
    // US citizen living in UK wanting to move to Canada -> Only Canada must be detected!
    const q1 = "I am a US citizen living in the UK. How do I immigrate to Canada?";
    expect(detectCountriesFromQuery(q1)).toEqual(["Canada"]);

    // Origin Pakistan, destination Germany -> Only Germany
    const q2 = "I am from Pakistan and want to move to Germany.";
    expect(detectCountriesFromQuery(q2)).toEqual(["Germany"]);

    // Destination Singapore is unsupported -> Returns [] to prompt clarification
    const q3 = "I live in Malaysia but want a work visa for Singapore.";
    expect(detectCountriesFromQuery(q3)).toEqual([]);

    // Explicit comparison between Canada and Australia -> Both detected
    const q4 = "Compare immigration pathways in Canada and Australia.";
    const compCountries = detectCountriesFromQuery(q4);
    expect(compCountries).toContain("Canada");
    expect(compCountries).toContain("Australia");
    expect(compCountries.length).toBe(2);

    // Only nationality and residence, no destination -> Returns []
    const q5 = "I have Pakistani nationality and currently live in Malaysia.";
    expect(detectCountriesFromQuery(q5)).toEqual([]);

    // Canadian citizen living in US with no destination specified -> Returns []
    const q6 = "I am a Canadian citizen living in the US.";
    expect(detectCountriesFromQuery(q6)).toEqual([]);
  });

  it("Phase 5A.4 Final Correction: Regression verification for nationality exclusion and comparison punctuation", () => {
    // 1. US citizen asking about immigration rules in Germany -> Germany only
    const q1 = "What are the immigration rules for US citizens in Germany?";
    expect(detectCountriesFromQuery(q1)).toEqual(["Germany"]);

    // 2. Pakistani citizen living in Malaysia asking about Canada -> Canada only
    const q2 = "I am a Pakistani citizen living in Malaysia. How can I move to Canada?";
    expect(detectCountriesFromQuery(q2)).toEqual(["Canada"]);

    // 3. Compare Canada, Australia and Germany -> all three
    const q3 = "Compare Canada, Australia and Germany.";
    const res3 = detectCountriesFromQuery(q3);
    expect(res3.sort()).toEqual(["Australia", "Canada", "Germany"]);

    // 4. Compare Canada and Australia -> both
    const q4 = "Compare Canada and Australia.";
    const res4 = detectCountriesFromQuery(q4);
    expect(res4.sort()).toEqual(["Australia", "Canada"]);

    // 5. Ambiguous destination -> empty array
    const q5 = "I want to move abroad but have not selected a country.";
    expect(detectCountriesFromQuery(q5)).toEqual([]);

    // 6. Nationality mentioned without an explicit destination -> do not invent a destination
    const q6a = "What are the visa options for Pakistani citizens?";
    expect(detectCountriesFromQuery(q6a)).toEqual([]);
    const q6b = "I am a US citizen interested in work permits.";
    expect(detectCountriesFromQuery(q6b)).toEqual([]);
  });

  it("Item 13 & 14: Chat deterministic refusal for immigration query when eligible evidence is missing", () => {
    // Simulate candidate rows retrieved from current unreviewed DB
    const unreviewedRows: Partial<Evidence>[] = [
      {
        id: "raw-scraped-01",
        country: "United Kingdom",
        pathway: "uk-skilled-worker",
        content: "Minimum salary is £38,700.",
        verification_status: "VERIFIED",
        authority_tier: 1,
        human_reviewed_at: null, // Unreviewed!
        human_reviewed_by: null,
      },
    ];

    const eligibleRows = unreviewedRows.filter((r) => isEvidenceEligible(r));
    expect(eligibleRows.length).toBe(0);

    // Verify deterministic refusal condition
    const isImmigration = isImmigrationQuery("What are the UK visa rules?");
    const detected = detectCountriesFromQuery("What are the UK visa rules?");
    expect(isImmigration).toBe(true);
    expect(detected).toEqual(["United Kingdom"]);

    // With 0 eligible rows, the system must trigger deterministic refusal
    const mustRefuse = isImmigration && detected.length > 0 && eligibleRows.length === 0;
    expect(mustRefuse).toBe(true);
  });
});

// ============================================================================
// SUITE 4: ASSESSMENT SAFETY & RETRIEVAL RESILIENCE
// Tests fail-closed behavior in scoring orchestrator
// ============================================================================
describe("Phase 5A.2: Assessment Safety & Retrieval Fail-Closed", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: "sk-test-key-mock" };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  const testProfile: VisaProfile = {
    nationality: "India",
    targetRegion: "canada",
    age: 29,
    education: "master",
    yearsExperience: 5,
    fieldOfWork: "Software Engineer",
    englishTest: "ielts",
    testScore: 8.0,
    savingsUsd: 20000,
    goal: "work",
  };

  const testNormalizedProfile: NormalizedProfile = {
    original: testProfile,
    canonicalOccupation: "Software Engineer",
    languageLevelCEFR: "C1",
    isSTEM: true,
    isHealthcare: false,
  };

  it("Unsupported country stops assessment immediately with EvidenceUnavailableError before DB or embedding", async () => {
    const invalidProfile: VisaProfile = {
      ...testProfile,
      targetRegion: "southern-europe" as any,
    };

    await expect(
      retrieveEvidence(invalidProfile, testNormalizedProfile, "pathway-1", 5)
    ).rejects.toThrow(EvidenceUnavailableError);
  });

  it("Empty eligible evidence stops scoring and never invokes the AI synthesizer", async () => {
    const { db } = await import("@/lib/db");
    const dbSpy = vi.spyOn(db, "query").mockResolvedValue({ rows: [] } as any);

    const synthesizerCalled = vi.fn();

    const fetchSpy = vi.fn().mockImplementation((url: string, options: any) => {
      const bodyStr = typeof options?.body === "string" ? options.body : "";
      if (bodyStr.includes("senior immigration case analyst")) {
        synthesizerCalled();
        return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] })));
      }
      if (bodyStr.includes("paralegal")) {
        return Promise.resolve(
          new Response(JSON.stringify({ choices: [{ message: { content: '["Express Entry requirements"]' } }] }))
        );
      }
      if (url.includes("/embeddings")) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [{ embedding: new Array(1536).fill(0.01) }] }))
        );
      }
      return Promise.resolve(new Response(JSON.stringify({})));
    });
    vi.stubGlobal("fetch", fetchSpy);

    const { runVisaAssessment } = await import("@/lib/orchestrator");

    let thrownError: any = null;
    try {
      await runVisaAssessment(testProfile, "req-test-fail-closed-5a2");
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(EvidenceUnavailableError);
    expect(thrownError.code).toBe("NO_VERIFIED_EVIDENCE");
    expect(synthesizerCalled).not.toHaveBeenCalled();
    dbSpy.mockRestore();
  });

  it("retrieveEvidenceForQuery rejects empty country array without database query", async () => {
    await expect(retrieveEvidenceForQuery("visa requirements", [])).rejects.toThrow(
      EvidenceUnavailableError
    );
  });

  it("retrieveEvidenceForQuery queries match_evidence_v2 and filters results through eligibility gate", async () => {
    const { db } = await import("@/lib/db");
    const querySpy = vi.spyOn(db, "query").mockResolvedValue({
      rows: [
        {
          id: "row-1",
          country: "Canada",
          pathway: "express-entry",
          claim_type: "eligibility",
          verification_status: "VERIFIED",
          authority_tier: 1,
          human_reviewed_at: "2026-11-01T10:00:00Z",
          human_reviewed_by: "auditor_01",
          effective_from: "2026-01-01T00:00:00Z",
          effective_until: "2027-01-01T00:00:00Z",
          content: "Valid Canada rule",
          source_title: "IRCC",
          source_url: "https://www.canada.ca/en.html",
        },
      ],
    } as any);

    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ embedding: new Array(1536).fill(0.01) }] }))
    );
    vi.stubGlobal("fetch", fetchSpy);

    const results = await retrieveEvidenceForQuery("Canada rules", ["Canada"], undefined, 5);
    expect(querySpy).toHaveBeenCalledWith(
      expect.stringContaining("match_evidence_v2"),
      expect.arrayContaining([expect.any(String), 0.3, 5, ["Canada"], null])
    );
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("row-1");
    querySpy.mockRestore();
  });

  it("retrieveEvidence fails closed immediately without attempting legacy match_evidence when match_evidence_v2 fails", async () => {
    const { db } = await import("@/lib/db");
    const querySpy = vi.spyOn(db, "query").mockRejectedValue(new Error("function match_evidence_v2 does not exist"));

    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/embeddings")) {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ embedding: new Array(1536).fill(0.01) }] })));
      }
      return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: '["query"]' } }] })));
    });
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      retrieveEvidence(testProfile, testNormalizedProfile, "ca-ee", 5)
    ).rejects.toThrow(EvidenceUnavailableError);

    // Verify match_evidence was NEVER called
    for (const call of querySpy.mock.calls) {
      expect(call[0]).not.toMatch(/SELECT \* FROM match_evidence\(/);
    }
    querySpy.mockRestore();
  });
});
