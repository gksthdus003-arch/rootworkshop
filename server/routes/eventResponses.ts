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

const getNormalizedName = (name: string | undefined) => name?.trim() ?? "";

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

const updateResponse = async (
  conn: { query: typeof pool.query },
  response: EventSurveyResponse,
): Promise<void> => {
  await conn.query(
    `UPDATE event_responses
       SET guide_id = ?,
           event_id = ?,
           participant_id = ?,
           participant_name = ?,
           assigned_team_id = ?,
           submitted_at = ?,
           answers = ?
     WHERE id = ?`,
    [
      response.guideId,
      response.eventId,
      response.participantId ?? null,
      response.participantName,
      response.assignedTeamId ?? null,
      response.submittedAt,
      JSON.stringify(response.answers ?? {}),
      response.id,
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
// same participant updates the old row. participant_id is preferred, with a
// trimmed participant_name fallback for legacy rows that do not have an id.
eventResponsesRouter.post("/", async (req, res) => {
  const response = normalizeEventResponse(req.body as EventSurveyResponse);
  const normalizedParticipantName = getNormalizedName(response.participantName);

  const conn = await pool.getConnection();
  let savedResponse = response;
  try {
    await conn.beginTransaction();

    const [existingRows] = await conn.query<RowDataPacket[]>(
      `SELECT * FROM event_responses
       WHERE guide_id = ?
         AND event_id = ?
         AND (
           id = ?
           OR (? IS NOT NULL AND participant_id = ?)
           OR TRIM(participant_name) = ?
         )
       ORDER BY
         CASE
           WHEN id = ? THEN 0
           WHEN ? IS NOT NULL AND participant_id = ? THEN 1
           ELSE 2
         END,
         submitted_at DESC`,
      [
        response.guideId,
        response.eventId,
        response.id,
        response.participantId ?? null,
        response.participantId ?? null,
        normalizedParticipantName,
        response.id,
        response.participantId ?? null,
        response.participantId ?? null,
      ],
    );

    const existingResponse = existingRows[0] ? rowToResponse(existingRows[0]) : undefined;

    if (existingResponse) {
      savedResponse = {
        ...existingResponse,
        ...response,
        id: existingResponse.id,
        participantId: response.participantId ?? existingResponse.participantId,
        participantName:
          getNormalizedName(existingResponse.participantName) === normalizedParticipantName
            ? existingResponse.participantName
            : response.participantName,
        assignedTeamId: response.assignedTeamId ?? existingResponse.assignedTeamId,
        answers: {
          ...(existingResponse.answers ?? {}),
          ...(response.answers ?? {}),
        },
      };
      await updateResponse(conn, savedResponse);
    } else {
      savedResponse = {
        ...response,
        participantName: response.participantName.trim(),
      };
      await insertResponse(conn, savedResponse);
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  res.json(savedResponse);
});

eventResponsesRouter.delete("/:responseId", async (req, res) => {
  const { responseId } = req.params;

  const [result] = await pool.query(
    "DELETE FROM event_responses WHERE id = ? LIMIT 1",
    [responseId],
  );
  const affectedRows = (result as { affectedRows?: number }).affectedRows ?? 0;

  if (affectedRows === 0) {
    res.status(404).json({ error: "event response not found" });
    return;
  }

  res.status(204).end();
});
