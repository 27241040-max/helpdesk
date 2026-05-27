import { describe, expect, test, vi } from "vitest";

vi.mock("../../prisma", () => ({
  prisma: {},
}));

vi.mock("./jina-embeddings", () => ({
  createJinaEmbeddings: vi.fn(),
  vectorToSql: vi.fn(),
}));

import { buildKnowledgeBaseChunks, formatKnowledgeBaseSourcesAsMarkdown } from "./knowledge-base-retrieval";

describe("knowledge-base-retrieval", () => {
  test("builds titled chunks from paragraphs", () => {
    const chunks = buildKnowledgeBaseChunks({
      bodyText: "第一段说明国际物流追踪。\n\n第二段说明物流延迟处理。",
      title: "国际物流",
    });

    expect(chunks).toEqual([
      "标题：国际物流\n\n第一段说明国际物流追踪。\n\n第二段说明物流延迟处理。",
    ]);
  });

  test("formats retrieved sources as markdown", () => {
    const markdown = formatKnowledgeBaseSourcesAsMarkdown([
      {
        content: "标题：国际物流\n\n请查看订单详情中的追踪编号。",
        distance: 0.12,
        entryId: 1,
        title: "国际物流",
      },
    ]);

    expect(markdown).toContain("## 参考资料 1: 国际物流");
    expect(markdown).toContain("请查看订单详情中的追踪编号。");
  });
});
