import { useEffect, useRef } from "react";
import {
  CalendarCheck,
  Coffee,
  Info,
  MapPin,
  Presentation,
  Sparkles,
  Trophy,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { formatScheduleTime, sortScheduleByTime } from "../../lib/schedule";
import { useCurrentSchedule } from "../../hooks/useCurrentSchedule";
import { useWorkshopStore } from "../../store/workshopStore";
import type { ScheduleItem } from "../../types/workshop";

const scheduleCategoryMeta: Record<
  ScheduleItem["category"],
  { icon: LucideIcon; label: string }
> = {
  orientation: { icon: Info, label: "안내" },
  session: { icon: Presentation, label: "세션" },
  break: { icon: Coffee, label: "휴식" },
  meal: { icon: Utensils, label: "식사" },
  activity: { icon: Trophy, label: "활동" },
  event: { icon: CalendarCheck, label: "이벤트" },
  free: { icon: Sparkles, label: "자유" },
  notice: { icon: Info, label: "공지" },
};

const formatScheduleGroupLabel = (groupIndex: number, dateKey: string) => {
  const [, month, day] = dateKey.split("-").map(Number);

  if (!month || !day) {
    return `${groupIndex + 1}일차`;
  }

  return `${groupIndex + 1}일차 (${month}월 ${day}일)`;
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
  const { currentSchedule, displaySchedule, highlightScheduleId, isManualOverride, statusLabel } =
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
            <section className="space-y-2.5" key={group.dateKey}>
              <div className="flex items-center gap-3 px-1 py-1">
                <div className="h-px flex-1 bg-gray-200" />
                <h2 className="shrink-0 text-sm font-extrabold text-gray-800">
                  {formatScheduleGroupLabel(groupIndex, group.dateKey)}
                </h2>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="space-y-2.5">
                {group.items.map((schedule) => {
                  const isHighlighted = highlightScheduleId === schedule.id;
                  const isCurrent = currentSchedule?.id === schedule.id;
                  const CategoryIcon = scheduleCategoryMeta[schedule.category].icon;
                  const categoryLabel = scheduleCategoryMeta[schedule.category].label;

                  return (
                    <div
                      className={cn(
                        "scroll-mt-24 rounded-lg border bg-white p-3 shadow-soft transition",
                        isCurrent
                          ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-100"
                          : isHighlighted
                          ? "border-brand-600 bg-brand-50 ring-1 ring-brand-100"
                          : "border-gray-200",
                      )}
                      key={schedule.id}
                      ref={(element) => {
                        rowRefs.current[schedule.id] = element;
                      }}
                    >
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <div className="flex min-w-0 shrink-0 items-center gap-1.5">
                          <span
                            aria-label={categoryLabel}
                            className={cn(
                              "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                              isCurrent
                                ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                                : "bg-brand-50 text-brand-700 ring-1 ring-brand-100",
                            )}
                            title={categoryLabel}
                          >
                            <CategoryIcon className="h-3.5 w-3.5" />
                          </span>
                          <span
                            className={cn(
                              "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[11px] font-bold leading-none",
                              isCurrent
                                ? "bg-emerald-700 text-white"
                                : isHighlighted
                                ? "bg-brand-700 text-white"
                                : "bg-gray-100 text-gray-700",
                            )}
                          >
                            {formatScheduleTime(schedule)}
                          </span>
                        </div>

                        <div
                          className={cn(
                            "flex min-w-0 items-center justify-end gap-1 text-[11px] font-semibold",
                            isCurrent
                              ? "text-emerald-900"
                              : isHighlighted
                              ? "text-brand-900"
                              : "text-gray-500",
                          )}
                        >
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{schedule.location}</span>
                        </div>
                      </div>

                      {isCurrent ? (
                        <div className="mt-3 flex min-w-0 items-center gap-2">
                          <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                            진행 중
                          </span>
                        </div>
                      ) : null}

                      <p className={cn("text-[15px] font-extrabold leading-6 text-gray-950", isCurrent ? "mt-2" : "mt-3")}>
                        {schedule.title}
                      </p>
                      <p className="mt-1 line-clamp-3 text-xs leading-5 text-gray-600">
                        {schedule.description}
                      </p>
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
