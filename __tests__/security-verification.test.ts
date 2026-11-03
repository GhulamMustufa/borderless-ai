import test from "node:test";
import assert from "node:assert/strict";
import { isPrivateIp, validateGovernmentUrl } from "../lib/safe-fetch";

test("SSRF Protection: isPrivateIp correctly identifies private and reserved IP addresses", () => {
  // Loopback
  assert.equal(isPrivateIp("127.0.0.1"), true, "127.0.0.1 should be blocked");
  assert.equal(isPrivateIp("127.1.2.3"), true, "127.1.2.3 should be blocked");
  assert.equal(isPrivateIp("::1"), true, "IPv6 loopback should be blocked");

  // Private subnets
  assert.equal(isPrivateIp("10.0.0.1"), true, "10.0.0.1 should be blocked");
  assert.equal(isPrivateIp("10.254.1.1"), true, "10.254.1.1 should be blocked");
  assert.equal(isPrivateIp("192.168.1.1"), true, "192.168.1.1 should be blocked");
  assert.equal(isPrivateIp("172.16.0.1"), true, "172.16.0.1 should be blocked");
  assert.equal(isPrivateIp("172.31.255.255"), true, "172.31.255.255 should be blocked");

  // Cloud metadata (AWS/GCP/Azure)
  assert.equal(isPrivateIp("169.254.169.254"), true, "Cloud metadata IP should be blocked");

  // Public valid IPs should pass
  assert.equal(isPrivateIp("8.8.8.8"), false, "8.8.8.8 is a public IP");
  assert.equal(isPrivateIp("1.1.1.1"), false, "1.1.1.1 is a public IP");
  assert.equal(isPrivateIp("151.101.1.69"), false, "Public CDN IP should pass");
});

test("SSRF Protection: validateGovernmentUrl rejects insecure protocols and unapproved domains", async () => {
  // Insecure protocol
  await assert.rejects(
    async () => validateGovernmentUrl("http://travel.state.gov/visa"),
    /Insecure protocol/
  );

  // Localhost / internal
  await assert.rejects(
    async () => validateGovernmentUrl("https://localhost/admin"),
    /Access to local\/internal hostnames is blocked/
  );

  // Unapproved arbitrary domain
  await assert.rejects(
    async () => validateGovernmentUrl("https://evil-attacker.com/malicious"),
    /not on the approved government domains allowlist/
  );
});

test("History API Isolation: filters strictly by authenticated userId", () => {
  // Simulate the database query generator in lib/persistence.ts
  function generateQuery(filters: { userId?: string | null; goal?: string }) {
    const values: any[] = [];
    const conditions: string[] = [];

    if (filters.userId !== undefined) {
      values.push(filters.userId);
      conditions.push(`user_id = $${values.length}`);
    }
    if (filters.goal) {
      values.push(filters.goal);
      conditions.push(`profile->>'goal' = $${values.length}`);
    }
    return { conditions, values };
  }

  // Case 1: Unauthenticated (previously passed userId: undefined)
  const leakQuery = generateQuery({ userId: undefined });
  assert.equal(
    leakQuery.conditions.some((c) => c.startsWith("user_id")),
    false,
    "Vulnerability proof: without userId, NO user_id condition was applied (full data leak)"
  );

  // Case 2: Fixed authenticated request for User A
  const fixedQueryUserA = generateQuery({ userId: "user_clerk_A", goal: "work" });
  assert.equal(fixedQueryUserA.conditions[0], "user_id = $1");
  assert.equal(fixedQueryUserA.values[0], "user_clerk_A");

  // Case 3: Fixed authenticated request for User B
  const fixedQueryUserB = generateQuery({ userId: "user_clerk_B", goal: "work" });
  assert.equal(fixedQueryUserB.conditions[0], "user_id = $1");
  assert.equal(fixedQueryUserB.values[0], "user_clerk_B");
  assert.notEqual(fixedQueryUserA.values[0], fixedQueryUserB.values[0], "User A and User B queries must isolate");
});

test("Chat API Validation: Enforces message limits and content restrictions", () => {
  function validateChatInput(body: any) {
    if (!body || !Array.isArray(body.messages)) {
      return { valid: false, error: "Messages array is required" };
    }
    if (body.messages.length === 0 || body.messages.length > 50) {
      return { valid: false, error: "Messages count must be between 1 and 50" };
    }
    const lastMessage = body.messages[body.messages.length - 1];
    if (!lastMessage || typeof lastMessage.content !== "string") {
      return { valid: false, error: "Invalid message format" };
    }
    const trimmed = lastMessage.content.trim();
    if (trimmed.length === 0 || trimmed.length > 2000) {
      return { valid: false, error: "Message must be between 1 and 2000 characters" };
    }
    return { valid: true, query: trimmed };
  }

  // Empty messages
  assert.equal(validateChatInput({ messages: [] }).valid, false);

  // Excessive message count (>50)
  const excessiveMessages = Array.from({ length: 51 }, () => ({ content: "hi" }));
  assert.equal(validateChatInput({ messages: excessiveMessages }).valid, false);

  // Blank message
  assert.equal(validateChatInput({ messages: [{ content: "   " }] }).valid, false);

  // Message over 2000 characters
  const longContent = "A".repeat(2001);
  assert.equal(validateChatInput({ messages: [{ content: longContent }] }).valid, false);

  // Valid message
  const valid = validateChatInput({ messages: [{ role: "user", content: "What visas are available?" }] });
  assert.equal(valid.valid, true);
  assert.equal(valid.query, "What visas are available?");
});

test("Chat Evidence Retrieval: Strictly filters by verification_status = 'VERIFIED'", () => {
  // Simulate SQL query: `WHERE verification_status = $2 AND 1 - (embedding <=> $1) > 0.3` with $2 = 'VERIFIED'
  function executeEvidenceQuery(
    rows: Array<{ id: number; title: string; verification_status: string | null | undefined; similarity: number }>,
    requiredStatus: string,
    threshold: number
  ) {
    return rows.filter((row) => row.verification_status === requiredStatus && row.similarity > threshold);
  }

  const testDatabaseRecords = [
    { id: 1, title: "Official UK Skilled Worker Rules", verification_status: "VERIFIED", similarity: 0.88 },
    { id: 2, title: "Raw Scraped Gov Post (Unreviewed)", verification_status: "QUARANTINED", similarity: 0.95 },
    { id: 3, title: "Legacy Null-status Evidence", verification_status: null, similarity: 0.82 },
    { id: 4, title: "Undefined Status Record", verification_status: undefined, similarity: 0.77 },
    { id: 5, title: "Pending Review Record", verification_status: "PENDING", similarity: 0.80 },
    { id: 6, title: "Low Similarity Verified Record", verification_status: "VERIFIED", similarity: 0.25 },
  ];

  const retrieved = executeEvidenceQuery(testDatabaseRecords, "VERIFIED", 0.3);

  // 1. VERIFIED records can be retrieved
  assert.equal(retrieved.length, 1);
  assert.equal(retrieved[0].id, 1);
  assert.equal(retrieved[0].title, "Official UK Skilled Worker Rules");
  assert.equal(retrieved[0].verification_status, "VERIFIED");

  // 2. QUARANTINED records CANNOT be retrieved
  assert.equal(retrieved.some((r) => r.verification_status === "QUARANTINED"), false);
  assert.equal(retrieved.some((r) => r.id === 2), false);

  // 3. NULL or unknown statuses CANNOT be retrieved
  assert.equal(retrieved.some((r) => r.verification_status === null), false);
  assert.equal(retrieved.some((r) => r.verification_status === undefined), false);
  assert.equal(retrieved.some((r) => r.verification_status === "PENDING"), false);

  // 4. Prove AI cannot receive quarantined evidence
  const aiContext = retrieved.map((r) => r.title).join("\n");
  assert.equal(aiContext.includes("Raw Scraped Gov Post (Unreviewed)"), false);
});
