import { createUserSchema } from "core/users";
import { fromNodeHeaders } from "better-auth/node";
import { Router } from "express";

import { auth } from "../auth";
import { UserRole } from "../generated/prisma";
import { requireAdmin } from "../middleware/require-admin";
import { requireAuth } from "../middleware/require-auth";
import { prisma } from "../prisma";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireAdmin);

usersRouter.get("/", async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({ users });
});

usersRouter.post("/", async (req, res) => {
  const result = createUserSchema.safeParse(req.body ?? {});

  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? "请求数据不合法。" });
    return;
  }

  const created = await auth.api.createUser({
    headers: fromNodeHeaders(req.headers),
    body: {
      ...result.data,
      email: result.data.email.toLowerCase(),
      role: UserRole.agent,
    },
  });

  res.status(201).json({
    user: {
      id: created.user.id,
      name: created.user.name,
      email: created.user.email,
      role: created.user.role,
      emailVerified: created.user.emailVerified,
      createdAt: created.user.createdAt,
      updatedAt: created.user.updatedAt,
    },
  });
});
