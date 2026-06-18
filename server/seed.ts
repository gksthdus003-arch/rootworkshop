import type { RowDataPacket } from "mysql2";
import { pool } from "./db";
import { normalizeGuides } from "./normalize";
import { mockAdminConfig, mockWorkshopGuides } from "../src/data/mockData";

// Seeds initial data once. Idempotent: only inserts when tables are empty.
export const seedIfEmpty = async (): Promise<void> => {
  const [guideRows] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS count FROM guides",
  );
  const guideCount = Number(guideRows[0]?.count ?? 0);

  if (guideCount === 0) {
    const guides = normalizeGuides(mockWorkshopGuides);
    for (const [index, guide] of guides.entries()) {
      await pool.query(
        "INSERT INTO guides (id, is_default, sort_order, data) VALUES (?, ?, ?, ?)",
        [guide.id, guide.isDefault ? 1 : 0, index, JSON.stringify(guide)],
      );
    }
    console.log(`[seed] inserted ${guides.length} guide(s)`);
  }

  const [configRows] = await pool.query<RowDataPacket[]>(
    "SELECT config_key FROM app_config WHERE config_key = 'admin-password'",
  );

  if (configRows.length === 0) {
    await pool.query(
      "INSERT INTO app_config (config_key, config_value) VALUES ('admin-password', ?)",
      [JSON.stringify(mockAdminConfig.password)],
    );
    console.log("[seed] initialized admin password");
  }
};
