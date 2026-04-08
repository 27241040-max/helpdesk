import { spawnSync } from "node:child_process";

function run(command: string) {
  const result = spawnSync(command, {
    cwd: process.cwd(),
    shell: true,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command}`);
  }
}

export default async function globalSetup() {
  run("npm run playwright:db:setup");
}
