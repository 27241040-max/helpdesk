import path from "node:path";

import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

const rootDir = process.cwd();
const serverDir = path.join(rootDir, "server");
const clientDir = path.join(rootDir, "client");
const envFile = path.join(serverDir, ".env.playwright");

loadEnv({ path: envFile, override: true });

const serverPort = process.env.PORT || "4100";
const clientPort = process.env.PLAYWRIGHT_CLIENT_PORT || "4173";
const serverUrl = `http://127.0.0.1:${serverPort}`;
const clientUrl = `http://127.0.0.1:${clientPort}`;

export default defineConfig({
  globalSetup: "./playwright/global.setup.ts",
  testDir: "./playwright/tests",
  fullyParallel: true,
  reporter: "html",
  retries: process.env.CI ? 2 : 0,
  timeout: 30_000,
  use: {
    baseURL: clientUrl,
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "npm run dev",
      cwd: serverDir,
      env: {
        ...process.env,
        PORT: serverPort,
        CLIENT_ORIGIN: clientUrl,
        BETTER_AUTH_URL: serverUrl,
      },
      name: "server",
      reuseExistingServer: !process.env.CI,
      stderr: "pipe",
      stdout: "pipe",
      timeout: 120_000,
      url: `${serverUrl}/api/health`,
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${clientPort}`,
      cwd: clientDir,
      env: {
        ...process.env,
        VITE_API_BASE_URL: serverUrl,
      },
      name: "client",
      reuseExistingServer: !process.env.CI,
      stderr: "pipe",
      stdout: "pipe",
      timeout: 120_000,
      url: clientUrl,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
