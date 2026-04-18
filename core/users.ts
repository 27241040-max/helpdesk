import { z } from "zod";

export const UserRole = {
  admin: "admin",
  agent: "agent",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

const nameSchema = z.string().trim().min(3, "名称至少包含 3 个字符");
const emailSchema = z.string().trim().min(1, "请输入有效的邮箱地址").email("请输入有效的邮箱地址");
const createPasswordSchema = z.string().trim().min(8, "密码至少应为 8 个字符");
const optionalPasswordSchema = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }

    return value;
  },
  z.string().trim().min(8, "密码至少应为 8 个字符").optional(),
);

export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: createPasswordSchema,
});

export const updateUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: optionalPasswordSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserListItem = {
  createdAt: string;
  email: string;
  emailVerified: boolean;
  id: string;
  isSystemReserved: boolean;
  name: string;
  role: UserRole;
  updatedAt: string;
};
