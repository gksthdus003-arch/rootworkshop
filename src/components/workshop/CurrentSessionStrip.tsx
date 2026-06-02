import { ArrowRight, Clock } from "lucide-react";
import { useCurrentSchedule } from "../../hooks/useCurrentSchedule";
import { formatScheduleTime } from "../../lib/schedule";
import type { ScheduleControlConfig, ScheduleItem } from "../../types/workshop";

interface CurrentSessionStripProps {
  schedule: ScheduleItem[];
  scheduleControl?: ScheduleControlConfig;
  onShortcutClick: () => void;
}

export const CurrentSessionStrip = ({
  schedule,
  scheduleControl,
  onShortcutClick,
}: CurrentSessionStripProps) => {
  const { displaySchedule, statusLabel } = useCurrentSchedule(schedule, scheduleControl);

  if (!displaySchedule) {
    return null;
  }

  return (
    <div className="z-30 h-10 shrink-0 border-b border-brand-100 bg-brand-700 text-white">
      <div className="mx-auto flex h-full max-w-screen-md items-center justify-between gap-2 px-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" />
          <p className="min-w-0 truncate text-xs font-semibold sm:text-sm">
            <span className="mr-1 opacity-80">{statusLabel}</span>
            <span className="font-bold">{displaySchedule.title}</span>
            <span className="mx-1 opacity-60">·</span>
            <span>{displaySchedule.location}</span>
            <span className="mx-1 opacity-60">·</span>
            <span>{formatScheduleTime(displaySchedule)}</span>
          </p>
        </div>
        <button
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-white/14 px-2.5 text-xs font-bold hover:bg-white/20"
          onClick={onShortcutClick}
          type="button"
        >
          바로가기
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
