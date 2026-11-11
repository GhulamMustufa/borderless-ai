import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Evidence } from "@/lib/types";

const mockAuth = vi.fn();
const mockRetrieveEvidence = vi.fn();
const mockPersistSubmission = vi.fn();
const mockCountMonthlySubmissions = vi.fn();
const mockGetUserSubscription = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/evidence", async () => {
  const actual = await vi.importActual<typeof import("@/lib/evidence")>("@/lib/evidence");
  return {
    ...actual,
    retrieveEvidence: (...args: any[]) => mockRetrieveEvidence(...args),
  };
});

vi.mock("@/lib/persistence", () => ({
  persistSubmission: (...args: any[]) => mockPersistSubmission(...args),
  countMonthlySubmissions: (...args: any[]) => mockCountMonthlySubmissions(...args),
  getUserSubscription: (...args: any[]) => mockGetUserSubscription(...args),
}));

import { POST } from "@/app/api/score/route";

const VALID_PROFILE = {
  nationality: "Pakistan",
  targetRegion: "canada",
  age: 28,
  education: "master",
  yearsExperience: 4,
  fieldOfWork: "Software Engineer",
  englishTest: "ielts",
  testScore: 7.5,
  savingsUsd: 15000,
  goal: "work",
};

const VERIFIED_IRCC_EVIDENCE: Evidence[] = [
  {
    id: "ev-ircc-1",
    source_id: "ircc-express-entry-fsw",
    authority_tier: 1,
    country: "Canada",
    jurisdiction: "Federal",
    pathway: "Express Entry",
    claim_type: "eligibility",
    source_url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html",
    source_title: "IRCC Express Entry Guidelines",
    verification_status: "VERIFIED",
    human_reviewed_at: new Date().toISOString(),
    human_reviewed_by: "qa_auditor",
    retrieved_at: new Date().toISOString(),
    content_hash: "abc123",
    content: "Federal Skilled Worker requires 1 year continuous skilled work experience and CLB 7 (IELTS 6.0).",
  },
];

function makeRequest(body: unknown, ip = `1.2.3.${Math.floor(Math.random() * 200)}`) {
  return new Request("http://localhost/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/score — input validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: null });
  });

  it("rejects missing nationality", async () => {
    const res = await POST(makeRequest({ ...VALID_PROFILE, nationality: "" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("rejects out-of-range age", async () => {
    const res = await POST(makeRequest({ ...VALID_PROFILE, age: 120 }));
    expect(res.status).toBe(400);
  });

  it("rejects unknown targetRegion", async () => {
    const res = await POST(makeRequest({ ...VALID_PROFILE, targetRegion: "mars" }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid goal", async () => {
    const res = await POST(makeRequest({ ...VALID_PROFILE, goal: "vacation" }));
    expect(res.status).toBe(400);
  });

  it("rejects negative savings", async () => {
    const res = await POST(makeRequest({ ...VALID_PROFILE, savingsUsd: -1 }));
    expect(res.status).toBe(400);
  });

  it("rejects out-of-bounds IELTS score (> 9)", async () => {
    const res = await POST(makeRequest({ ...VALID_PROFILE, englishTest: "ielts", testScore: 15 }));
    expect(res.status).toBe(400);
  });

  it("accepts diacritics/apostrophes in nationality and slash in fieldOfWork", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    mockRetrieveEvidence.mockResolvedValue([]);
    const res = await POST(
      makeRequest({
        ...VALID_PROFILE,
        nationality: "Côte d'Ivoire",
        fieldOfWork: "AI/ML Engineering",
      }, `accents-${Date.now()}`)
    );
    // Passes schema validation (reaches evidence gate 503 instead of 400)
    expect(res.status).toBe(503);
  });
});

describe("POST /api/score — rate limiting & quota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: null });
    mockRetrieveEvidence.mockResolvedValue([]);
    process.env.OPENAI_API_KEY = "sk-test-key";
  });

  it("returns 429 after 20 requests from the same IP", async () => {
    const ip = `test-rate-${Date.now()}`;
    for (let i = 0; i < 20; i++) {
      await POST(makeRequest(VALID_PROFILE, ip));
    }
    const res = await POST(makeRequest(VALID_PROFILE, ip));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("returns 402 when free signed-in user exceeds monthly assessment quota", async () => {
    mockAuth.mockResolvedValue({ userId: "user_free_quota" });
    mockGetUserSubscription.mockResolvedValue({
      userId: "user_free_quota",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      plan: "free",
      status: "active",
      currentPeriodEnd: null,
    });
    mockCountMonthlySubmissions.mockResolvedValue(5);

    const res = await POST(makeRequest(VALID_PROFILE, `quota-${Date.now()}`));
    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.upgradeRequired).toBe(true);
  });
});

describe("POST /api/score — evidence grounding, citation sanitization & deterministic evaluator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "sk-test-key";
    mockAuth.mockResolvedValue({ userId: "user_test_123" });
    mockGetUserSubscription.mockResolvedValue(null);
    mockCountMonthlySubmissions.mockResolvedValue(0);
    mockPersistSubmission.mockResolvedValue(undefined);
  });

  it("fails closed with 503 NO_VERIFIED_EVIDENCE when evidence list is empty", async () => {
    mockRetrieveEvidence.mockResolvedValue([]);
    const res = await POST(makeRequest(VALID_PROFILE, `failclosed-${Date.now()}`));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.code).toBe("NO_VERIFIED_EVIDENCE");
  });

  it("returns 200 with deterministic requirements populated and strips hallucinated citations", async () => {
    mockRetrieveEvidence.mockResolvedValue(VERIFIED_IRCC_EVIDENCE);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            usage: { prompt_tokens: 400, completion_tokens: 200 },
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    summary: "Strong skilled worker profile for Canada.",
                    pathways: [
                      {
                        name: "Express Entry (FSW / CEC)",
                        country: "Canada",
                        baseScore: 84,
                        reason: "Strong software engineering background with Master's degree and IELTS 7.5.",
                        weaknesses: ["No Canadian work experience"],
                        documents: ["IELTS TRF", "WES ECA", "Passport copy"],
                        next_steps: ["Submit Express Entry profile"],
                        citations: [
                          {
                            title: "IRCC Express Entry Guidelines",
                            url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html",
                          },
                          {
                            title: "Hallucinated Visa Blog",
                            url: "https://fake-hallucinated.example/canada-visa",
                          },
                        ],
                        estimated_timeline: "12-18 months",
                        top_improvement: "Obtain a Canadian job offer",
                        eligibilityStatus: "ELIGIBLE",
                        source_freshness: "VERIFIED",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const res = await POST(makeRequest(VALID_PROFILE, `mock-ip-${Date.now()}`));
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(Array.isArray(json.pathways)).toBe(true);
    const top = json.pathways[0];
    expect(top.pathwayId).toBe("ca-express-entry");
    expect(top.name).toBe("Express Entry (FSW / CEC)");
    expect(top.baseScore).toBe(84);
    expect(top.estimated_timeline).toBe("12-18 months");
    expect(top.top_improvement).toBeTruthy();

    // Verify retrieveEvidence was invoked with undefined pathwayId (NULL filter_pathway in SQL)
    expect(mockRetrieveEvidence).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      undefined,
      12
    );

    // Deterministic evaluator populated satisfiedRequirements instead of empty []
    expect(top.satisfiedRequirements.length).toBeGreaterThan(0);

    // Citation sanitizer stripped fake-hallucinated.example while keeping verified IRCC URL
    expect(top.citations).toEqual([
      {
        title: "IRCC Express Entry Guidelines",
        url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html",
      },
    ]);

    // Persistence received full extended fields
    expect(mockPersistSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_test_123",
        result: expect.objectContaining({
          overall_score: 84,
          summary: "Strong skilled worker profile for Canada.",
        }),
      })
    );
  });
});
