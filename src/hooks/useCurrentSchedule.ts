import { useEffect, useMemo, useState } from "react";
import { sortScheduleByTime } from "../lib/schedule";
import type { ScheduleControlConfig, ScheduleItem } from "../types/workshop";

interface CurrentScheduleState {
  currentSchedule?: ScheduleItem;
  nextSchedule?: ScheduleItem;
  displaySchedule?: ScheduleItem;
  highlightScheduleId?: string;
  statusLabel: "현재 일정" | "다음 일정" | "지정 일정" | "일정 없음";
  isManualOverride: boolean;
}

export const useCurrentSchedule = (
  schedule: ScheduleItem[],
  scheduleControl?: ScheduleControlConfig,
): CurrentScheduleState => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);

    return () => window.clearInterval(timerId);
  }, []);

  return useMemo(() => {
    const sortedSchedule = sortScheduleByTime(schedule);
    const manualSchedule =
      scheduleControl?.mode === "manual" && scheduleControl.manualCurrentScheduleId
        ? sortedSchedule.find((item) => item.id === scheduleControl.manualCurrentScheduleId)
        : undefined;

    const currentSchedule = sortedSchedule.find((item) => {
      const start = new Date(item.startAt).getTime();
      const end = new Date(item.endAt).getTime();
      const current = now.getTime();

      return current >= start && current <= end;
    });

    const nextSchedule = sortedSchedule.find(
      (item) => new Date(item.startAt).getTime() > now.getTime(),
    );

    if (manualSchedule) {
      return {
        currentSchedule: manualSchedule,
        nextSchedule,
        displaySchedule: manualSchedule,
        highlightScheduleId: manualSchedule.id,
        statusLabel: "지정 일정",
        isManualOverride: true,
      };
    }

    if (currentSchedule) {
      return {
        currentSchedule,
        nextSchedule,
        displaySchedule: currentSchedule,
        highlightScheduleId: currentSchedule.id,
        statusLabel: "현재 일정",
        isManualOverride: false,
      };
    }

    if (nextSchedule) {
      return {
        nextSchedule,
        displaySchedule: nextSchedule,
        statusLabel: "다음 일정",
        isManualOverride: false,
      };
    }

    return {
      statusLabel: "일정 없음",
      isManualOverride: false,
    };
  }, [now, schedule, scheduleControl?.manualCurrentScheduleId, scheduleControl?.mode]);
};
