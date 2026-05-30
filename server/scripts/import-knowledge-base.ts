import "dotenv/config";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { rebuildKnowledgeBaseEntryChunks } from "../src/lib/ai/knowledge-base-retrieval";
import { prisma } from "../src/prisma";

type ParsedKnowledgeBaseEntry = {
  bodyText: string;
  title: string;
};

const knowledgeBaseFilePath = path.resolve(__dirname, "../.knowledge-base.md");

function parseKnowledgeBaseMarkdown(markdown: string): ParsedKnowledgeBaseEntry[] {
  const headingPattern = /^##\s+\d+\.\s+(.+?)\s*$/gm;
  const headings = Array.from(markdown.matchAll(headingPattern));

  return headings
    .map((match, index) => {
      const start = match.index ?? 0;
      const next = headings[index + 1]?.index ?? markdown.length;

      return {
        bodyText: markdown.slice(start, next).trim(),
        title: match[1]?.trim() ?? "",
      };
    })
    .filter((entry) => entry.title && entry.bodyText.length >= 20);
}

async function main() {
  const markdown = await readFile(knowledgeBaseFilePath, "utf8");
  const entries = parseKnowledgeBaseMarkdown(markdown);

  if (entries.length === 0) {
    throw new Error("No knowledge base entries were found in .knowledge-base.md.");
  }

  for (const entry of entries) {
    const existing = await prisma.knowledgeBaseEntry.findFirst({
      where: {
        title: entry.title,
      },
      select: {
        id: true,
      },
    });

    const saved = existing
      ? await prisma.knowledgeBaseEntry.update({
          data: {
            bodyText: entry.bodyText,
            isEnabled: true,
            title: entry.title,
          },
          select: {
            bodyText: true,
            id: true,
            title: true,
          },
          where: {
            id: existing.id,
          },
        })
      : await prisma.knowledgeBaseEntry.create({
          data: {
            bodyText: entry.bodyText,
            isEnabled: true,
            title: entry.title,
          },
          select: {
            bodyText: true,
            id: true,
            title: true,
          },
        });

    await rebuildKnowledgeBaseEntryChunks(saved);
  }

  console.log(
    JSON.stringify({
      imported: entries.length,
      success: true,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
