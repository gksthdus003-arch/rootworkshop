import express from "express";
import cors from "cors";
import { ensureSchema } from "./schema";
import { seedIfEmpty } from "./seed";
import { guidesRouter } from "./routes/guides";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/guides", guidesRouter);

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
