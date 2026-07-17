import app from "./app";
import { logger } from "./lib/logger";
import { bootstrapDemoData } from "./bootstrap";

const rawPort = process.env["PORT"] || "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function main() {
  try {
    await bootstrapDemoData();
    logger.info("Demo data ready");
  } catch (err) {
    logger.error({ err }, "Bootstrap failed — continuing (schema may need push)");
  }

  app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
