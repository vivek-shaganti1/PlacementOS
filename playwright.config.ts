import { defineConfig, devices } from '@playwright/test'

// Runs against the local production stand-in (scripts/serve-prod.mjs over a throwaway Supabase seeded by
// scripts/e2e-seed.mjs). Never point E2E_BASE_URL at production: the journeys apply to drives and change records.
const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173'
if (/vercel\.app|supabase\.co/.test(baseURL)) throw new Error('E2E tests must not run against a hosted deployment.')

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, dependencies: ['setup'], testIgnore: /public\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, dependencies: ['setup'], testMatch: /pages\.spec\.ts/ },
    { name: 'public-chromium', use: { ...devices['Desktop Chrome'] }, testMatch: /public\.spec\.ts/ },
    { name: 'public-firefox', use: { ...devices['Desktop Firefox'] }, testMatch: /public\.spec\.ts/ },
    { name: 'public-webkit', use: { ...devices['Desktop Safari'] }, testMatch: /public\.spec\.ts/ },
  ],
})
