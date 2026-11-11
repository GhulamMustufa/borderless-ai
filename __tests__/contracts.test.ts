import { describe, it, expect, vi, beforeEach } from "vitest";
import { REGIONS, EXPLORE_TO_FORM_REGION_MAP } from "@/lib/regions";
import {
  detectCountriesFromQuery,
  detectUnsupportedCountryFromQuery,
  resolveThreadCountryContext,
  isContextualImmigrationFollowUp,
} from "@/lib/countries";
import { getPathwaysForRegion } from "@/lib/domain";
import { normalizeProfile } from "@/lib/profile";
import { evaluatePathwayForProfile, sanitizeCitationsForPathway } from "@/lib/evaluator";
import { resolveTrustedOrigin } from "@/lib/stripe";
import { profileSchema } from "@/lib/validation";
import type { Evidence, VisaProfile } from "@/lib/types";

const mockAuth = vi.fn();
const mockGetStripe = vi.fn();
const mockGetUserSubscriptionByCustomerId = vi.fn();
const mockUpsertUserSubscription = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/stripe", async () => {
  const actual = await vi.importActual<typeof import("@/lib/stripe")>("@/lib/stripe");
  return {
    ...actual,
    getStripe: () => mockGetStripe(),
  };
});

vi.mock("@/lib/persistence", () => ({
  getUserSubscriptionByCustomerId: (id: string) => mockGetUserSubscriptionByCustomerId(id),
  upsertUserSubscription: (params: any) => mockUpsertUserSubscription(params),
  listUserThreads: vi.fn().mockResolvedValue([]),
  getOrCreateThread: vi.fn().mockResolvedValue("thread-uuid-1"),
  getThreadMessages: vi.fn().mockResolvedValue([]),
  saveChatMessage: vi.fn().mockResolvedValue(undefined),
}));

import { POST as postStripeWebhook } from "@/app/api/webhooks/stripe/route";

describe("Platform Contract & Regression Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("REGIONS -> /form?region=... mapping covers every /explore region card (including anz)", () => {
    for (const region of REGIONS) {
      expect(EXPLORE_TO_FORM_REGION_MAP[region.id]).toBeDefined();
    }
    expect(EXPLORE_TO_FORM_REGION_MAP["anz"].targetRegion).toBe("australia-new-zealand");
  });

  it("getPathwaysForRegion returns empty array for uncertified/unknown regions instead of global fallback", () => {
    expect(getPathwaysForRegion("canada").length).toBeGreaterThan(0);
    expect(getPathwaysForRegion("non-existent-region" as any)).toEqual([]);
  });

  it("Country scoping separates unsupported destinations (Singapore) from unknown country", () => {
    const q = "What are the visa requirements to work in Singapore?";
    expect(detectCountriesFromQuery(q)).toEqual([]);
    expect(detectUnsupportedCountryFromQuery(q)).toEqual(["Singapore"]);

    const originAndDest = "I live in Malaysia but want a work visa for Singapore.";
    expect(detectCountriesFromQuery(originAndDest)).toEqual([]);
    expect(detectUnsupportedCountryFromQuery(originAndDest)).toEqual(["Singapore"]);
  });

  it("Multi-turn thread context inherits Canada on follow-up questions without inheriting assistant example lists", () => {
    const ctx = resolveThreadCountryContext([
      { role: "user", parts: [{ type: "text", text: "What are the visa rules in Canada for skilled workers?" }] },
      { role: "assistant", parts: [{ type: "text", text: "Express Entry is Canada's main system." }] },
      { role: "user", parts: [{ type: "text", text: "Do I need an English test or proof of funds for it?" }] },
    ]);

    expect(ctx.countries).toEqual(["Canada"]);
    expect(ctx.inheritedFromHistory).toBe(true);
    expect(isContextualImmigrationFollowUp("Do I need an English test or proof of funds for it?", ctx.hasPriorImmigrationTurn)).toBe(true);

    // Ensure Case A assistant example list doesn't pollute follow-up
    const ctxAfterCaseA = resolveThreadCountryContext([
      { role: "user", parts: [{ type: "text", text: "What work visas can I get?" }] },
      {
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "Please specify a country (for example: Canada, the United Kingdom, the United States, Australia, or Germany).",
          },
        ],
      },
      { role: "user", parts: [{ type: "text", text: "What documents are required?" }] },
    ]);
    expect(ctxAfterCaseA.countries).toEqual([]);
  });

  it("Deterministic evaluator populates satisfiedRequirements, blockingRequirements, marginalImprovements & topWhatIfScenario", () => {
    const profile: VisaProfile = {
      nationality: "India",
      targetRegion: "uk",
      age: 30,
      education: "master",
      yearsExperience: 5,
      fieldOfWork: "Software Engineer",
      englishTest: "ielts",
      testScore: 7.5,
      savingsUsd: 20000,
      goal: "work",
      hasJobOffer: false,
    };
    const norm = normalizeProfile(profile);
    const pathways = getPathwaysForRegion("uk");
    const ukEvidence: Evidence[] = [
      {
        id: "uk-1",
        source_id: "uk-swv",
        authority_tier: 1,
        country: "United Kingdom",
        pathway: "Skilled Worker visa",
        claim_type: "eligibility",
        source_url: "https://www.gov.uk/skilled-worker-visa",
        source_title: "GOV.UK Skilled Worker",
        verification_status: "VERIFIED",
        human_reviewed_at: new Date().toISOString(),
        human_reviewed_by: "auditor",
        retrieved_at: new Date().toISOString(),
        content_hash: "h1",
        content: "Requires Certificate of Sponsorship and £38,700 salary.",
      },
    ];

    const res = evaluatePathwayForProfile({
      aiName: "Skilled Worker Visa",
      aiCountry: "United Kingdom",
      regionPathways: pathways,
      profile: norm,
      evidenceList: ukEvidence,
    });

    expect(res.pathwayId).toBe("uk-skilled-worker");
    expect(res.satisfiedRequirements.some((r) => r.id === "req-uk-lang")).toBe(true);
    expect(res.blockingRequirements.some((r) => r.id === "req-uk-sponsor")).toBe(true);
    expect(res.marginalImprovements.length).toBeGreaterThan(0);
    expect(res.topWhatIfScenario?.targetAction.requirementId).toBeTruthy();

    // Non-domain DB pathway (e.g. Canada Study Permit) gets verified profile strengths instead of []
    const studyRes = evaluatePathwayForProfile({
      aiName: "Study Permit",
      aiCountry: "Canada",
      regionPathways: getPathwaysForRegion("canada"),
      profile: norm,
      evidenceList: ukEvidence,
    });
    expect(studyRes.satisfiedRequirements.length).toBeGreaterThan(0);
  });

  it("Citation sanitizer rejects unverified URLs and backstops with verified country evidence", () => {
    const ev: Evidence[] = [
      {
        id: "ev-ca",
        source_id: "ircc-1",
        authority_tier: 1,
        country: "Canada",
        pathway: "Express Entry",
        claim_type: "funds",
        source_url: "https://www.canada.ca/en/express-entry.html",
        source_title: "IRCC Express Entry",
        verification_status: "VERIFIED",
        human_reviewed_at: new Date().toISOString(),
        human_reviewed_by: "auditor",
        retrieved_at: new Date().toISOString(),
        content_hash: "h2",
        content: "Funds required",
      },
    ];

    const sanitized = sanitizeCitationsForPathway(
      [{ title: "Fake", url: "https://evil.example.com/ircc" }],
      ev,
      "Canada",
      "Express Entry"
    );

    expect(sanitized.invalidUrls).toEqual(["https://evil.example.com/ircc"]);
    expect(sanitized.citations).toEqual([
      { title: "IRCC Express Entry", url: "https://www.canada.ca/en/express-entry.html" },
    ]);
  });

  it("profileSchema allows accented nationality & slashes while validating TOEFL/IELTS bounds", () => {
    expect(
      profileSchema.safeParse({
        nationality: "Côte d'Ivoire",
        targetRegion: "canada",
        age: 26,
        education: "bachelor",
        yearsExperience: 2,
        fieldOfWork: "AI/ML & Data",
        englishTest: "toefl",
        testScore: 105,
        savingsUsd: 15000,
        goal: "work",
      }).success
    ).toBe(true);

    expect(
      profileSchema.safeParse({
        nationality: "Canada",
        targetRegion: "uk",
        age: 26,
        education: "bachelor",
        yearsExperience: 2,
        fieldOfWork: "Engineering",
        englishTest: "toefl",
        testScore: 999,
        savingsUsd: 15000,
        goal: "work",
      }).success
    ).toBe(false);
  });

  it("Stripe origin allowlist rejects spoofed Origin headers and webhook falls back to customer lookup & returns 500 on DB failure", async () => {
    const prevSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://borderless-ai.com";

    const spoofReq = new Request("https://borderless-ai.com/api/create-checkout", {
      method: "POST",
      headers: { origin: "https://borderless-ai.com.attacker.evil" },
    });
    expect(resolveTrustedOrigin(spoofReq)).toBe("https://borderless-ai.com");

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    mockGetStripe.mockReturnValue({
      webhooks: {
        constructEvent: () => ({
          type: "customer.subscription.deleted",
          data: {
            object: {
              id: "sub_123",
              customer: "cus_abc",
              metadata: {}, // Missing metadata.userId -> must resolve via customerId!
            },
          },
        }),
      },
    });
    mockGetUserSubscriptionByCustomerId.mockResolvedValue({
      userId: "user_resolved_from_customer",
      stripeCustomerId: "cus_abc",
      stripeSubscriptionId: "sub_123",
      plan: "pro",
      status: "active",
      currentPeriodEnd: null,
    });
    mockUpsertUserSubscription.mockRejectedValueOnce(new Error("DB timeout"));

    const res = await postStripeWebhook(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_valid" },
        body: "{}",
      })
    );
    expect(mockGetUserSubscriptionByCustomerId).toHaveBeenCalledWith("cus_abc");
    expect(res.status).toBe(500);

    process.env.NEXT_PUBLIC_SITE_URL = prevSiteUrl;
  });
});

