import { createApp } from "./app.js";
import { env } from "./config/env.js";

function exitWithFatalError(label, errorLike) {
  // eslint-disable-next-line no-console
  console.error(`[${label}]`, errorLike?.stack || errorLike?.message || errorLike);
  process.exit(1);
}

process.on("uncaughtException", (err) => {
  exitWithFatalError("uncaughtException", err);
});

process.on("unhandledRejection", (reason) => {
  exitWithFatalError("unhandledRejection", reason);
});

const app = createApp();
const port = env.port;

const server = app.listen(port, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(
    `[startup] Insighta portal listening on 0.0.0.0:${port} | NODE_ENV=${env.nodeEnv} | backend=${env.backendBaseUrl}`
  );
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    exitWithFatalError("startup", `Port ${port} is already in use. Stop the existing process and retry.`);
    return;
  }

  exitWithFatalError("startup", error);
});
