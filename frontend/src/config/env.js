import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

function asBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return String(value).toLowerCase() === "true";
}

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function asPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction,
  port: Number(process.env.PORT || 3000),
  portalBaseUrl: required("PORTAL_BASE_URL", "http://localhost:3000"),
  sessionSecret: required("SESSION_SECRET", "change-me-in-production"),
  backendBaseUrl: required("BACKEND_BASE_URL", "http://localhost:8080"),
  backendApiVersion: process.env.BACKEND_API_VERSION || "1",
  backendAuthStartPath: process.env.BACKEND_AUTH_START_PATH || "/auth/github",
  backendAuthExchangePath: process.env.BACKEND_AUTH_EXCHANGE_PATH || "/auth/github/callback",
  backendMePath: process.env.BACKEND_ME_PATH || "/auth/me",
  backendLogoutPath: process.env.BACKEND_LOGOUT_PATH || "/auth/logout",
  backendRequestTimeoutMs: asPositiveInt(process.env.BACKEND_REQUEST_TIMEOUT_MS, 12000),
  databaseUrl: process.env.DATABASE_URL || "",
  sessionTableName: process.env.SESSION_TABLE_NAME || "user_sessions",
  pgSsl: asBoolean(process.env.PG_SSL, isProduction)
};
