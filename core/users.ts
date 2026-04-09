import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(3, "名称至少包含 3 个字符"),
  email: z.string().trim().min(1, "请输入有效的邮箱地址").email("请输入有效的邮箱地址"),
  password: z.string().trim().min(8, "密码至少应为 8 个字符"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
