import { defineConfig, devices } from "@playwright/test";

// Parallel workstreams each run this suite against their own server, so the
// port is an input. 4173 stays the default for a lone run.
const PORT = Number(process.env.E2E_PORT ?? 4173);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`E2E_PORT must be a TCP port number, got "${process.env.E2E_PORT}"`);
}
const BASE_URL = `http://127.0.0.1:${PORT}`;
// Several sessions fixing specs at once share one prebuilt server and one set of
// fixture saves: with E2E_ATTACH set, a run neither rebuilds the app nor
// regenerates fixtures, so it cannot rewrite either under another run.
const ATTACH = Boolean(process.env.E2E_ATTACH);

// The suite is empty while the player is rebuilt; `test:e2e` passes
// `--pass-with-no-tests` so an empty run is green rather than an error.
export default defineConfig({
  testDir: "./tests",
  ...(ATTACH ? {} : { globalSetup: "./tests/global-setup.ts" }),
  outputDir: "./tests/.results",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  ...(ATTACH ? {} : { webServer: {
    // `vite preview` is called directly because the package's own preview
    // script pins 4173. --strictPort makes a taken port fail the run instead of
    // quietly serving on the next free one while baseURL still points here.
    command: `pnpm run build && pnpm exec vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
  } }),
  projects: [
    { name: "mobile-320", use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 568 }, hasTouch: true } },
    { name: "mobile-390", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: "tablet-768", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "desktop-1280", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "desktop-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "desktop-1920", use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } } },
  ],
});
