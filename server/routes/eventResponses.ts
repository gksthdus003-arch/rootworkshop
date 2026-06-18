import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { pool } from "../db";
import { normalizeEventResponse } from "../normalize";
import type { EventSurveyResponse } from "../../src/types/workshop";

export const eventResponsesRouter = Router();

const parseJson = <T>(value: unknown): T =>
  typeof value === "string" ? (JSON.parse(value) as T) : (value as T);

const rowToResponse = (row: RowDataPacket): EventSurveyResponse => ({
  id: row.id as string,
  guideId: row.guide_id as string,
  eventId: row.event_id as string,
  participantId: (row.participant_id as string | null) ?? undefined,
  participantName: row.participant_name as string,
  submittedAt: row.submitted_at as string,
  assignedTeamId: (row.assigned_team_id as string | null) ?? undefined,
  answers: parseJson<EventSurveyResponse["answers"]>(row.answers),
});

const readResponses = async (): Promise<EventSurveyResponse[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM event_responses ORDER BY submitted_at ASC",
  );
  return rows.map(rowToResponse);
};

const insertResponse = async (
  conn: { query: typeof pool.query },
  response: EventSurveyResponse,
): Promise<void> => {
  await conn.query(
    `INSERT INTO event_responses
       (id, guide_id, event_id, participant_id, participant_name, assigned_team_id, submitted_at, answers)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      response.id,
      response.guideId,
      response.eventId,
      response.participantId ?? null,
      response.participantName,
      response.assignedTeamId ?? null,
      response.submittedAt,
      JSON.stringify(response.answers ?? {}),
    ],
  );
};

eventResponsesRouter.get("/", async (_req, res) => {
  res.json(await readResponses());
});

// Replace the entire set (mirrors saveEventResponses).
eventResponsesRouter.put("/", async (req, res) => {
  const incoming = Array.isArray(req.body) ? (req.body as EventSurveyResponse[]) : [];
  const responses = incoming.map(normalizeEventResponse);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM event_responses");
    for (const response of responses) {
      await insertResponse(conn, response);
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  res.json(responses);
});

// Upsert a single response (mirrors saveEventResponse): same guide+event and
// same participant (by id when present, otherwise by name) replaces the old row.
eventResponsesRouter.post("/", async (req, res) => {
  const response = normalizeEventResponse(req.body as EventSurveyResponse);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (response.participantId) {
      await conn.query(
        "DELETE FROM event_responses WHERE guide_id = ? AND event_id = ? AND participant_id = ?",
        [response.guideId, response.eventId, response.participantId],
      );
    } else {
      await conn.query(
        "DELETE FROM event_responses WHERE guide_id = ? AND event_id = ? AND participant_name = ?",
        [response.guideId, response.eventId, response.participantName],
      );
    }
    await insertResponse(conn, response);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  res.json(response);
});
