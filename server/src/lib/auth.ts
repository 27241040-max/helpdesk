import "dotenv/config";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { getRequiredEnv, trustedOrigins } from "../config";
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
        type: ["admin", "agent"],
        required: false,
        defaultValue: "agent",
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
});
