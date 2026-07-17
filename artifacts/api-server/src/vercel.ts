import app from "./app";
import { bootstrapDemoData } from "./bootstrap";

let bootPromise: Promise<void> | null = null;

function ensureBootstrapped() {
  if (!bootPromise) {
    bootPromise = bootstrapDemoData().catch((err) => {
      console.error("[vercel] bootstrap failed", err);
    });
  }
  return bootPromise;
}

app.use(async (_req, _res, next) => {
  await ensureBootstrapped();
  next();
});

export default app;
