import type { ScheduleItem } from "../types/workshop";

const padTime = (value: number) => String(value).padStart(2, "0");

export const formatClockTime = (dateValue: string) => {
  const date = new Date(dateValue);

  return `${padTime(date.getHours())}:${padTime(date.getMinutes())}`;
};

export const formatScheduleTime = (schedule: ScheduleItem) =>
  `${formatClockTime(schedule.startAt)} - ${formatClockTime(schedule.endAt)}`;

export const sortScheduleByTime = (schedule: ScheduleItem[]) =>
  [...schedule].sort(
    (first, second) =>
      new Date(first.startAt).getTime() - new Date(second.startAt).getTime(),
  );
