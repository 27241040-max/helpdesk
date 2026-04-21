const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1"]);
const isDevelopment = process.env.NODE_ENV !== "production";

function normalizeOrigins(rawOrigins: string | undefined): string[] {
  if (!rawOrigins) {
    return [];
  }

  return rawOrigins
    .split(",")
    .map((origin) => normalizePublicUrl(origin))
    .filter((origin): origin is string => Boolean(origin));
}

function normalizePublicUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/$/, "");
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

export const appBaseUrl =
  normalizePublicUrl(process.env.BETTER_AUTH_URL) ??
  normalizePublicUrl(process.env.RAILWAY_PUBLIC_DOMAIN);

const configuredOrigins = normalizeOrigins(process.env.CLIENT_ORIGIN);
const inferredOrigins = [appBaseUrl].filter((origin): origin is string => Boolean(origin));
const origins = Array.from(new Set([...configuredOrigins, ...inferredOrigins]));

export const trustedOrigins = isDevelopment
  ? expandDevelopmentOrigins(origins)
  : origins;

export function isAllowedOrigin(origin: string | undefined): boolean {
  const normalizedOrigin = normalizePublicUrl(origin);

  if (!normalizedOrigin) {
    return true;
  }

  if (trustedOrigins.includes(normalizedOrigin)) {
    return true;
  }

  try {
    const { protocol, hostname } = new URL(normalizedOrigin);
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

export function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function getAppBaseUrl(): string {
  if (!appBaseUrl) {
    throw new Error(
      "Missing required environment variable: BETTER_AUTH_URL. On Railway, RAILWAY_PUBLIC_DOMAIN can be used as a fallback.",
    );
  }

  return appBaseUrl;
}
