import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
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
    event: "이벤트",
    free: "자유",
    notice: "공지",
  };

  return labels[category];
};

export const SchedulePage = () => {
  const { scheduleFocusRequestId, selectedGuide } = useWorkshopStore();
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sortedSchedule = sortScheduleByTime(selectedGuide.schedule);
  const scheduleGroups = sortedSchedule.reduce<Array<{ dateKey: string; items: ScheduleItem[] }>>(
    (groups, schedule) => {
      const dateKey = schedule.startAt.slice(0, 10);
      const lastGroup = groups[groups.length - 1];

      if (lastGroup?.dateKey === dateKey) {
        lastGroup.items.push(schedule);
        return groups;
      }

      return [...groups, { dateKey, items: [schedule] }];
    },
    [],
  );
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
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-soft">
        <p className="min-w-0 truncate text-xs font-semibold text-gray-500">
          {displaySchedule
            ? `${statusLabel} · ${displaySchedule.title}`
            : selectedGuide.periodLabel}
        </p>
        {isManualOverride ? (
          <span className="shrink-0 rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-bold text-yellow-800">
            수동 지정
          </span>
        ) : null}
      </div>

      {scheduleGroups.length > 0 ? (
        <div className="space-y-3">
          {scheduleGroups.map((group, groupIndex) => (
            <section
              className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-soft"
              key={group.dateKey}
            >
              <div className="border-b border-gray-100 bg-gray-50 px-3 py-2">
                <h2 className="text-base font-bold text-gray-950">{groupIndex + 1}일차</h2>
              </div>

              <div className="divide-y divide-gray-100">
                {group.items.map((schedule) => {
                  const isHighlighted = highlightScheduleId === schedule.id;

                  return (
                    <div
                      className={cn(
                        "scroll-mt-24 border-l-4 px-3 py-3 transition",
                        isHighlighted
                          ? "border-l-brand-700 bg-brand-50"
                          : "border-l-transparent bg-white",
                      )}
                      key={schedule.id}
                      ref={(element) => {
                        rowRefs.current[schedule.id] = element;
                      }}
                    >
                      <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
                        <p
                          className={cn(
                            "whitespace-nowrap text-xs font-bold leading-5",
                            isHighlighted ? "text-brand-900" : "text-gray-600",
                          )}
                        >
                          {formatScheduleTime(schedule)}
                        </p>

                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
                                isHighlighted
                                  ? "bg-brand-700 text-white"
                                  : "bg-gray-100 text-gray-600",
                              )}
                            >
                              {getCategoryLabel(schedule.category)}
                            </span>
                            <p className="min-w-0 truncate text-sm font-bold text-gray-950">
                              {schedule.title}
                            </p>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                            {schedule.description}
                          </p>
                          <div
                            className={cn(
                              "mt-1 flex min-w-0 items-center gap-1.5 text-xs font-semibold",
                              isHighlighted ? "text-brand-900" : "text-gray-700",
                            )}
                          >
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{schedule.location}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500 shadow-soft">
          등록된 일정이 없습니다.
        </div>
      )}
    </section>
  );
};
