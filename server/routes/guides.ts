import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { pool } from "../db";
import { normalizeGuides } from "../normalize";
import { seedIfEmpty } from "../seed";
import type { WorkshopGuide } from "../../src/types/workshop";

export const guidesRouter = Router();

// mysql2 auto-parses JSON columns into objects; tolerate strings just in case.
const parseJson = <T>(value: unknown): T =>
  typeof value === "string" ? (JSON.parse(value) as T) : (value as T);

const readGuides = async (): Promise<WorkshopGuide[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT data FROM guides ORDER BY sort_order ASC",
  );
  return normalizeGuides(rows.map((row) => parseJson<WorkshopGuide>(row.data)));
};

guidesRouter.get("/", async (_req, res) => {
  let guides = await readGuides();
  if (guides.length === 0) {
    await seedIfEmpty();
    guides = await readGuides();
  }
  res.json(guides);
});

guidesRouter.put("/", async (req, res) => {
  const incoming = Array.isArray(req.body) ? (req.body as WorkshopGuide[]) : [];
  const guides = normalizeGuides(incoming);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM guides");
    for (const [index, guide] of guides.entries()) {
      await conn.query(
        "INSERT INTO guides (id, is_default, sort_order, data) VALUES (?, ?, ?, ?)",
        [guide.id, guide.isDefault ? 1 : 0, index, JSON.stringify(guide)],
      );
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  res.json(guides);
});
