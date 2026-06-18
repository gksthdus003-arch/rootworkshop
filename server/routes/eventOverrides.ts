import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { pool } from "../db";
import type { EventItem } from "../../src/types/workshop";

export const eventOverridesRouter = Router();

const CONFIG_KEY = "event-overrides";
type EventOverrides = Record<string, EventItem[]>;

// mysql2 auto-parses JSON columns into JS values.
eventOverridesRouter.get("/", async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT config_value FROM app_config WHERE config_key = ?",
    [CONFIG_KEY],
  );
  const value = rows.length ? (rows[0].config_value as EventOverrides) : {};
  res.json(value);
});

eventOverridesRouter.put("/", async (req, res) => {
  const overrides = (req.body ?? {}) as EventOverrides;
  await pool.query(
    `INSERT INTO app_config (config_key, config_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
    [CONFIG_KEY, JSON.stringify(overrides)],
  );
  res.json(overrides);
});
