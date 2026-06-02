import { useEffect, useRef } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { cn } from "../../lib/cn";
import { formatScheduleTime, sortScheduleByTime } from "../../lib/schedule";
import { useCurrentSchedule } from "../../hooks/useCurrentSchedule";
import { useWorkshopStore } from "../../store/workshopStore";
import type { ScheduleItem } from "../../types/workshop";

const getCategoryLabel = (category: ScheduleItem["category"]) => {
  const labels: Record<ScheduleItem["category"], string> = {
    orientation: "안내",
    session: "세션",
    break: "휴식",
    meal: "식사",
    activity: "활동",
    notice: "공지",
  };

  return labels[category];
};

export const SchedulePage = () => {
  const { scheduleFocusRequestId, selectedGuide } = useWorkshopStore();
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const sortedSchedule = sortScheduleByTime(selectedGuide.schedule);
  const { displaySchedule, highlightScheduleId, isManualOverride, statusLabel } =
    useCurrentSchedule(selectedGuide.schedule, selectedGuide.scheduleControl);
  const focusScheduleId = highlightScheduleId ?? displaySchedule?.id;

  useEffect(() => {
    if (!focusScheduleId) {
      return;
    }

    window.setTimeout(() => {
      rowRefs.current[focusScheduleId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  }, [focusScheduleId, scheduleFocusRequestId]);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">일정</h1>
        <p className="mt-1 text-sm text-gray-600">{selectedGuide.periodLabel}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-soft">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDays className="h-5 w-5 shrink-0 text-brand-700" />
            <div className="min-w-0">
              <p className="font-bold">전체 일정</p>
              <p className="truncate text-xs text-gray-500">
                {displaySchedule
                  ? `${statusLabel} · ${displaySchedule.title}`
                  : "현재 표시할 일정이 없습니다."}
              </p>
            </div>
          </div>
          {isManualOverride ? (
            <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-bold text-yellow-800">
              수동 지정
            </span>
          ) : null}
        </div>

        {sortedSchedule.length > 0 ? (
          <table className="w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[6.5rem] sm:w-36" />
              <col />
              <col className="w-[5.5rem] sm:w-32" />
            </colgroup>
            <thead className="bg-gray-50 text-xs font-bold text-gray-500">
              <tr>
                <th className="px-3 py-3 sm:px-4">시간</th>
                <th className="px-2 py-3 sm:px-4">제목 + 설명</th>
                <th className="px-2 py-3 sm:px-4">장소</th>
              </tr>
            </thead>
            <tbody>
              {sortedSchedule.map((schedule) => {
                const isHighlighted = highlightScheduleId === schedule.id;

                return (
                  <tr
                    className={cn(
                      "scroll-mt-36 border-t border-gray-100 transition",
                      isHighlighted
                        ? "border-l-4 border-l-brand-700 bg-brand-50"
                        : "border-l-4 border-l-transparent bg-white",
                    )}
                    key={schedule.id}
                    ref={(element) => {
                      rowRefs.current[schedule.id] = element;
                    }}
                  >
                    <td
                      className={cn(
                        "px-3 py-4 align-top text-xs font-semibold sm:px-4 sm:text-sm",
                        isHighlighted ? "text-brand-900" : "text-gray-600",
                      )}
                    >
                      {formatScheduleTime(schedule)}
                    </td>
                    <td className="min-w-0 px-2 py-4 align-top sm:px-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            "hidden rounded-full px-2 py-1 text-[11px] font-bold sm:inline-flex",
                            isHighlighted
                              ? "bg-brand-700 text-white"
                              : "bg-gray-100 text-gray-600",
                          )}
                        >
                          {getCategoryLabel(schedule.category)}
                        </span>
                        <p className="min-w-0 truncate font-bold text-gray-950">
                          {schedule.title}
                        </p>
                      </div>
                      <p className="mt-1 truncate text-xs text-gray-500">
                        {schedule.description}
                      </p>
                    </td>
                    <td className="px-2 py-4 align-top sm:px-4">
                      <div
                        className={cn(
                          "flex min-w-0 items-center gap-1.5 text-xs font-semibold sm:text-sm",
                          isHighlighted ? "text-brand-900" : "text-gray-700",
                        )}
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{schedule.location}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-4 py-10 text-center text-sm text-gray-500">
            등록된 일정이 없습니다.
          </div>
        )}
      </div>
    </section>
  );
};
