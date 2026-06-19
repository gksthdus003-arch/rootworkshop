import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { pool } from "../db";
import { normalizeGuides } from "../normalize";
import { seedIfEmpty } from "../seed";
import type { ScheduleItem, WorkshopGuide } from "../../src/types/workshop";

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

const readGuide = async (guideId: string): Promise<WorkshopGuide | undefined> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT data FROM guides WHERE id = ? LIMIT 1",
    [guideId],
  );
  const guide = rows[0] ? parseJson<WorkshopGuide>(rows[0].data) : undefined;
  return guide ? normalizeGuides([guide])[0] : undefined;
};

const writableScheduleFields = [
  "title",
  "description",
  "startAt",
  "endAt",
  "location",
  "locationId",
  "category",
] satisfies Array<keyof ScheduleItem>;

const pickScheduleUpdates = (body: unknown): Partial<ScheduleItem> => {
  if (!body || typeof body !== "object") {
    return {};
  }

  return writableScheduleFields.reduce<Partial<ScheduleItem>>((updates, field) => {
    if (field in body) {
      const value = (body as Partial<ScheduleItem>)[field];
      return {
        ...updates,
        [field]: value,
      };
    }

    return updates;
  }, {});
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

guidesRouter.patch("/:guideId/schedule/:scheduleItemId", async (req, res) => {
  const { guideId, scheduleItemId } = req.params;
  const guide = await readGuide(guideId);

  if (!guide) {
    res.status(404).json({ error: "Guide not found" });
    return;
  }

  const scheduleItem = guide.schedule.find((item) => item.id === scheduleItemId);

  if (!scheduleItem) {
    res.status(404).json({ error: "Schedule item not found" });
    return;
  }

  const updates = pickScheduleUpdates(req.body);
  const nextGuide = normalizeGuides([
    {
      ...guide,
      schedule: guide.schedule.map((item) =>
        item.id === scheduleItemId
          ? {
              ...item,
              ...updates,
              locationId: updates.locationId || undefined,
            }
          : item,
      ),
    },
  ])[0];

  await pool.query(
    "UPDATE guides SET is_default = ?, data = ? WHERE id = ?",
    [nextGuide.isDefault ? 1 : 0, JSON.stringify(nextGuide), guideId],
  );

  res.json(nextGuide);
});
