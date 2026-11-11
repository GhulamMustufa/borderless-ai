import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { evaluateSynthesizerOutput } from "../lib/critic";
import { openAiCircuitBreaker } from "../lib/circuit-breaker";
import type { DeterministicEvaluation, Evidence } from "../lib/types";

describe("AI Critic Agent", () => {
  const mockEvaluations: DeterministicEvaluation[] = [
    {
      pathwayId: "ca-express-entry",
      status: "BLOCKED",
      baseScore: 50,
      maxScore: 100,
      scoreBreakdown: { eligibilityFit: 0, profileStrength: 50, evidenceQuality: 100, competitiveness: 50 },
      satisfiedRequirements: [],
      missingRequirements: [],
      blockingRequirements: [],
      marginalImprovements: [],
    },
  ];

  const mockEvidence: Evidence[] = [
    {
      id: "1",
      source_id: "gov-1",
      authority_tier: 1,
      country: "Canada",
      jurisdiction: "canada",
      pathway: "ca-express-entry",
      claim_type: "experience",
      source_url: "https://canada.ca/express-entry",
      source_title: "Express Entry",
      retrieved_at: new Date().toISOString(),
      verification_status: "VERIFIED",
      content_hash: "hash",
      content: "Requires 1 year experience",
    },
  ];

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns critic rejection when mocked LLM output violates rules", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    approved: false,
                    feedback: ["Hallucinated URL https://fake.ca and contradicts BLOCKED status"],
                    hallucinated_claims: ["https://fake.ca", "85% chance of approval"],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const result = await evaluateSynthesizerOutput(
      "sk-test-dummy",
      JSON.stringify({ summary: "85% chance", pathways: [{ name: "ca-express-entry", eligibilityStatus: "ELIGIBLE" }] }),
      mockEvaluations,
      mockEvidence
    );

    expect(result.approved).toBe(false);
    expect(result.feedback.length).toBeGreaterThan(0);
    expect(result.hallucinated_claims).toContain("https://fake.ca");
  });
});

describe("Circuit Breaker", () => {
  beforeEach(async () => {
    await openAiCircuitBreaker.reset();
  });

  it("should trip after 5 failures and reset cleanly on success", async () => {
    expect(await openAiCircuitBreaker.isOpen()).toBe(false);

    for (let i = 0; i < 5; i++) {
      await openAiCircuitBreaker.recordFailure();
    }

    expect(await openAiCircuitBreaker.isOpen()).toBe(true);

    await openAiCircuitBreaker.recordSuccess();
    expect(await openAiCircuitBreaker.isOpen()).toBe(false);
  });
});
