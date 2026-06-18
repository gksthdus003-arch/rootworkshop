import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { ensureSchema } from "./schema";
import { seedIfEmpty } from "./seed";
import { guidesRouter } from "./routes/guides";
import { participantsRouter } from "./routes/participants";
import { membersRouter } from "./routes/members";
import { eventResponsesRouter } from "./routes/eventResponses";
import { eventOverridesRouter } from "./routes/eventOverrides";
import { adminRouter } from "./routes/admin";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/guides", guidesRouter);
app.use("/api/participants", participantsRouter);
app.use("/api/members", membersRouter);
app.use("/api/event-responses", eventResponsesRouter);
app.use("/api/event-overrides", eventOverridesRouter);
app.use("/api/admin", adminRouter);

// In production, serve the built frontend (dist/) and fall back to index.html
// for client-side routing. Enabled via SERVE_STATIC=true (set by the deploy
// script); in dev the Vite server serves the frontend instead.
if (process.env.SERVE_STATIC === "true") {
  const distDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(join(distDir, "index.html"));
  });
}

// JSON error handler — keep last.
app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("[server] error", error);
    res.status(500).json({ error: error.message });
  },
);

const PORT = Number(process.env.PORT ?? 4000);

const start = async () => {
  await ensureSchema();
  await seedIfEmpty();
  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });
};

start().catch((error) => {
  console.error("[server] failed to start", error);
  process.exit(1);
});
