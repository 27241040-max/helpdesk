import "dotenv/config";

import type { ErrorRequestHandler } from "express";
import express from 'express';
import cors from 'cors';
import { APIError } from "better-call";
import { toNodeHandler } from 'better-auth/node';

import { auth } from './auth';
import { isAllowedOrigin } from './config';
import { agentsRouter } from "./routes/agents";
import { inboundEmailRouter } from "./routes/inbound-email";
import { ticketsRouter } from "./routes/tickets";
import { requireAuth } from './middleware/require-auth';
import { usersRouter } from "./routes/users";

const app = express();
const port = process.env.PORT || 4000;

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin ?? 'unknown'} is not allowed by CORS`));
    },
    credentials: true,
  }),
);
app.all('/api/auth/*splat', toNodeHandler(auth));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ticket-management-system' });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.use("/api/agents", agentsRouter);
app.use("/api/inbound/email", inboundEmailRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/users", usersRouter);

const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof APIError) {
    if (error.status === 400 && error.body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      res.status(409).json({ error: "该邮箱已存在。" });
      return;
    }

    const statusCode = typeof error.status === "number" ? error.status : Number(error.status) || 500;
    res.status(statusCode).json({ error: error.body?.message ?? "创建用户失败。" });
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

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
