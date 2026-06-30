import type { ScheduleItem } from "../types/workshop";

const padTime = (value: number) => String(value).padStart(2, "0");
const workshopDateFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Seoul",
  year: "numeric",
});

const formatDateKeyInWorkshopTimezone = (date: Date) => {
  const parts = workshopDateFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
};

export const formatClockTime = (dateValue: string) => {
  const date = new Date(dateValue);

  return `${padTime(date.getHours())}:${padTime(date.getMinutes())}`;
};

export const formatScheduleTime = (schedule: ScheduleItem) =>
  schedule.displayTime ??
  `${formatClockTime(schedule.startAt)} - ${formatClockTime(schedule.endAt)}`;

export const sortScheduleByTime = (schedule: ScheduleItem[]) =>
  [...schedule].sort(
    (first, second) =>
      new Date(first.startAt).getTime() - new Date(second.startAt).getTime(),
  );

export const getScheduleDateKey = (schedule: ScheduleItem) => {
  const date = new Date(schedule.startAt);

  if (!Number.isNaN(date.getTime())) {
    return formatDateKeyInWorkshopTimezone(date);
  }

  const rawDateMatch = schedule.startAt.match(/^\d{4}-\d{2}-\d{2}/);
  return rawDateMatch?.[0] ?? "";
};
