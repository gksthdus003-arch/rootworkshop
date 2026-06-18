import { Router } from "express";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { pool } from "../db";
import { isMember } from "./members";
import type { ParticipantProfile } from "../../src/types/workshop";

export const participantsRouter = Router();

const readParticipants = async (): Promise<ParticipantProfile[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, created_at FROM participants ORDER BY created_at ASC",
  );
  return rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    createdAt: row.created_at as string,
  }));
};

participantsRouter.get("/", async (_req, res) => {
  res.json(await readParticipants());
});

participantsRouter.post("/", async (req, res) => {
  const body = req.body as Partial<ParticipantProfile>;
  const name = (body.name ?? "").trim();
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  if (!(await isMember(name))) {
    res.status(403).json({ error: "소속 구성원이 아닙니다. 접근이 불가합니다." });
    return;
  }

  const profile: ParticipantProfile = {
    id: body.id || randomUUID(),
    name,
    createdAt: body.createdAt || new Date().toISOString(),
  };

  // Upsert by unique name; keep the existing id/createdAt if the name already exists.
  await pool.query(
    `INSERT INTO participants (id, name, created_at) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE id = id`,
    [profile.id, profile.name, profile.createdAt],
  );

  res.json(await readParticipants());
});
