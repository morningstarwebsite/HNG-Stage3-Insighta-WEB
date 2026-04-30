import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

app.listen(env.port, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`Insighta portal listening on 0.0.0.0:${env.port}`);
});
