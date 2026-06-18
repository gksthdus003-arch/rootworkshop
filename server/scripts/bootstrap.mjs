// Bootstraps the `workshop` database and `workshop` user using the root account.
// Idempotent: safe to run multiple times.
import mysql from "mysql2/promise";

const ROOT = {
  host: process.env.ROOT_DB_HOST ?? "127.0.0.1",
  port: Number(process.env.ROOT_DB_PORT ?? 3306),
  user: process.env.ROOT_DB_USER ?? "root",
  password: process.env.ROOT_DB_PASSWORD ?? "root123",
  multipleStatements: true,
};

const conn = await mysql.createConnection(ROOT);

await conn.query(
  `CREATE DATABASE IF NOT EXISTS workshop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
);
await conn.query(`CREATE USER IF NOT EXISTS 'workshop'@'%' IDENTIFIED BY 'workshop123';`);
await conn.query(`GRANT ALL PRIVILEGES ON workshop.* TO 'workshop'@'%';`);
await conn.query(`FLUSH PRIVILEGES;`);

console.log("[bootstrap] workshop database and user are ready");
await conn.end();
