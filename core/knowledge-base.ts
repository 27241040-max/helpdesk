import { z } from "zod";

const titleSchema = z.string().trim().min(2, "标题至少包含 2 个字符").max(120, "标题不能超过 120 个字符");
const bodyTextSchema = z.string().trim().min(20, "正文至少包含 20 个字符").max(12000, "正文不能超过 12000 个字符");

export const createKnowledgeBaseEntrySchema = z.object({
  title: titleSchema,
  bodyText: bodyTextSchema,
  isEnabled: z.boolean().default(true),
});

export const updateKnowledgeBaseEntrySchema = z.object({
  title: titleSchema,
  bodyText: bodyTextSchema,
  isEnabled: z.boolean(),
});

export type CreateKnowledgeBaseEntryInput = z.infer<typeof createKnowledgeBaseEntrySchema>;
export type UpdateKnowledgeBaseEntryInput = z.infer<typeof updateKnowledgeBaseEntrySchema>;

export type KnowledgeBaseEntryListItem = {
  bodyText: string;
  chunkCount: number;
  createdAt: string;
  id: number;
  isEnabled: boolean;
  title: string;
  updatedAt: string;
};
