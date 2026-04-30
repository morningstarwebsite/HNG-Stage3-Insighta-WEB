import cookieParser from "cookie-parser";
import connectPgSimple from "connect-pg-simple";
import csrf from "csurf";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import pg from "pg";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { flashMiddleware } from "./middleware/flash.js";
import { viewLocalsMiddleware } from "./middleware/viewLocals.js";
import { createRouter } from "./routes/index.js";
import { BackendClient } from "./services/backendClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { Pool } = pg;

export function createApp({ backendClient = new BackendClient(env) } = {}) {
  const app = express();

  // Railway terminates TLS at the edge proxy.
  app.set("trust proxy", 1);

  app.set("views", path.join(__dirname, "views"));
  app.set("view engine", "ejs");

  app.use(helmet({
    contentSecurityPolicy: false
  }));
  app.use(morgan(env.isProduction ? "combined" : "dev"));

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  app.use(cookieParser());
  const sessionConfig = {
    name: "insighta.sid",
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8
    }
  };

  if (env.databaseUrl && env.isProduction) {
    const pgSession = connectPgSimple(session);
    const pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: env.pgSsl ? { rejectUnauthorized: false } : false
    });

    sessionConfig.store = new pgSession({
      pool,
      tableName: env.sessionTableName,
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15
    });

    app.locals.sessionPool = pool;
  }

  app.use(session(sessionConfig));

  app.use(csrf());
  app.use(flashMiddleware);
  app.use(viewLocalsMiddleware);

  app.use((req, res, next) => {
    if (req.path.endsWith(".ejs")) {
      return res.status(404).render("error", {
        title: "Not found",
        message: "Template files are not directly accessible."
      });
    }
    return next();
  });

  app.use((req, res, next) => {
    const isProtectedPortalRoute = ["/dashboard", "/profiles", "/search", "/account"].some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`));
    const isDevMockRequest = !env.isProduction && isProtectedPortalRoute && req.query.mock === "1";
    if (!isDevMockRequest || req.session?.backendToken) {
      return next();
    }

    req.user = {
      id: "dev-user",
      name: "Portal Demo User",
      email: "demo@insighta.local",
      role: "admin"
    };
    req.session.backendToken = "dev-mock-token";
    req.session.currentUser = req.user;
    req.session.userFetchedAt = Date.now();

    res.locals.currentUser = req.user;
    res.locals.isAdmin = true;
    res.locals.canManageProfiles = true;
    return next();
  });

  app.use("/static", express.static(path.join(__dirname, "public")));
  app.use("/", createRouter(backendClient));

  app.use((error, req, res, next) => {
    if (res.headersSent) return;
    if (error.code === "EBADCSRFTOKEN") {
      try { req.flash("error", "Invalid or expired form token. Please retry."); } catch (_) {}
      return res.redirect("back");
    }
    return next(error);
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return;
    const statusCode = error.statusCode || 500;
    res.status(statusCode).render("error", {
      title: statusCode === 404 ? "Not found" : "Something went wrong",
      message: error.message || "Unexpected error"
    });
  });

  return app;
}
