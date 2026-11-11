import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Auto-start Next.js dev server in CI before running tests
  webServer: {
    command: 'npx next dev -p 3001',
    url: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000, // 2 min to allow Next.js to compile on cold start
    env: {
      PORT: '3001',
      ...(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
        ? { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }
        : {}),
      ...(process.env.CLERK_SECRET_KEY
        ? { CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY }
        : {}),
      ...(process.env.DATABASE_URL
        ? { DATABASE_URL: process.env.DATABASE_URL }
        : {}),
      ...(process.env.OPENAI_API_KEY
        ? { OPENAI_API_KEY: process.env.OPENAI_API_KEY }
        : {}),
      ...(process.env.NEXT_PUBLIC_SITE_URL
        ? { NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL }
        : {}),
    },
  },
});
