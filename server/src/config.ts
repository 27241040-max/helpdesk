const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1"]);
const isDevelopment = process.env.NODE_ENV !== "production";

function normalizeOrigins(rawOrigins: string | undefined): string[] {
  if (!rawOrigins) {
    return [];
  }

  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function expandDevelopmentOrigins(origins: string[]): string[] {
  const expanded = new Set(origins);

  for (const origin of origins) {
    try {
      const url = new URL(origin);

      if (url.protocol !== "http:" || !LOCALHOST_HOSTS.has(url.hostname)) {
        continue;
      }

      expanded.add(`http://localhost${url.port ? `:${url.port}` : ""}`);
      expanded.add(`http://127.0.0.1${url.port ? `:${url.port}` : ""}`);
    } catch {
      continue;
    }
  }

  return Array.from(expanded);
}

const configuredOrigins = normalizeOrigins(process.env.CLIENT_ORIGIN);

export const trustedOrigins = isDevelopment
  ? expandDevelopmentOrigins(configuredOrigins)
  : configuredOrigins;

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  if (trustedOrigins.includes(origin)) {
    return true;
  }

  try {
    const { protocol, hostname } = new URL(origin);
    return isDevelopment && protocol === "http:" && LOCALHOST_HOSTS.has(hostname);
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
