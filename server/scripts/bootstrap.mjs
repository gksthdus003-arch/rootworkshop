// Bootstraps the `workshop` database and `workshop` user using the root account.
// Idempotent: safe to run multiple times.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import mysql from "mysql2/promise";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: join(here, "..", ".env") });

const ROOT = {
  host: process.env.ROOT_DB_HOST ?? process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.ROOT_DB_PORT ?? process.env.DB_PORT ?? 3306),
  user: process.env.ROOT_DB_USER ?? "root",
  password: process.env.ROOT_DB_PASSWORD ?? "root123",
  multipleStatements: true,
};

const database = process.env.DB_NAME ?? "workshop";
const appUser = process.env.DB_USER ?? "workshop";
const appPassword = process.env.DB_PASSWORD ?? "workshop123";

const conn = await mysql.createConnection(ROOT);

await conn.query(
  `CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
);
await conn.query(
  `CREATE USER IF NOT EXISTS ${conn.escape(appUser)}@'%' IDENTIFIED BY ${conn.escape(appPassword)};`,
);
await conn.query(
  `GRANT ALL PRIVILEGES ON ${mysql.escapeId(database)}.* TO ${conn.escape(appUser)}@'%';`,
);
await conn.query(`FLUSH PRIVILEGES;`);

console.log(`[bootstrap] ${database} database and ${appUser} user are ready`);
await conn.end();
