import { pool } from "./db";

// Creates all tables if they do not exist. Idempotent.
export const ensureSchema = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guides (
      id          VARCHAR(128) PRIMARY KEY,
      is_default  TINYINT(1) NOT NULL DEFAULT 0,
      sort_order  INT NOT NULL DEFAULT 0,
      data        JSON NOT NULL,
      updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS participants (
      id          VARCHAR(128) PRIMARY KEY,
      name        VARCHAR(255) NOT NULL UNIQUE,
      created_at  VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_responses (
      id                VARCHAR(128) PRIMARY KEY,
      guide_id          VARCHAR(128) NOT NULL,
      event_id          VARCHAR(128) NOT NULL,
      participant_id    VARCHAR(128) NULL,
      participant_name  VARCHAR(255) NOT NULL,
      assigned_team_id  VARCHAR(128) NULL,
      submitted_at      VARCHAR(64) NOT NULL,
      answers           JSON NOT NULL,
      UNIQUE KEY uniq_response (guide_id, event_id, participant_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_config (
      config_key    VARCHAR(64) PRIMARY KEY,
      config_value  JSON NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
};
