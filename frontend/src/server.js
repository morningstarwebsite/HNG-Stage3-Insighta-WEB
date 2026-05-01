import { createApp } from "./app.js";
import { env } from "./config/env.js";

// Prevent any unhandled rejection or uncaught exception from silently killing
// the process. Node 20 exits on unhandledRejection by default; log and keep running.
process.on("uncaughtException", (err) => {
  // eslint-disable-next-line no-console
  console.error("[uncaughtException] Process kept alive:", err.stack || err.message);
});

process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("[unhandledRejection] Process kept alive:", reason?.stack || reason);
});

const app = createApp();
const port = env.port;

app.listen(port, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(
    `[startup] Insighta portal listening on 0.0.0.0:${port} | NODE_ENV=${env.nodeEnv} | backend=${env.backendBaseUrl}`
  );
});
