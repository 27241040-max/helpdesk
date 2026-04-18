import { randomUUID } from "node:crypto";

import { UserRole } from "../generated/prisma";
import { prisma } from "../prisma";

export const AI_AGENT_EMAIL = "ai-agent@system.local";
export const AI_AGENT_NAME = "AI agent";

const aiAgentSelect = {
  email: true,
  id: true,
  name: true,
} as const;

export async function ensureAiAgentUser() {
  const existing = await prisma.user.findUnique({
    where: {
      email: AI_AGENT_EMAIL,
    },
    select: {
      id: true,
      deletedAt: true,
      email: true,
      name: true,
      isSystemReserved: true,
    },
  });

  if (!existing) {
    return prisma.user.create({
      data: {
        banned: false,
        banExpires: null,
        banReason: null,
        deletedAt: null,
        deletedBy: null,
        email: AI_AGENT_EMAIL,
        emailVerified: true,
        id: randomUUID(),
        isSystemReserved: true,
        name: AI_AGENT_NAME,
        role: UserRole.agent,
      },
      select: aiAgentSelect,
    });
  }

  return prisma.user.update({
    where: {
      id: existing.id,
    },
    data: {
      banned: false,
      banExpires: null,
      banReason: null,
      deletedAt: null,
      deletedBy: null,
      email: AI_AGENT_EMAIL,
      emailVerified: true,
      isSystemReserved: true,
      name: AI_AGENT_NAME,
      role: UserRole.agent,
    },
    select: aiAgentSelect,
  });
}

export async function getAiAgentUserOrThrow() {
  return prisma.user.findFirstOrThrow({
    where: {
      deletedAt: null,
      email: AI_AGENT_EMAIL,
      isSystemReserved: true,
      role: UserRole.agent,
    },
    select: aiAgentSelect,
  });
}
