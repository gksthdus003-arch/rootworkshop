import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { pool } from "../db";
import { mockAdminConfig } from "../../src/data/mockData";

export const adminRouter = Router();

const CONFIG_KEY = "admin-password";

// mysql2 auto-parses JSON columns, so config_value is already the JS value.
const readPassword = async (): Promise<string> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT config_value FROM app_config WHERE config_key = ?",
    [CONFIG_KEY],
  );
  return rows.length ? (rows[0].config_value as string) : mockAdminConfig.password;
};

// Verify happens server-side only; the password is never sent to the client.
adminRouter.post("/verify", async (req, res) => {
  const password = (req.body as { password?: string }).password ?? "";
  const stored = await readPassword();
  res.json({ ok: password === stored });
});

adminRouter.put("/password", async (req, res) => {
  const password = (req.body as { password?: string }).password ?? "";
  if (!password) {
    res.status(400).json({ error: "password is required" });
    return;
  }
  await pool.query(
    `INSERT INTO app_config (config_key, config_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
    [CONFIG_KEY, JSON.stringify(password)],
  );
  res.json({ ok: true });
});
