import path from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";

import { config as loadEnv } from "dotenv";

const task = process.argv[2];
const rootDir = process.cwd();
const serverDir = path.join(rootDir, "server");
const envFile = path.join(serverDir, ".env.playwright");

if (!["push", "seed", "setup"].includes(task)) {
  console.error('Usage: node scripts/playwright-db.mjs <push|seed|setup>');
  process.exit(1);
}

const loaded = loadEnv({ path: envFile, override: true });

if (loaded.error) {
  console.error(`Failed to load ${envFile}`);
  console.error(loaded.error);
  process.exit(1);
}

const commandPrefix = process.platform === "win32" ? "npx.cmd" : "npx";
const commands =
  task === "setup"
    ? [
        `${commandPrefix} prisma db push`,
        `${commandPrefix} prisma db seed`,
      ]
    : [
        `${commandPrefix} prisma db ${task}`,
      ];

function runNext(index) {
  const command = commands[index];

  const child = spawn(command, {
    cwd: serverDir,
    env: process.env,
    shell: true,
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      process.exit(code ?? 1);
      return;
    }

    if (index === commands.length - 1) {
      process.exit(0);
      return;
    }

    runNext(index + 1);
  });
}

runNext(0);
