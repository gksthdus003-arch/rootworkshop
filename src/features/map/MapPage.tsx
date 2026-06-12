import { useEffect, useMemo, useState } from "react";
import { InteractiveMap } from "./InteractiveMap";
import konjiamMapImageUrl from "../../assets/konjiam-map-base.png";
import { useCurrentSchedule } from "../../hooks/useCurrentSchedule";
import { sortScheduleByTime } from "../../lib/schedule";
import { useWorkshopStore } from "../../store/workshopStore";
import type { ScheduleItem } from "../../types/workshop";

interface MapPageProps {
  onPreGuideClick?: () => void;
}

const getCurrentScheduleByTime = (schedule: ScheduleItem[], now: Date) => {
  const currentTime = now.getTime();

  return sortScheduleByTime(schedule).find((item) => {
    const start = new Date(item.startAt).getTime();
    const end = new Date(item.endAt).getTime();

    return currentTime >= start && currentTime < end;
  });
};

const getNextScheduleByTime = (schedule: ScheduleItem[], now: Date) => {
  const currentTime = now.getTime();

  return sortScheduleByTime(schedule).find(
    (item) => new Date(item.startAt).getTime() > currentTime,
  );
};

export const MapPage = ({ onPreGuideClick }: MapPageProps) => {
  const { selectedGuide } = useWorkshopStore();
  const { displaySchedule } = useCurrentSchedule(
    selectedGuide.schedule,
    selectedGuide.scheduleControl,
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(
    displaySchedule?.locationId,
  );
  const [notice, setNotice] = useState<string>();
  const mapLocationIds = useMemo(
    () => new Set(selectedGuide.map.locations.map((location) => location.id)),
    [selectedGuide.map.locations],
  );

  useEffect(() => {
    setSelectedLocationId(displaySchedule?.locationId);
    setNotice(undefined);
  }, [displaySchedule?.locationId, selectedGuide.id]);

  const focusScheduleLocation = (scheduleItem: ScheduleItem | undefined, message?: string) => {
    if (!scheduleItem?.locationId) {
      setNotice("해당 일정에 연결된 지도 장소가 없습니다.");
      return;
    }

    if (!mapLocationIds.has(scheduleItem.locationId)) {
      setNotice("해당 일정에 연결된 지도 장소가 없습니다.");
      return;
    }

    setSelectedLocationId(scheduleItem.locationId);
    setNotice(message);
  };

  const handleCurrentLocationClick = () => {
    if (selectedGuide.status === "pre") {
      setNotice("워크숍 시작 전입니다. 사전 안내 페이지로 이동합니다.");
      onPreGuideClick?.();
      return;
    }

    if (selectedGuide.status === "closed") {
      setNotice("종료된 워크숍입니다.");
      return;
    }

    const now = new Date();
    const currentSchedule = getCurrentScheduleByTime(selectedGuide.schedule, now);

    if (currentSchedule) {
      focusScheduleLocation(currentSchedule);
      return;
    }

    const nextSchedule = getNextScheduleByTime(selectedGuide.schedule, now);

    if (nextSchedule) {
      focusScheduleLocation(
        nextSchedule,
        "현재 진행 중인 일정이 없어 다음 일정 장소를 표시합니다.",
      );
      return;
    }

    setNotice("표시할 일정 장소가 없습니다.");
  };

  return (
    <section className="relative h-full min-h-0 overflow-hidden bg-[#dce8c8] md:rounded-lg md:border md:border-gray-200">
      <InteractiveMap
        fallbackImageUrl={konjiamMapImageUrl}
        focusLocationId={selectedLocationId}
        imageUrl={selectedGuide.map.imageUrl}
        locations={selectedGuide.map.locations}
        onCurrentLocationClick={handleCurrentLocationClick}
        title={selectedGuide.map.title}
      />

      {notice ? (
        <div className="pointer-events-none absolute left-1/2 top-16 z-30 w-[min(22rem,calc(100%-2rem))] -translate-x-1/2 rounded-lg bg-white/95 px-3 py-2 text-center text-sm font-bold text-brand-900 shadow-soft backdrop-blur">
          {notice}
        </div>
      ) : null}
    </section>
  );
};
