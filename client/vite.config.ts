/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from "vite";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const hasSentrySourceMaps = Boolean(
    env.VITE_SENTRY_AUTH_TOKEN && env.VITE_SENTRY_ORG && env.VITE_SENTRY_PROJECT,
  );

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(hasSentrySourceMaps
        ? [
            sentryVitePlugin({
              authToken: env.VITE_SENTRY_AUTH_TOKEN,
              org: env.VITE_SENTRY_ORG,
              project: env.VITE_SENTRY_PROJECT,
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "core/email": path.resolve(__dirname, "../core/email.ts"),
        "core/knowledge-base": path.resolve(__dirname, "../core/knowledge-base.ts"),
        "core/users": path.resolve(__dirname, "../core/users.ts"),
        core: path.resolve(__dirname, "../core/index.ts"),
      },
    },
    build: {
      sourcemap: hasSentrySourceMaps,
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/test/setup.ts",
      include: ["src/**/*.test.tsx"],
    },
  };
});
