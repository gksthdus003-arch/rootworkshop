// Smoke test for the workshop API. Exits non-zero on first failure.
// Usage: node server/scripts/smoke.mjs   (server must be running on PORT)
const BASE = process.env.SMOKE_BASE ?? "http://localhost:4000";

let passed = 0;
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};
const ok = (msg) => {
  passed += 1;
  console.log(`✓ ${msg}`);
};

const json = async (path, init) => {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    fail(`${path} returned non-JSON: ${text.slice(0, 80)}`);
  }
  return { res, body };
};

// 1. health
{
  const { res, body } = await json("/api/health");
  if (!res.ok || body?.ok !== true) fail("health");
  ok("health");
}

// 2. guides GET non-empty
let guides;
{
  const { body } = await json("/api/guides");
  if (!Array.isArray(body) || body.length === 0) fail("GET guides empty");
  guides = body;
  ok(`GET guides (${body.length})`);
}

// 3. guides PUT roundtrip (re-save, mutate a title then restore)
{
  const original = JSON.parse(JSON.stringify(guides));
  const mutated = JSON.parse(JSON.stringify(guides));
  mutated[0].subtitle = "__smoke__";
  const { body } = await json("/api/guides", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(mutated),
  });
  if (body[0].subtitle !== "__smoke__") fail("PUT guides did not persist");
  const reget = (await json("/api/guides")).body;
  if (reget[0].subtitle !== "__smoke__") fail("GET after PUT mismatch");
  // restore
  await json("/api/guides", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(original),
  });
  ok("PUT guides roundtrip");
}

// 4. participants upsert idempotent
{
  const p = { name: "스모크참가자", createdAt: new Date().toISOString() };
  await json("/api/participants", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(p),
  });
  const after = (await json("/api/participants", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(p),
  })).body;
  const count = after.filter((x) => x.name === "스모크참가자").length;
  if (count !== 1) fail(`participant upsert not idempotent (count=${count})`);
  ok("participants upsert idempotent");
}

// 5. event-responses single upsert
{
  const r = {
    id: "smoke-r1",
    guideId: guides[0].id,
    eventId: "smoke-event",
    participantName: "스모크참가자",
    submittedAt: new Date().toISOString(),
    answers: { q1: "a" },
  };
  await json("/api/event-responses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(r),
  });
  // upsert again with different answer
  await json("/api/event-responses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...r, answers: { q1: "b" } }),
  });
  const list = (await json("/api/event-responses")).body;
  const mine = list.filter(
    (x) => x.eventId === "smoke-event" && x.participantName === "스모크참가자",
  );
  if (mine.length !== 1 || mine[0].answers.q1 !== "b") {
    fail(`event-response upsert wrong (len=${mine.length})`);
  }
  // cleanup via PUT replace excluding smoke rows
  const cleaned = list.filter((x) => x.eventId !== "smoke-event");
  await json("/api/event-responses", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cleaned),
  });
  ok("event-responses upsert");
}

// 6. event-overrides roundtrip
{
  const sample = { [guides[0].id]: [] };
  await json("/api/event-overrides", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(sample),
  });
  const got = (await json("/api/event-overrides")).body;
  if (!(guides[0].id in got)) fail("event-overrides roundtrip");
  // reset
  await json("/api/event-overrides", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  ok("event-overrides roundtrip");
}

// 7. admin verify (seeded password is "1234")
{
  const good = (await json("/api/admin/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "1234" }),
  })).body;
  const bad = (await json("/api/admin/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "wrong" }),
  })).body;
  if (good?.ok !== true || bad?.ok !== false) fail("admin verify");
  ok("admin verify");
}

console.log(`\nAll ${passed} smoke checks passed.`);
