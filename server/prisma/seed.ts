import "dotenv/config";

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
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (existingUser) {
    console.log(
      JSON.stringify({
        seeded: false,
        message: "A user with the same email already exists.",
        email: existingUser.email,
        role: existingUser.role,
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
