import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Clerk auth
const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

// Mock persistence layer
const mockListRecentSubmissions = vi.fn();
vi.mock("@/lib/persistence", () => ({
  listRecentSubmissions: (args: any) => mockListRecentSubmissions(args),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  log: vi.fn(),
}));

import { GET } from "@/app/api/history/route";

describe("GET /api/history - Authentication and Access Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests with HTTP 401", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const req = new Request("http://localhost/api/history?limit=10");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Unauthorized");
    expect(mockListRecentSubmissions).not.toHaveBeenCalled();
  });

  it("restricts data fetching strictly to the authenticated user (User A)", async () => {
    mockAuth.mockResolvedValue({ userId: "user_A" });
    const userARecords = [
      {
        id: 1,
        createdAt: "2026-11-01T00:00:00Z",
        targetRegion: "canada",
        goal: "work",
        verdict: "Eligible",
        totalScore: 85,
        breakdown: {},
        recommendations: [],
      },
    ];
    mockListRecentSubmissions.mockResolvedValue(userARecords);

    const req = new Request("http://localhost/api/history?limit=10&goal=work");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual(userARecords);
    // Verified that userId passed to database query is strictly the authenticated user
    expect(mockListRecentSubmissions).toHaveBeenCalledWith({
      limit: 10,
      goal: "work",
      region: undefined,
      userId: "user_A",
    });
  });

  it("prevents User A from seeing User B's records", async () => {
    // User A is logged in
    mockAuth.mockResolvedValue({ userId: "user_A" });
    mockListRecentSubmissions.mockImplementation(async ({ userId }) => {
      // Simulate database row filtering by user_id
      const allDatabaseRecords = [
        { id: 1, userId: "user_A", targetRegion: "canada" },
        { id: 2, userId: "user_B", targetRegion: "germany-nordics" },
      ];
      return allDatabaseRecords.filter((record) => record.userId === userId);
    });

    const req = new Request("http://localhost/api/history");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].userId).toBe("user_A");
    expect(body.items.some((item: any) => item.userId === "user_B")).toBe(false);
  });
});
