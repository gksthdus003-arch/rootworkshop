import assert from "node:assert/strict";
import test from "node:test";
import { formatScheduleTime } from "../src/lib/schedule";
import type { ScheduleItem } from "../src/types/workshop";

test("관리자에서 수정한 시작·종료 시간을 레거시 표시 시간보다 우선한다", () => {
  const schedule: ScheduleItem = {
    id: "schedule-1",
    title: "수정된 일정",
    description: "",
    displayTime: "09:00 - 10:00",
    startAt: "2026-07-02T11:00:00",
    endAt: "2026-07-02T12:30:00",
    location: "회의실",
    category: "session",
  };

  assert.equal(formatScheduleTime(schedule), "11:00 - 12:30");
});
