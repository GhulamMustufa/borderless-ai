import { test, expect } from '@playwright/test';

test.describe('Core Client & Guest Auth UI Flows (Mocked)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test('/chat enforces guest Sign-In gate with zero free-message tracking or 401 leakage', async ({ page }) => {
    let postChatCalls = 0;

    await page.route('**/api/chat*', async (route) => {
      if (route.request().method() === 'POST') {
        postChatCalls += 1;
        await route.fulfill({
          status: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
        return;
      }
      await route.fulfill({
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    await page.goto('/chat');

    await expect(page.locator('h1', { hasText: 'Borderless AI Immigration Copilot' })).toBeVisible();
    await expect(page.getByTestId('chat-signin-gate')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Sign In to Start Chatting' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In to Continue' })).toBeVisible();

    await expect(page.locator('text=Free Consultation Complete')).toHaveCount(0);
    await expect(page.locator('text=3 free messages')).toHaveCount(0);

    const storedFreeCount = await page.evaluate(() => window.localStorage.getItem('freeMessagesUsed'));
    expect(storedFreeCount).toBeNull();
    expect(postChatCalls).toBe(0);
  });

  test('/explore -> /form?region=anz preselects Australia/New Zealand accurately', async ({ page }) => {
    await page.goto('/explore');
    await expect(page.locator('h1', { hasText: 'Explore Immigration Options by Region' })).toBeVisible();

    const anzCard = page.locator('article').filter({ hasText: 'Australia / New Zealand' }).first();
    await expect(anzCard).toBeVisible();
    await anzCard.getByRole('link', { name: 'Check My Chances' }).click();

    await expect(page).toHaveURL(/\/form\?region=anz$/);
    await expect(page.getByText('Selected region: Australia/New Zealand')).toBeVisible();
    await expect(page.locator('#targetRegion')).toHaveValue('australia-new-zealand');
    await expect(page.getByTestId('uncertified-region-notice')).toHaveCount(0);
  });

  test('/form validates inputs, shows uncertified preview notice, submits hasJobOffer, and renders /results', async ({ page }) => {
    const captured = { payload: null as Record<string, unknown> | null };

    await page.route('**/api/score', async (route) => {
      captured.payload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overall_score: 76,
          summary: 'Mocked assessment grounded in verified UK and Canadian guidance.',
          pathways: [
            {
              pathwayId: 'uk-skilled-worker',
              name: 'Skilled Worker Visa',
              country: 'UK',
              status: 'ELIGIBLE',
              baseScore: 84,
              maxScore: 100,
              scoreBreakdown: {
                eligibilityFit: 84,
                profileStrength: 82,
                evidenceQuality: 100,
                competitiveness: 78,
              },
              satisfiedRequirements: [
                {
                  id: 'req-uk-sponsor',
                  type: 'hard',
                  description: 'Must hold a Certificate of Sponsorship from a licensed UK employer.',
                  pointsAwarded: 50,
                  met: true,
                  scoreImpact: 50,
                },
                {
                  id: 'req-uk-lang',
                  type: 'hard',
                  description: 'English language proficiency of at least CEFR B1 (IELTS 4.0).',
                  pointsAwarded: 10,
                  met: true,
                  scoreImpact: 10,
                },
              ],
              missingRequirements: [],
              blockingRequirements: [],
              marginalImprovements: [],
              reason: 'Applicant meets language and employer sponsorship criteria.',
              weaknesses: ['Visa fees and Immigration Health Surcharge apply'],
              documents: ['Valid passport', 'Certificate of Sponsorship reference'],
              next_steps: ['Obtain official Certificate of Sponsorship code from employer'],
              citations: [
                {
                  title: 'GOV.UK Skilled Worker Visa',
                  url: 'https://www.gov.uk/skilled-worker-visa',
                },
              ],
              estimated_timeline: '3-8 weeks',
              top_improvement: 'Maintain valid sponsorship details',
              source_freshness: 'VERIFIED',
            },
          ],
        }),
      });
    });

    await page.goto('/form');

    // Selecting an uncertified region surfaces an explicit preview notice
    await page.locator('#targetRegion').selectOption('southern-europe');
    await expect(page.getByTestId('uncertified-region-notice')).toBeVisible();

    // Switching to certified UK hides the notice
    await page.locator('#targetRegion').selectOption('uk');
    await expect(page.getByTestId('uncertified-region-notice')).toHaveCount(0);

    // Step 1 validation error renders in [data-testid="form-error"]
    await page.locator('#age').fill('15');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByTestId('form-error')).toContainText('Age must be between 18 and 80.');

    await page.locator('#age').fill('29');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 2 includes hasJobOffer toggle
    await expect(page.locator('#education')).toBeVisible();
    await expect(page.locator('#hasJobOffer')).toBeVisible();
    await page.locator('#hasJobOffer').check();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 3 validation check for IELTS out-of-bounds score
    await page.locator('#englishTest').selectOption('ielts');
    await page.locator('#testScore').fill('12');
    await page.getByRole('button', { name: 'Check My Chances' }).click();
    await expect(page.getByTestId('form-error')).toContainText('IELTS overall band is usually 0–9.');

    await page.locator('#testScore').fill('7.5');
    await page.getByRole('button', { name: 'Check My Chances' }).click();

    await expect(page).toHaveURL(/\/results$/);
    expect(captured.payload).not.toBeNull();
    expect(captured.payload?.targetRegion).toBe('uk');
    expect(captured.payload?.hasJobOffer).toBe(true);
    expect(captured.payload?.testScore).toBe(7.5);

    await expect(page.locator('h1', { hasText: 'Your Visa Strategy' })).toBeVisible();
    await expect(page.getByText('Skilled Worker Visa')).toBeVisible();
    await expect(page.getByText('Must hold a Certificate of Sponsorship from a licensed UK employer.')).toBeVisible();
    await expect(page.getByText('No major strengths detected.')).toHaveCount(0);

    // Verify citation inspection drawer opens official GOV.UK link
    await page.getByRole('button', { name: 'Inspect Sources' }).click();
    await expect(page.getByRole('link', { name: /GOV\.UK Skilled Worker Visa/ })).toBeVisible();
  });

  test('Home 1-click demo navigates cleanly to /results and What-If Simulator recalculates scores', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('text=3 free consultation questions')).toHaveCount(0);

    await page.getByRole('button', { name: /Open Full Interactive Results Report/ }).click();
    await expect(page).toHaveURL(/\/results$/);
    await expect(page.locator('h1', { hasText: 'Your Visa Strategy' })).toBeVisible();
    await expect(page.getByText('What-If Simulator')).toBeVisible();

    const firstBreakdownValue = page.locator('section', { hasText: 'Score Breakdown' }).first();
    const initialText = await firstBreakdownValue.textContent();

    // Downgrade Education in What-If Simulator to High School & clear English Test to verify reactive recalculation
    const simulatorCard = page.locator('div', { has: page.locator('h2', { hasText: 'What-If Simulator' }) }).first();
    await simulatorCard.locator('select').nth(0).selectOption('none');
    await simulatorCard.locator('select').nth(1).selectOption('high_school');

    await expect(firstBreakdownValue).not.toHaveText(initialText || '');
  });
});
