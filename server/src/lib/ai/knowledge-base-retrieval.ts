import { Prisma } from "../../generated/prisma";
import { prisma } from "../../prisma";
import { createJinaEmbeddings, vectorToSql } from "./jina-embeddings";

const maxChunkCharacters = 1200;
const maxRetrievedChunks = 8;
const maxCosineDistance = 0.62;

type KnowledgeBaseSearchRow = {
  content: string;
  distance: number;
  entryId: number;
  title: string;
};

export type KnowledgeBaseSource = {
  content: string;
  distance: number;
  entryId: number;
  title: string;
};

function splitLongText(text: string, maxLength: number): string[] {
  const chunks: string[] = [];

  for (let index = 0; index < text.length; index += maxLength) {
    const chunk = text.slice(index, index + maxLength).trim();

    if (chunk) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

export function buildKnowledgeBaseChunks(input: { bodyText: string; title: string }) {
  const title = input.title.trim();
  const paragraphs = input.bodyText
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChunkCharacters) {
      if (current) {
        chunks.push(current);
        current = "";
      }

      chunks.push(...splitLongText(paragraph, maxChunkCharacters));
      continue;
    }

    const next = current ? `${current}\n\n${paragraph}` : paragraph;

    if (next.length > maxChunkCharacters) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = next;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.map((chunk) => `标题：${title}\n\n${chunk}`);
}

export async function rebuildKnowledgeBaseEntryChunks(entry: {
  bodyText: string;
  id: number;
  title: string;
}) {
  const chunks = buildKnowledgeBaseChunks(entry);
  const embeddings = await createJinaEmbeddings(chunks, "retrieval.passage");

  await prisma.$transaction(async (tx) => {
    await tx.knowledgeBaseChunk.deleteMany({
      where: {
        entryId: entry.id,
      },
    });

    for (const [index, chunk] of chunks.entries()) {
      const embeddingSql = vectorToSql(embeddings[index] ?? []);

      await tx.$executeRaw`
        INSERT INTO "knowledge_base_chunk" ("entryId", "content", "chunkIndex", "embedding", "updatedAt")
        VALUES (${entry.id}, ${chunk}, ${index}, ${embeddingSql}::vector, NOW())
      `;
    }
  });
}

export function formatKnowledgeBaseSourcesAsMarkdown(sources: KnowledgeBaseSource[]) {
  return sources
    .map((source, index) => [`## 参考资料 ${index + 1}: ${source.title}`, source.content].join("\n\n"))
    .join("\n\n---\n\n");
}

export async function retrieveKnowledgeBaseSources(queryText: string): Promise<KnowledgeBaseSource[]> {
  const [queryEmbedding] = await createJinaEmbeddings([queryText], "retrieval.query");

  if (!queryEmbedding) {
    return [];
  }

  const embeddingSql = vectorToSql(queryEmbedding);
  const rows = await prisma.$queryRaw<KnowledgeBaseSearchRow[]>(Prisma.sql`
    SELECT
      chunk."entryId",
      entry."title",
      chunk."content",
      chunk."embedding" <=> ${embeddingSql}::vector AS "distance"
    FROM "knowledge_base_chunk" chunk
    INNER JOIN "knowledge_base_entry" entry ON entry."id" = chunk."entryId"
    WHERE entry."isEnabled" = true
    ORDER BY chunk."embedding" <=> ${embeddingSql}::vector
    LIMIT ${maxRetrievedChunks}
  `);

  return rows
    .map((row) => ({
      content: row.content,
      distance: Number(row.distance),
      entryId: row.entryId,
      title: row.title,
    }))
    .filter((row) => row.distance <= maxCosineDistance);
}
