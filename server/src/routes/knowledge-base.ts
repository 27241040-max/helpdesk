import {
  createKnowledgeBaseEntrySchema,
  updateKnowledgeBaseEntrySchema,
} from "core/knowledge-base";
import { Router } from "express";

import { parsePositiveIntParam } from "../lib/route-params";
import { rebuildKnowledgeBaseEntryChunks } from "../lib/ai/knowledge-base-retrieval";
import { getIssueMessage } from "../lib/validation";
import { requireAdmin } from "../middleware/require-admin";
import { requireAuth } from "../middleware/require-auth";
import { prisma } from "../prisma";

export const knowledgeBaseRouter = Router();

knowledgeBaseRouter.use(requireAuth, requireAdmin);

const knowledgeBaseEntrySelect = {
  id: true,
  title: true,
  bodyText: true,
  isEnabled: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      chunks: true,
    },
  },
};

function serializeKnowledgeBaseEntry(entry: {
  _count: {
    chunks: number;
  };
  bodyText: string;
  createdAt: Date;
  id: number;
  isEnabled: boolean;
  title: string;
  updatedAt: Date;
}) {
  return {
    bodyText: entry.bodyText,
    chunkCount: entry._count.chunks,
    createdAt: entry.createdAt.toISOString(),
    id: entry.id,
    isEnabled: entry.isEnabled,
    title: entry.title,
    updatedAt: entry.updatedAt.toISOString(),
  };
}

knowledgeBaseRouter.get("/", async (_req, res) => {
  const entries = await prisma.knowledgeBaseEntry.findMany({
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: knowledgeBaseEntrySelect,
  });

  res.json({
    entries: entries.map(serializeKnowledgeBaseEntry),
  });
});

knowledgeBaseRouter.post("/", async (req, res) => {
  const result = createKnowledgeBaseEntrySchema.safeParse(req.body ?? {});

  if (!result.success) {
    res.status(400).json({ error: getIssueMessage(result.error) });
    return;
  }

  const entry = await prisma.knowledgeBaseEntry.create({
    data: result.data,
    select: {
      bodyText: true,
      id: true,
      title: true,
    },
  });

  try {
    await rebuildKnowledgeBaseEntryChunks(entry);
  } catch (error) {
    await prisma.knowledgeBaseEntry.delete({
      where: {
        id: entry.id,
      },
    });

    console.error("知识库向量生成失败:", error);
    res.status(502).json({ error: "知识库向量生成失败，请稍后再试。" });
    return;
  }

  const created = await prisma.knowledgeBaseEntry.findUniqueOrThrow({
    where: {
      id: entry.id,
    },
    select: knowledgeBaseEntrySelect,
  });

  res.status(201).json({ entry: serializeKnowledgeBaseEntry(created) });
});

knowledgeBaseRouter.patch("/:id", async (req, res) => {
  const entryId = parsePositiveIntParam(req.params.id);

  if (!entryId) {
    res.status(400).json({ error: "知识库条目 ID 无效。" });
    return;
  }

  const result = updateKnowledgeBaseEntrySchema.safeParse(req.body ?? {});

  if (!result.success) {
    res.status(400).json({ error: getIssueMessage(result.error) });
    return;
  }

  const existing = await prisma.knowledgeBaseEntry.findUnique({
    where: {
      id: entryId,
    },
    select: {
      bodyText: true,
      id: true,
      title: true,
    },
  });

  if (!existing) {
    res.status(404).json({ error: "知识库条目不存在。" });
    return;
  }

  const updated = await prisma.knowledgeBaseEntry.update({
    data: result.data,
    where: {
      id: entryId,
    },
    select: {
      bodyText: true,
      id: true,
      title: true,
    },
  });

  const shouldRebuildChunks = existing.title !== updated.title || existing.bodyText !== updated.bodyText;

  if (shouldRebuildChunks) {
    try {
      await rebuildKnowledgeBaseEntryChunks(updated);
    } catch (error) {
      await prisma.knowledgeBaseEntry.update({
        data: {
          bodyText: existing.bodyText,
          title: existing.title,
        },
        where: {
          id: entryId,
        },
      });

      console.error("知识库向量更新失败:", error);
      res.status(502).json({ error: "知识库向量更新失败，请稍后再试。" });
      return;
    }
  }

  const entry = await prisma.knowledgeBaseEntry.findUniqueOrThrow({
    where: {
      id: entryId,
    },
    select: knowledgeBaseEntrySelect,
  });

  res.json({ entry: serializeKnowledgeBaseEntry(entry) });
});

knowledgeBaseRouter.delete("/:id", async (req, res) => {
  const entryId = parsePositiveIntParam(req.params.id);

  if (!entryId) {
    res.status(400).json({ error: "知识库条目 ID 无效。" });
    return;
  }

  const existing = await prisma.knowledgeBaseEntry.findUnique({
    where: {
      id: entryId,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    res.status(404).json({ error: "知识库条目不存在。" });
    return;
  }

  await prisma.knowledgeBaseEntry.delete({
    where: {
      id: entryId,
    },
  });

  res.json({ success: true });
});
