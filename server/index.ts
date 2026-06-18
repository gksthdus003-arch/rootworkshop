import express from "express";
import cors from "cors";
import { ensureSchema } from "./schema";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

const PORT = Number(process.env.PORT ?? 4000);

const start = async () => {
  await ensureSchema();
  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });
};

start().catch((error) => {
  console.error("[server] failed to start", error);
  process.exit(1);
});
