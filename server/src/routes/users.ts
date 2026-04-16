import { randomUUID } from "node:crypto";

import { hashPassword } from "better-auth/crypto";
import { createUserSchema, updateUserSchema } from "core/users";
import { fromNodeHeaders } from "better-auth/node";
import { Router } from "express";

import { auth } from "../auth";
import { getRequiredEnv } from "../config";
import { UserRole } from "../generated/prisma";
import { getIssueMessage } from "../lib/validation";
import { requireAdmin } from "../middleware/require-admin";
import { requireAuth } from "../middleware/require-auth";
import { prisma } from "../prisma";

export const usersRouter = Router();
const betterAuthBaseUrl = getRequiredEnv("BETTER_AUTH_URL").replace(/\/$/, "");

usersRouter.use(requireAuth, requireAdmin);

async function callBetterAuthAdminEndpoint(
  endpoint: string,
  options: {
    body: Record<string, unknown>;
    cookieHeader: string | undefined;
    fallbackErrorMessage: string;
    originHeader: string | undefined;
  },
) {
  const response = await fetch(`${betterAuthBaseUrl}/api/auth${endpoint}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(options.cookieHeader ? { cookie: options.cookieHeader } : {}),
      ...(options.originHeader ? { origin: options.originHeader } : {}),
    },
    body: JSON.stringify(options.body),
  });

  if (response.ok) {
    return;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const responseBody = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;
  const errorMessage =
    (responseBody as { error?: { message?: string }; message?: string } | null)?.error?.message ??
    (responseBody as { error?: { message?: string }; message?: string } | null)?.message ??
    options.fallbackErrorMessage;

  return {
    errorMessage,
    status: response.status,
  };
}

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
    where: {
      deletedAt: null,
    },
  });

  res.json({ users });
});

usersRouter.post("/", async (req, res) => {
  const result = createUserSchema.safeParse(req.body ?? {});

  if (!result.success) {
    res.status(400).json({ error: getIssueMessage(result.error) });
    return;
  }

  const normalizedEmail = result.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
      deletedAt: true,
    },
  });

  if (existingUser && !existingUser.deletedAt) {
    res.status(409).json({ error: "该邮箱已存在。" });
    return;
  }

  if (existingUser?.deletedAt) {
    const passwordHash = await hashPassword(result.data.password);
    const existingCredentialAccount = await prisma.account.findFirst({
      where: {
        providerId: "credential",
        userId: existingUser.id,
      },
      select: {
        id: true,
      },
    });

    const restoredUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          banExpires: null,
          banReason: null,
          banned: false,
          deletedAt: null,
          deletedBy: null,
          email: normalizedEmail,
          emailVerified: false,
          name: result.data.name,
          role: UserRole.agent,
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

      if (existingCredentialAccount) {
        await tx.account.update({
          where: {
            id: existingCredentialAccount.id,
          },
          data: {
            password: passwordHash,
          },
        });
      } else {
        await tx.account.create({
          data: {
            id: randomUUID(),
            accountId: existingUser.id,
            providerId: "credential",
            userId: existingUser.id,
            password: passwordHash,
          },
        });
      }

      await tx.session.deleteMany({
        where: {
          userId: existingUser.id,
        },
      });

      return user;
    });

    res.status(201).json({ user: restoredUser });
    return;
  }

  const created = await auth.api.createUser({
    headers: fromNodeHeaders(req.headers),
    body: {
      ...result.data,
      email: normalizedEmail,
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

usersRouter.patch("/:id", async (req, res) => {
  const result = updateUserSchema.safeParse(req.body ?? {});

  if (!result.success) {
    res.status(400).json({ error: getIssueMessage(result.error) });
    return;
  }

  const userId = req.params.id;
  const normalizedEmail = result.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
    },
  });

  if (existingUser && existingUser.id !== userId) {
    res.status(409).json({ error: "该邮箱已存在。" });
    return;
  }

  const updateUserResult = await callBetterAuthAdminEndpoint("/admin/update-user", {
    body: {
      userId,
      data: {
        email: normalizedEmail,
        name: result.data.name,
      },
    },
    cookieHeader: req.headers.cookie,
    fallbackErrorMessage: "保存用户资料失败。",
    originHeader: req.headers.origin,
  });

  if (updateUserResult) {
    res.status(updateUserResult.status).json({ error: updateUserResult.errorMessage });
    return;
  }

  if (result.data.password) {
    const setPasswordResult = await callBetterAuthAdminEndpoint("/admin/set-user-password", {
      body: {
        userId,
        newPassword: result.data.password,
      },
      cookieHeader: req.headers.cookie,
      fallbackErrorMessage: "修改密码失败。",
      originHeader: req.headers.origin,
    });

    if (setPasswordResult) {
      res.status(setPasswordResult.status).json({ error: setPasswordResult.errorMessage });
      return;
    }
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: userId,
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

  res.json({ user });
});

usersRouter.delete("/:id", async (req, res) => {
  const userId = req.params.id;
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
      deletedAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: "用户不存在。" });
    return;
  }

  if (user.deletedAt) {
    res.status(409).json({ error: "该用户已删除。" });
    return;
  }

  if (user.role === UserRole.admin) {
    res.status(403).json({ error: "管理员用户不能被删除。" });
    return;
  }

  await prisma.$transaction([
    prisma.ticket.updateMany({
      where: {
        assignedUserId: userId,
      },
      data: {
        assignedUserId: null,
      },
    }),
    prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        banned: true,
        banExpires: null,
        banReason: "deleted",
        deletedAt: new Date(),
        deletedBy: req.user?.id ?? null,
      },
    }),
    prisma.session.deleteMany({
      where: {
        userId,
      },
    }),
  ]);

  res.json({ success: true });
});
