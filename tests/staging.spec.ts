import { test, expect } from '@playwright/test';
import { Pool } from 'pg';

const isLiveEnabled = process.env.RUN_LIVE_STAGING_E2E === '1';
const PROD_DB_MARKER = 'ep-wandering-flower-b3odgvt9';
const QA_API_FIELD_MARKER = 'Software Engineering / QAStagingVerify';
const QA_UI_SAVINGS_MARKER = 24321;

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function getStagingPool(): Pool {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    throw new Error('DATABASE_URL must be set for live staging E2E.');
  }
  if (dbUrl.includes(PROD_DB_MARKER)) {
    throw new Error('ABORTED: Refusing to run live staging E2E against production DATABASE_URL.');
  }
  return new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: true },
  });
}

test.describe('Live Staging End-to-End Verification', () => {
  test.skip(!isLiveEnabled, 'Set RUN_LIVE_STAGING_E2E=1 with staging env vars to execute live staging E2E.');
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  let pool: Pool;
  let validDbUrls = new Set<string>();
  let clerkUserId: string | null = null;

  test.beforeAll(async () => {
    pool = getStagingPool();
    const res = await pool.query<{ source_url: string }>(
      `SELECT DISTINCT source_url FROM immigration_evidence WHERE verification_status = 'VERIFIED'`,
    );
    validDbUrls = new Set(res.rows.map((r) => normalizeUrl(r.source_url)));
  });

  test.afterAll(async () => {
    const errors: string[] = [];

    if (pool) {
      try {
        if (clerkUserId) {
          await pool.query(
            `DELETE FROM chat_messages WHERE thread_id IN (SELECT id FROM chat_threads WHERE user_id = $1)`,
            [clerkUserId],
          );
          await pool.query(`DELETE FROM chat_threads WHERE user_id = $1`, [clerkUserId]);
          await pool.query(`DELETE FROM visa_submissions WHERE user_id = $1`, [clerkUserId]);
        }
        await pool.query(
          `DELETE FROM visa_submissions WHERE profile->>'fieldOfWork' = $1 OR (profile->>'savingsUsd')::int = $2`,
          [QA_API_FIELD_MARKER, QA_UI_SAVINGS_MARKER],
        );
      } catch (err) {
        errors.push(`DB cleanup error: ${(err as Error).message}`);
      } finally {
        await pool.end();
      }
    }

    if (clerkUserId && process.env.CLERK_SECRET_KEY) {
      try {
        const delRes = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(clerkUserId)}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          },
        });
        if (!delRes.ok && delRes.status !== 404) {
          errors.push(`Clerk user delete returned HTTP ${delRes.status}`);
        }
      } catch (err) {
        errors.push(`Clerk cleanup error: ${(err as Error).message}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Staging cleanup encountered errors: ${errors.join(' | ')}`);
    }
  });

  test('Layer 1: Staging PostgreSQL evidence coverage & <180d human-review freshness audit', async () => {
    const certifiedCountries = [
      'Canada',
      'United Kingdom',
      'United States',
      'Germany',
      'Australia',
      'New Zealand',
    ];

    const res = await pool.query<{
      country: string;
      eligible_count: string;
      newest_age_days: string;
      oldest_age_days: string;
    }>(
      `
      SELECT
        country,
        COUNT(*) AS eligible_count,
        ROUND(EXTRACT(EPOCH FROM (NOW() - MAX(human_reviewed_at))) / 86400.0, 1) AS newest_age_days,
        ROUND(EXTRACT(EPOCH FROM (NOW() - MIN(human_reviewed_at))) / 86400.0, 1) AS oldest_age_days
      FROM immigration_evidence
      WHERE verification_status = 'VERIFIED'
        AND human_reviewed_at IS NOT NULL
        AND human_reviewed_at <= NOW()
        AND human_reviewed_by IS NOT NULL
        AND human_reviewed_by !~ '^[[:space:]]*$'
        AND authority_tier BETWEEN 1 AND 3
        AND (effective_until IS NULL OR effective_until >= NOW())
        AND (effective_from IS NULL OR effective_from <= NOW())
        AND (effective_until IS NOT NULL OR human_reviewed_at >= NOW() - INTERVAL '180 days')
      GROUP BY country
      `,
    );

    const byCountry = new Map(res.rows.map((r) => [r.country, r]));
    for (const country of certifiedCountries) {
      const row = byCountry.get(country);
      expect(row, `Expected eligible verified evidence for ${country}`).toBeDefined();
      const count = Number(row?.eligible_count || 0);
      const oldestAge = Number(row?.oldest_age_days || 0);
      expect(count).toBeGreaterThan(0);
      expect(oldestAge).toBeLessThan(180);
      if (oldestAge >= 150) {
        console.warn(`[WARN] Staging evidence for ${country} has rows aged ${oldestAge}d (approaching 180d horizon).`);
      }
    }
  });

  test('Layer 2: Live /api/score regional matrix, fail-closed gating, citations & 401 boundaries', async ({ request }) => {
    // 1. Auth & validation boundaries
    const unauthChatGet = await request.get('/api/chat');
    expect(unauthChatGet.status()).toBe(401);

    const unauthChatPost = await request.post('/api/chat', {
      data: { messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'Canada Express Entry' }] }] },
    });
    expect(unauthChatPost.status()).toBe(401);

    const unauthHistory = await request.get('/api/history');
    expect(unauthHistory.status()).toBe(401);

    const invalidScoreRes = await request.post('/api/score', {
      data: {
        nationality: 'India',
        targetRegion: 'canada',
        age: 29,
        education: 'master',
        yearsExperience: 5,
        fieldOfWork: QA_API_FIELD_MARKER,
        englishTest: 'ielts',
        testScore: 15,
        savingsUsd: 25000,
        goal: 'pr',
      },
    });
    expect(invalidScoreRes.status()).toBe(400);

    const unsupportedRegionRes = await request.post('/api/score', {
      data: {
        nationality: 'USA',
        targetRegion: 'southern-europe',
        age: 35,
        education: 'bachelor',
        yearsExperience: 6,
        fieldOfWork: QA_API_FIELD_MARKER,
        englishTest: 'none',
        testScore: null,
        savingsUsd: 50000,
        goal: 'work',
      },
    });
    expect(unsupportedRegionRes.status()).toBe(503);

    // 2. All 5 certified beta regions end-to-end
    const regionCases = [
      { targetRegion: 'canada', goal: 'pr', hasJobOffer: false },
      { targetRegion: 'uk', goal: 'work', hasJobOffer: true },
      { targetRegion: 'usa', goal: 'work', hasJobOffer: true },
      { targetRegion: 'germany-nordics', goal: 'work', hasJobOffer: false },
      { targetRegion: 'australia-new-zealand', goal: 'pr', hasJobOffer: false },
    ] as const;

    for (const rc of regionCases) {
      const res = await request.post('/api/score', {
        data: {
          nationality: 'India',
          targetRegion: rc.targetRegion,
          age: 29,
          education: 'master',
          yearsExperience: 5,
          fieldOfWork: QA_API_FIELD_MARKER,
          englishTest: 'ielts',
          testScore: 7.5,
          savingsUsd: 30000,
          goal: rc.goal,
          hasJobOffer: rc.hasJobOffer,
        },
      });
      expect(res.status(), `POST /api/score failed for ${rc.targetRegion}`).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.pathways)).toBe(true);
      expect(data.pathways.length).toBeGreaterThan(0);

      for (const p of data.pathways) {
        expect(typeof p.baseScore).toBe('number');
        expect(p.baseScore).toBeGreaterThanOrEqual(0);
        expect(p.baseScore).toBeLessThanOrEqual(100);
        expect(Array.isArray(p.satisfiedRequirements)).toBe(true);
        expect(p.satisfiedRequirements.length).toBeGreaterThan(0);
        expect(Array.isArray(p.citations)).toBe(true);
        expect(p.citations.length).toBeGreaterThan(0);
        for (const c of p.citations) {
          expect(
            validDbUrls.has(normalizeUrl(c.url)),
            `Citation URL not found in verified staging DB: ${c.url}`,
          ).toBe(true);
        }
      }
    }
  });

  test('Layer 3A: Real /explore -> /form?region=anz -> live /api/score -> /results flow', async ({ page }) => {
    await page.goto('/explore');
    const anzCard = page.locator('article').filter({ hasText: 'Australia / New Zealand' }).first();
    await anzCard.getByRole('link', { name: 'Check My Chances' }).click();

    await expect(page).toHaveURL(/\/form\?region=anz$/);
    await expect(page.locator('#targetRegion')).toHaveValue('australia-new-zealand');

    await page.locator('#nationality').selectOption('India');
    await page.locator('#age').fill('29');
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.locator('#education').selectOption('master');
    await page.locator('#yearsExperience').fill('5');
    await page.locator('#fieldOfWork').selectOption('Software & IT');
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.locator('#englishTest').selectOption('ielts');
    await page.locator('#testScore').fill('7.5');
    await page.locator('#savingsUsd').fill(String(QA_UI_SAVINGS_MARKER));
    await page.locator('input[name="goal"][value="pr"]').check();

    await page.getByRole('button', { name: 'Check My Chances' }).click();
    await expect(page).toHaveURL(/\/results$/, { timeout: 60_000 });

    await expect(page.locator('h1', { hasText: 'Your Visa Plan' })).toBeVisible();
    await expect(page.getByText('No key strengths listed yet.')).toHaveCount(0);
    await expect(page.getByText('What Helps Your Chances').first()).toBeVisible();
    await page.getByRole('button', { name: 'View Official Sources' }).first().click();
    await expect(page.getByText('Official Government Links').first()).toBeVisible();
  });

  test('Layer 3B: Authenticated Clerk user -> multi-turn /chat context & refusal -> /dashboard & /history', async ({ page }) => {
    const clerkSecret = process.env.CLERK_SECRET_KEY;
    if (!clerkSecret) {
      throw new Error('CLERK_SECRET_KEY is required for Layer 3B authenticated staging verification.');
    }

    const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const qaEmail = `qa.staging.${uniqueSuffix}@example.com`;

    const userRes = await fetch('https://api.clerk.com/v1/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${clerkSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: [qaEmail],
        first_name: 'QA',
        last_name: 'Staging',
        skip_password_requirement: true,
        skip_password_checks: true,
      }),
    });
    if (!userRes.ok) {
      throw new Error(`Failed creating temp Clerk user: HTTP ${userRes.status} ${await userRes.text()}`);
    }
    const createdUser = (await userRes.json()) as { id: string };
    clerkUserId = createdUser.id;

    const tokenRes = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${clerkSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: clerkUserId,
        expires_in_seconds: 600,
      }),
    });
    if (!tokenRes.ok) {
      throw new Error(`Failed creating Clerk sign-in token: HTTP ${tokenRes.status} ${await tokenRes.text()}`);
    }
    const tokenPayload = (await tokenRes.json()) as { token: string };

    // Authenticate browser context using Clerk sign-in ticket
    await page.goto('/sign-in');
    await page.waitForFunction(() => Boolean((window as any).Clerk?.loaded), null, { timeout: 20_000 });
    await page.evaluate(async (ticket) => {
      const clerk = (window as any).Clerk;
      const attempt = await clerk.client.signIn.create({
        strategy: 'ticket',
        ticket,
      });
      await clerk.setActive({ session: attempt.createdSessionId });
    }, tokenPayload.token);

    // Multi-turn Chat verification
    await page.goto('/chat');
    const chatInput = page.locator('input[placeholder*="Ask about a visa"]');
    await expect(chatInput).toBeEnabled({ timeout: 20_000 });

    // Turn 1: Canada question
    await chatInput.fill('Does Canada Express Entry require a job offer?');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.prose')).toHaveCount(2, { timeout: 60_000 });
    await expect(page.locator('.animate-bounce').first()).toBeHidden({ timeout: 60_000 });

    // Turn 2: Contextual follow-up without restating "Canada"
    await chatInput.fill('What minimum IELTS and settlement funds does that need?');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.prose')).toHaveCount(4, { timeout: 60_000 });
    await expect(page.locator('.animate-bounce').first()).toBeHidden({ timeout: 60_000 });

    // Verify 1 thread reused across both turns in staging PostgreSQL
    const threadsRes = await pool.query<{ id: string }>(
      `SELECT id FROM chat_threads WHERE user_id = $1`,
      [clerkUserId],
    );
    expect(threadsRes.rows.length).toBe(1);
    const msgsRes = await pool.query<{ role: string; content: string }>(
      `SELECT role, content FROM chat_messages WHERE thread_id = $1 ORDER BY created_at ASC`,
      [threadsRes.rows[0].id],
    );
    expect(msgsRes.rows.length).toBeGreaterThanOrEqual(4);
    const turn2AssistantText = msgsRes.rows[msgsRes.rows.length - 1]?.content || '';
    expect(turn2AssistantText.toLowerCase()).not.toContain('please specify which destination');

    // Start new thread and verify uncertified Singapore query is refused safely
    await page.getByRole('button', { name: '+ New Chat' }).click();
    await expect(page.locator('.prose')).toHaveCount(0);
    await chatInput.fill('What work visa options exist for Singapore?');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.prose')).toHaveCount(2, { timeout: 60_000 });
    await expect(page.locator('.animate-bounce').first()).toBeHidden({ timeout: 60_000 });
    const sgBubble = page.locator('.prose').last();
    await expect(sgBubble).toContainText(/cannot share official visa requirements for singapore/i);
    await expect(sgBubble).toContainText(/currently unavailable/i);

    // Create 1 authenticated score submission and verify /dashboard & /history rehydration
    const authScoreStatus = await page.evaluate(async (markerField) => {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nationality: 'India',
          targetRegion: 'canada',
          age: 29,
          education: 'master',
          yearsExperience: 5,
          fieldOfWork: markerField,
          englishTest: 'ielts',
          testScore: 7.5,
          savingsUsd: 25000,
          goal: 'pr',
          hasJobOffer: false,
        }),
      });
      return res.status;
    }, QA_API_FIELD_MARKER);
    expect(authScoreStatus).toBe(200);

    await page.goto('/dashboard');
    await expect(page.getByText('1 / 5 visa checks used this month')).toBeVisible();
    const recentCard = page.locator('main ul li').first();
    await expect(recentCard).toBeVisible();
    await recentCard.click();

    await expect(page).toHaveURL(/\/results$/);
    await expect(page.locator('h1', { hasText: 'Your Visa Plan' })).toBeVisible();
    await expect(page.getByText('No key strengths listed yet.')).toHaveCount(0);

    await page.goto('/history');
    await expect(page.locator('main ul li').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('main ul li').first()).toContainText(/India.*PR.*canada/i);
  });
});
