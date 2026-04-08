import "dotenv/config";

import { randomUUID } from "node:crypto";

import { hashPassword } from "better-auth/crypto";

import { UserRole } from "../src/generated/prisma";

import { auth } from "../src/auth";
import { prisma } from "../src/prisma";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const email = requireEnv("ADMIN_EMAIL");
  const password = requireEnv("ADMIN_PASSWORD");
  const name = process.env.ADMIN_NAME?.trim() || "Administrator";
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      accounts: true,
    },
  });

  if (existingUser) {
    const passwordHash = await hashPassword(password);
    const credentialAccount = existingUser.accounts.find(
      (account) => account.providerId === "credential",
    );

    if (credentialAccount) {
      await prisma.account.update({
        where: {
          id: credentialAccount.id,
        },
        data: {
          password: passwordHash,
        },
      });
    } else {
      await prisma.account.create({
        data: {
          id: randomUUID(),
          accountId: existingUser.id,
          providerId: "credential",
          userId: existingUser.id,
          password: passwordHash,
        },
      });
    }

    await prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        name,
        role: UserRole.admin,
      },
    });

    console.log(
      JSON.stringify({
        seeded: true,
        message: "Existing admin user synchronized.",
        email: existingUser.email,
        role: UserRole.admin,
        userId: existingUser.id,
      }),
    );
    return;
  }

  const created = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
    },
  });

  await prisma.user.update({
    where: {
      email,
    },
    data: {
      role: UserRole.admin,
    },
  });

  console.log(
    JSON.stringify({
      seeded: true,
      email,
      role: UserRole.admin,
      userId: created.user.id,
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
