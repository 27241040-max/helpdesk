import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(serverRoot, "src", "generated", "prisma");
const target = join(serverRoot, "dist", "generated", "prisma");

if (!existsSync(source)) {
  throw new Error(`Prisma generated client not found at ${source}`);
}

rmSync(target, { force: true, recursive: true });
cpSync(source, target, { recursive: true });
