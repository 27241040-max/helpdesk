import "dotenv/config";
import "./instrument";

import type { ErrorRequestHandler } from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import * as Sentry from "@sentry/node";
import express from 'express';
import cors from 'cors';

import { getTrustedOriginsForRequest, isAllowedOrigin } from './config';

const app = express();
const port = process.env.PORT || 4000;
const clientDistPath = path.resolve(__dirname, "../../client/dist");
const clientIndexPath = path.join(clientDistPath, "index.html");
let appStatus: "initializing" | "ready" | "degraded" = "initializing";
let stopBossRef: (() => Promise<void>) | undefined;

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  Sentry.captureException(reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  Sentry.captureException(error);
});

const apiCors = cors((req, callback) => {
  callback(null, {
    origin(origin, originCallback) {
      const requestTrustedOrigins = getTrustedOriginsForRequest(
        new Request(`http://${req.headers.host ?? "localhost"}/`, {
          headers: req.headers as HeadersInit,
        }),
      );

      if (!origin || isAllowedOrigin(origin) || requestTrustedOrigins.includes(origin.replace(/\/$/, ""))) {
        originCallback(null, true);
        return;
      }

      originCallback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  });
});

app.use("/api", apiCors);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ticket-management-system', app: appStatus });
});

if (existsSync(clientIndexPath)) {
  app.use(express.static(clientDistPath));

  app.get("/{*splat}", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }

    res.sendFile(clientIndexPath);
  });
}

function isBetterAuthApiError(error: unknown): error is {
  body?: {
    code?: unknown;
    message?: unknown;
  };
  status?: unknown;
} {
  return Boolean(
    error &&
      typeof error === "object" &&
      "status" in error &&
      "body" in error,
  );
}

const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (isBetterAuthApiError(error)) {
    if (error.status === 400 && error.body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      res.status(409).json({ error: "该邮箱已存在。" });
      return;
    }

    const statusCode = typeof error.status === "number" ? error.status : Number(error.status) || 500;
    res.status(statusCode).json({
      error: typeof error.body?.message === "string" ? error.body.message : "创建用户失败。",
    });
    return;
  }

  const isCorsError = error instanceof Error && error.message.includes("is not allowed by CORS");
  const status = isCorsError ? 403 : 500;
  const message = isCorsError ? "Origin is not allowed" : "Internal server error";

  if (status === 500) {
    console.error(error);
  }

  res.status(status).json({ error: message });
};

async function registerApplicationRoutes() {
  const [
    { toNodeHandler },
    { auth },
    { startBoss, stopBoss },
    { ensureAiAgentUser },
    { agentsRouter },
    { inboundEmailRouter },
    { ticketsRouter },
    { requireAuth },
    { usersRouter },
  ] = await Promise.all([
    import("better-auth/node"),
    import("./auth"),
    import("./jobs/boss"),
    import("./lib/ai-agent"),
    import("./routes/agents"),
    import("./routes/inbound-email"),
    import("./routes/tickets"),
    import("./middleware/require-auth"),
    import("./routes/users"),
  ]);

  stopBossRef = stopBoss;

  app.all('/api/auth/*splat', toNodeHandler(auth));
  app.use("/api", express.json());

  app.get('/api/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  app.use("/api/agents", agentsRouter);
  app.use("/api/inbound/email", inboundEmailRouter);
  app.use("/api/webhooks/inbound-email", inboundEmailRouter);
  app.use("/api/tickets", ticketsRouter);
  app.use("/api/users", usersRouter);

  Sentry.setupExpressErrorHandler(app);
  app.use(errorHandler);

  await ensureAiAgentUser();
  await startBoss();
  appStatus = "ready";
}

async function startServer() {
  const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

  void (async () => {
    try {
      await registerApplicationRoutes();
    } catch (error) {
      appStatus = "degraded";
      console.error("Application startup failed:", error);
      Sentry.captureException(error);
    }
  })();

  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    console.log(`Received ${signal}, shutting down server...`);

    server.close(async (error) => {
      if (error) {
        console.error("HTTP server shutdown failed:", error);
        process.exitCode = 1;
      }

      try {
        await stopBossRef?.();
      } catch (bossError) {
        console.error("pg-boss shutdown failed:", bossError);
        process.exitCode = 1;
      } finally {
        process.exit();
      }
    });
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

void startServer().catch((error) => {
  console.error("Server startup failed:", error);
  Sentry.captureException(error);
  process.exit(1);
});
