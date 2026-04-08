const DEFAULT_CLIENT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1"]);

function normalizeOrigins(rawOrigins: string | undefined): string[] {
  if (!rawOrigins) {
    return [];
  }

  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const trustedOrigins = Array.from(
  new Set([...DEFAULT_CLIENT_ORIGINS, ...normalizeOrigins(process.env.CLIENT_ORIGIN)]),
);

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  if (trustedOrigins.includes(origin)) {
    return true;
  }

  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === "http:" && LOCALHOST_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
