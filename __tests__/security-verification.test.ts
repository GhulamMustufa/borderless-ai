import { describe, it, expect, vi, beforeEach } from "vitest";
import { isPrivateIp, validateGovernmentUrl } from "@/lib/safe-fetch";
import { isEvidenceEligible, filterByAuthority } from "@/lib/evidence";
import type { Evidence } from "@/lib/types";

const mockAuth = vi.fn();
const mockListRecentSubmissions = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/persistence", () => ({
  listRecentSubmissions: (args: any) => mockListRecentSubmissions(args),
  listUserThreads: vi.fn().mockResolvedValue([]),
  getOrCreateThread: vi.fn().mockResolvedValue(null),
  getThreadMessages: vi.fn().mockResolvedValue([]),
  saveChatMessage: vi.fn().mockResolvedValue(undefined),
}));

import { GET as getHistory } from "@/app/api/history/route";
import { GET as getChat, POST as postChat } from "@/app/api/chat/route";

describe("Security Verification Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("SSRF Protection: isPrivateIp identifies private, loopback, and metadata IPs", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("127.1.2.3")).toBe(true);
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("172.16.0.1")).toBe(true);
    expect(isPrivateIp("172.31.255.255")).toBe(true);
    expect(isPrivateIp("169.254.169.254")).toBe(true);

    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("1.1.1.1")).toBe(false);
    expect(isPrivateIp("151.101.1.69")).toBe(false);
  });

  it("SSRF Protection: validateGovernmentUrl rejects insecure protocols, localhost, and non-gov domains", async () => {
    await expect(validateGovernmentUrl("http://travel.state.gov/visa")).rejects.toThrow(/Insecure protocol/);
    await expect(validateGovernmentUrl("https://localhost/admin")).rejects.toThrow(/local\/internal hostnames/);
    await expect(validateGovernmentUrl("https://evil-attacker.com/malicious")).rejects.toThrow(
      /not on the approved government domains allowlist/
    );
  });

  it("History API Isolation: real GET /api/history requires auth and scopes by userId", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const unauthRes = await getHistory(new Request("http://localhost/api/history"));
    expect(unauthRes.status).toBe(401);
    expect(mockListRecentSubmissions).not.toHaveBeenCalled();

    mockAuth.mockResolvedValue({ userId: "user_real_A" });
    mockListRecentSubmissions.mockResolvedValue([{ id: 1 }]);
    const authRes = await getHistory(new Request("http://localhost/api/history?goal=work"));
    expect(authRes.status).toBe(200);
    expect(mockListRecentSubmissions).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user_real_A", goal: "work" })
    );
  });

  it("Chat API Auth & Input Validation: rejects unauthenticated callers, empty arrays, and >2000 char payloads", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const unauthGetRes = await getChat(new Request("http://localhost/api/chat"));
    expect(unauthGetRes.status).toBe(401);

    const unauthRes = await postChat(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
      })
    );
    expect(unauthRes.status).toBe(401);

    mockAuth.mockResolvedValue({ userId: "user_chat_sec" });

    const emptyRes = await postChat(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: [] }),
      })
    );
    expect(emptyRes.status).toBe(400);

    const tooManyRes = await postChat(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: Array.from({ length: 51 }, () => ({ role: "user", content: "hi" })) }),
      })
    );
    expect(tooManyRes.status).toBe(400);

    const longRes = await postChat(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: [{ role: "user", content: "A".repeat(2001) }] }),
      })
    );
    expect(longRes.status).toBe(400);
  });

  it("Evidence Eligibility Gate: blocks QUARANTINED, PENDING, null-reviewer, and Tier 4/5 records", () => {
    const now = new Date("2026-11-10T00:00:00Z");
    const base: Evidence = {
      id: "ev-1",
      source_id: "src-1",
      authority_tier: 1,
      country: "United Kingdom",
      pathway: "Skilled Worker visa",
      claim_type: "salary",
      source_url: "https://www.gov.uk/skilled-worker-visa",
      source_title: "UK Skilled Worker",
      verification_status: "VERIFIED",
      human_reviewed_at: "2026-11-01T00:00:00Z",
      human_reviewed_by: "auditor_1",
      retrieved_at: "2026-11-01T00:00:00Z",
      content_hash: "hash-1",
      content: "Minimum salary is £38,700.",
    };

    const filtered = filterByAuthority(
      [
        base,
        { ...base, id: "ev-2", verification_status: "QUARANTINED" },
        { ...base, id: "ev-3", verification_status: "PENDING" },
        { ...base, id: "ev-4", human_reviewed_by: "   " },
        { ...base, id: "ev-5", authority_tier: 4 },
      ],
      now
    );

    expect(filtered.map((e) => e.id)).toEqual(["ev-1"]);
    expect(isEvidenceEligible({ ...base, verification_status: "QUARANTINED" }, now)).toBe(false);
  });
});
