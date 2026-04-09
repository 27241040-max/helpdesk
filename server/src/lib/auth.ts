import "dotenv/config";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";

import { getRequiredEnv, trustedOrigins } from "../config";
import { UserRole } from "../generated/prisma";
import { prisma } from "../prisma";

const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  secret: getRequiredEnv("BETTER_AUTH_SECRET"),
  baseURL: getRequiredEnv("BETTER_AUTH_URL"),
  basePath: "/api/auth",
  trustedOrigins,
  disabledPaths: ["/sign-up/email"],
  user: {
    additionalFields: {
      role: {
        type: [UserRole.admin, UserRole.agent],
        required: false,
        defaultValue: UserRole.agent,
        input: false,
      },
    },
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  rateLimit: {
    enabled: isProduction,
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    admin({
      defaultRole: UserRole.agent,
      adminRoles: [UserRole.admin],
      roles: {
        admin: adminAc,
        agent: userAc,
      },
    }),
  ],
});
