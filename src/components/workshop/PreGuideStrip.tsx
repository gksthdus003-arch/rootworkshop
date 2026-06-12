import { ArrowRight, CalendarDays } from "lucide-react";
import { formatKoreanStartDate, getDayCountdownLabel } from "../../lib/preGuide";

interface PreGuideStripProps {
  startDate: string;
  onClick: () => void;
}

export const PreGuideStrip = ({ startDate, onClick }: PreGuideStripProps) => (
  <button
    className="z-30 h-10 w-full shrink-0 border-b border-emerald-500 bg-emerald-600 text-left text-white"
    onClick={onClick}
    type="button"
  >
    <div className="mx-auto flex h-full max-w-screen-md items-center justify-between gap-2 px-3 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <CalendarDays className="h-4 w-4 shrink-0" />
        <p className="min-w-0 truncate text-xs font-semibold sm:text-sm">
          <span className="font-bold">{getDayCountdownLabel(startDate)}</span>
          <span className="mx-1.5 opacity-70">/</span>
          <span>{formatKoreanStartDate(startDate)}</span>
        </p>
      </div>
      <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-white/14 px-2.5 text-xs font-bold">
        안내
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </div>
  </button>
);
