import { Router } from "express";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const membersPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "resources",
  "members.json",
);

let cache: string[] | null = null;

export const loadMembers = async (): Promise<string[]> => {
  if (cache) {
    return cache;
  }
  const raw = await readFile(membersPath, "utf-8");
  const parsed = JSON.parse(raw) as { members?: unknown };
  cache = Array.isArray(parsed.members)
    ? parsed.members.filter((name): name is string => typeof name === "string")
    : [];
  return cache;
};

export const isMember = async (name: string): Promise<boolean> => {
  const members = await loadMembers();
  return members.includes(name.trim());
};

export const membersRouter = Router();

membersRouter.get("/", async (_req, res) => {
  res.json(await loadMembers());
});
