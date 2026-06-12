import {
  ArrowRight,
  Cigarette,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/cn";
import { getMapLocationCategoryIcon } from "../../lib/mapLocationCategories";
import type { MapLocation, ScheduleItem, WorkshopStatus } from "../../types/workshop";

type ViewMode = "featured" | "all";

interface TransformState {
  scale: number;
  x: number;
  y: number;
}

interface PointerPoint {
  id: number;
  x: number;
  y: number;
}

type GestureState =
  | {
      type: "pan";
      pointerId: number;
      startX: number;
      startY: number;
      origin: TransformState;
    }
  | {
      type: "pinch";
      startDistance: number;
      startCenter: { x: number; y: number };
      origin: TransformState;
    };

interface InteractiveMapProps {
  title: string;
  imageUrl?: string;
  fallbackImageUrl?: string;
  locations: MapLocation[];
  guideStatus?: WorkshopStatus;
  schedule?: ScheduleItem[];
  onPreGuideClick?: () => void;
  isLocationEditingEnabled?: boolean;
  onLocationPositionChange?: (locationId: string, position: { xPercent: number; yPercent: number }) => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const INITIAL_TRANSFORM: TransformState = { scale: 1, x: 0, y: 0 };

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getDistance = (first: PointerPoint, second: PointerPoint) =>
  Math.hypot(first.x - second.x, first.y - second.y);

const getCenter = (first: PointerPoint, second: PointerPoint) => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2,
});

const areTransformsEqual = (first: TransformState, second: TransformState) =>
  first.scale === second.scale && first.x === second.x && first.y === second.y;

const roundPercent = (value: number) => Math.round(value * 10) / 10;

const getScheduleTime = (value: string) => {
  const time = new Date(value).getTime();

  return Number.isNaN(time) ? undefined : time;
};

export const InteractiveMap = ({
  title,
  imageUrl,
  fallbackImageUrl,
  locations,
  guideStatus,
  schedule,
  onPreGuideClick,
  isLocationEditingEnabled = false,
  onLocationPositionChange,
}: InteractiveMapProps) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pointersRef = useRef(new Map<number, PointerPoint>());
  const gestureRef = useRef<GestureState | null>(null);
  const transformRef = useRef<TransformState>(INITIAL_TRANSFORM);
  const draggedLocationIdRef = useRef<string | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [viewMode, setViewMode] = useState<ViewMode>("featured");
  const [showSmokingAreas, setShowSmokingAreas] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState<string>();
  const [noticeMessage, setNoticeMessage] = useState("");
  const [showPreGuideAction, setShowPreGuideAction] = useState(false);
  const [isControlMenuOpen, setIsControlMenuOpen] = useState(false);
  const [transform, setTransform] = useState<TransformState>(INITIAL_TRANSFORM);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl ?? fallbackImageUrl);
  const [hasImageError, setHasImageError] = useState(false);

  const fallbackMapSize =
    typeof window === "undefined" ? 360 : Math.min(window.innerWidth, window.innerHeight);
  const mapSize = Math.max(
    320,
    Math.min(viewportSize.width || fallbackMapSize, viewportSize.height || fallbackMapSize),
  );

  const getClampedTransform = (nextTransform: TransformState): TransformState => {
    const scale = clamp(nextTransform.scale, MIN_SCALE, MAX_SCALE);

    if (viewportSize.width <= 0 || viewportSize.height <= 0 || mapSize <= 0) {
      return {
        scale,
        x: nextTransform.x,
        y: nextTransform.y,
      };
    }

    const scaledMapSize = mapSize * scale;
    const maxX = Math.max(0, (scaledMapSize - viewportSize.width) / 2);
    const maxY = Math.max(0, (scaledMapSize - viewportSize.height) / 2);

    return {
      scale,
      x: maxX === 0 ? 0 : clamp(nextTransform.x, -maxX, maxX),
      y: maxY === 0 ? 0 : clamp(nextTransform.y, -maxY, maxY),
    };
  };

  const applyTransform = (nextTransform: TransformState) => {
    setTransform(getClampedTransform(nextTransform));
  };

  const visibleLocations = useMemo(
    () => {
      const baseLocations =
        viewMode === "featured"
          ? locations.filter((location) => location.isWorkshopLocation)
          : locations;

      if (showSmokingAreas) {
        const smokingLocations = locations.filter((location) => location.isSmokingArea);
        const visibleIds = new Set(baseLocations.map((location) => location.id));

        return [
          ...baseLocations,
          ...smokingLocations.filter((location) => !visibleIds.has(location.id)),
        ];
      }

      return baseLocations.filter((location) => !location.isSmokingArea);
    },
    [locations, showSmokingAreas, viewMode],
  );
  const visibleLocationIds = useMemo(
    () => new Set(visibleLocations.map((location) => location.id)),
    [visibleLocations],
  );
  const canMoveToScheduleLocation = Boolean(guideStatus && schedule);

  useLayoutEffect(() => {
    if (!viewportRef.current) {
      return;
    }

    const updateViewportSize = () => {
      const rect = viewportRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      setViewportSize({
        width: rect.width,
        height: rect.height,
      });
    };

    updateViewportSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateViewportSize);

      return () => window.removeEventListener("resize", updateViewportSize);
    }

    const observer = new ResizeObserver(updateViewportSize);

    observer.observe(viewportRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setCurrentImageUrl(imageUrl ?? fallbackImageUrl);
    setHasImageError(false);
  }, [fallbackImageUrl, imageUrl]);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    applyTransform(INITIAL_TRANSFORM);
  }, [mapSize, viewMode]);

  useEffect(() => {
    setTransform((previous) => {
      const clampedTransform = getClampedTransform(previous);

      return areTransformsEqual(previous, clampedTransform) ? previous : clampedTransform;
    });
  }, [mapSize, viewportSize.height, viewportSize.width]);

  const resetTransform = () => {
    applyTransform(INITIAL_TRANSFORM);
  };

  const moveToLocation = (location: MapLocation) => {
    const nextScale = Math.max(transformRef.current.scale, 1.8);
    const x = ((50 - location.xPercent) / 100) * mapSize * nextScale;
    const y = ((50 - location.yPercent) / 100) * mapSize * nextScale;

    setSelectedLocationId(location.id);
    applyTransform({
      scale: nextScale,
      x,
      y,
    });
  };

  const findScheduleLocationTarget = () => {
    if (guideStatus === "pre") {
      return {
        message: "워크숍 시작 전입니다. 사전안내를 확인해주세요.",
        showPreGuideAction: Boolean(onPreGuideClick),
      };
    }

    if (guideStatus === "closed") {
      return { message: "종료된 워크숍입니다." };
    }

    if (guideStatus !== "live" || !schedule?.length) {
      return { message: "표시할 일정 장소가 없습니다." };
    }

    const now = Date.now();
    const scheduleWithTime = schedule
      .map((scheduleItem) => ({
        scheduleItem,
        startTime: getScheduleTime(scheduleItem.startAt),
        endTime: getScheduleTime(scheduleItem.endAt),
      }))
      .filter(
        (item): item is {
          scheduleItem: ScheduleItem;
          startTime: number;
          endTime: number;
        } => item.startTime !== undefined && item.endTime !== undefined,
      );
    const currentSchedule = scheduleWithTime
      .filter((item) => item.startTime <= now && now < item.endTime)
      .sort((first, second) => first.startTime - second.startTime)[0];
    const nextSchedule = scheduleWithTime
      .filter((item) => now < item.startTime)
      .sort((first, second) => first.startTime - second.startTime)[0];
    const target = currentSchedule ?? nextSchedule;

    if (!target) {
      return { message: "표시할 일정 장소가 없습니다." };
    }

    if (!target.scheduleItem.locationId) {
      return { message: "해당 일정에 연결된 지도 장소가 없습니다." };
    }

    const location = locations.find((item) => item.id === target.scheduleItem.locationId);

    if (!location) {
      return { message: "해당 일정에 연결된 지도 장소가 없습니다." };
    }

    if (!visibleLocationIds.has(location.id)) {
      return {
        message: "해당 일정 장소가 현재 지도 필터에서 보이지 않습니다.",
      };
    }

    return {
      location,
      message: currentSchedule
        ? `${target.scheduleItem.title} 장소를 표시합니다.`
        : "현재 진행 중인 일정이 없어 다음 일정 장소를 표시합니다.",
    };
  };

  const handleMoveToCurrentLocation = () => {
    const target = findScheduleLocationTarget();

    setNoticeMessage(target.message);
    setShowPreGuideAction(Boolean(target.showPreGuideAction));

    if (target.location) {
      moveToLocation(target.location);
    }
  };

  const updateScale = (scaleDelta: number) => {
    setTransform((previous) => getClampedTransform({
      ...previous,
      scale: clamp(previous.scale + scaleDelta, MIN_SCALE, MAX_SCALE),
    }));
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    updateScale(event.deltaY > 0 ? -0.18 : 0.18);
  };

  const startPanGesture = (point: PointerPoint) => {
    gestureRef.current = {
      type: "pan",
      pointerId: point.id,
      startX: point.x,
      startY: point.y,
      origin: transformRef.current,
    };
  };

  const startPinchGesture = (points: PointerPoint[]) => {
    const [first, second] = points;

    if (!first || !second) {
      return;
    }

    gestureRef.current = {
      type: "pinch",
      startDistance: getDistance(first, second),
      startCenter: getCenter(first, second),
      origin: transformRef.current,
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = { id: event.pointerId, x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);

    const points = Array.from(pointersRef.current.values());

    if (points.length >= 2) {
      startPinchGesture(points);
      return;
    }

    startPanGesture(point);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) {
      return;
    }

    pointersRef.current.set(event.pointerId, {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    });

    const points = Array.from(pointersRef.current.values());
    const gesture = gestureRef.current;

    if (points.length >= 2) {
      const [first, second] = points;

      if (!first || !second) {
        return;
      }

      if (!gesture || gesture.type !== "pinch") {
        startPinchGesture(points);
        return;
      }

      const distance = getDistance(first, second);
      const center = getCenter(first, second);
      const scale = clamp(
        gesture.origin.scale * (distance / gesture.startDistance),
        MIN_SCALE,
        MAX_SCALE,
      );

      applyTransform({
        scale,
        x: gesture.origin.x + center.x - gesture.startCenter.x,
        y: gesture.origin.y + center.y - gesture.startCenter.y,
      });
      return;
    }

    const [point] = points;

    if (!point || !gesture || gesture.type !== "pan") {
      return;
    }

    applyTransform({
      scale: gesture.origin.scale,
      x: gesture.origin.x + point.x - gesture.startX,
      y: gesture.origin.y + point.y - gesture.startY,
    });
  };

  const stopPointerGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const points = Array.from(pointersRef.current.values());

    if (points.length === 1) {
      startPanGesture(points[0]);
      return;
    }

    gestureRef.current = null;
  };

  const getLocationPositionFromPointer = (event: ReactPointerEvent<HTMLElement>) => {
    const rect = viewportRef.current?.getBoundingClientRect();

    if (!rect || mapSize <= 0) {
      return;
    }

    const currentTransform = transformRef.current;
    const mapCenterX = rect.left + rect.width / 2 + currentTransform.x;
    const mapCenterY = rect.top + rect.height / 2 + currentTransform.y;
    const x = (event.clientX - mapCenterX) / currentTransform.scale + mapSize / 2;
    const y = (event.clientY - mapCenterY) / currentTransform.scale + mapSize / 2;

    return {
      xPercent: roundPercent(clamp((x / mapSize) * 100, 0, 100)),
      yPercent: roundPercent(clamp((y / mapSize) * 100, 0, 100)),
    };
  };

  const startLocationDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    locationId: string,
  ) => {
    if (!isLocationEditingEnabled || event.pointerType !== "mouse" || !onLocationPositionChange) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggedLocationIdRef.current = locationId;
    pointersRef.current.clear();
    gestureRef.current = null;

    const nextPosition = getLocationPositionFromPointer(event);

    if (nextPosition) {
      onLocationPositionChange(locationId, nextPosition);
    }
  };

  const updateLocationDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const locationId = draggedLocationIdRef.current;

    if (!locationId || !onLocationPositionChange) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const nextPosition = getLocationPositionFromPointer(event);

    if (nextPosition) {
      onLocationPositionChange(locationId, nextPosition);
    }
  };

  const stopLocationDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggedLocationIdRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    draggedLocationIdRef.current = null;
  };

  const inverseScale = 1 / transform.scale;

  return (
    <div
      aria-label={title}
      className="relative h-full w-full overflow-hidden bg-[#dce8c8] [clip-path:inset(0)]"
      onPointerCancel={stopPointerGesture}
      onPointerDown={handlePointerDown}
      onPointerLeave={stopPointerGesture}
      onPointerMove={handlePointerMove}
      onPointerUp={stopPointerGesture}
      onWheel={handleWheel}
      ref={viewportRef}
      role="application"
      style={{ overscrollBehavior: "none", touchAction: "none" }}
    >
      <div
        className="absolute left-1/2 top-1/2 origin-center select-none overflow-hidden"
        style={{
          height: mapSize,
          left: `calc(50% + ${transform.x}px)`,
          top: `calc(50% + ${transform.y}px)`,
          transform: `translate(-50%, -50%) scale(${transform.scale})`,
          width: mapSize,
        }}
      >
        {currentImageUrl ? (
          <img
            alt={title}
            className="block h-full w-full object-contain"
            draggable={false}
            onError={() => {
              if (fallbackImageUrl && currentImageUrl !== fallbackImageUrl) {
                setCurrentImageUrl(fallbackImageUrl);
                return;
              }

              setHasImageError(true);
            }}
            src={currentImageUrl}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-50 text-sm font-semibold text-brand-900">
            지도 이미지 없음
          </div>
        )}

        {hasImageError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-50 px-6 text-center text-sm font-semibold leading-6 text-brand-900">
            지도 이미지를 불러오지 못했습니다.
          </div>
        ) : null}

        {visibleLocations.map((location) => {
          const CategoryIcon = getMapLocationCategoryIcon(location.category);

          return (
            <div
              className={cn(
                "absolute",
                isLocationEditingEnabled ? "cursor-grab active:cursor-grabbing" : "",
              )}
              key={location.id}
              onPointerCancel={stopLocationDrag}
              onPointerDown={(event) => startLocationDrag(event, location.id)}
              onPointerMove={updateLocationDrag}
              onPointerUp={stopLocationDrag}
              style={{
                left: `${location.xPercent}%`,
                top: `${location.yPercent}%`,
                zIndex: selectedLocationId === location.id ? 30 : location.isWorkshopLocation ? 20 : 10,
              }}
            >
              <div
                className="flex flex-col items-center gap-1"
                style={{
                  transform: `translate(-50%, calc(-100% - 8px)) scale(${inverseScale})`,
                  transformOrigin: "bottom center",
                }}
              >
                <span
                  className={cn(
                    "max-w-28 truncate rounded-full px-2 py-0.5 font-bold shadow-soft",
                    selectedLocationId === location.id
                      ? "bg-brand-900 text-[10px] text-white ring-2 ring-white"
                      : location.isSmokingArea
                      ? "bg-gray-900 text-[10px] text-white"
                      : "bg-white text-[10px] text-brand-900",
                  )}
                >
                  {location.name}
                </span>
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full border-2 shadow-soft",
                    selectedLocationId === location.id
                      ? "h-7 w-7 border-white bg-brand-900 text-white ring-2 ring-brand-200"
                      : location.isSmokingArea
                      ? "h-6 w-6 border-white bg-gray-900 text-white"
                      : "h-6 w-6 border-white bg-brand-700 text-white",
                  )}
                >
                  <CategoryIcon className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 rounded-full bg-white/95 p-1 shadow-soft backdrop-blur"
        onPointerDown={(event) => event.stopPropagation()}
        onWheel={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <button
          className={cn(
            "h-9 rounded-full px-4 text-sm font-bold transition",
            viewMode === "featured" ? "bg-brand-700 text-white" : "text-gray-600 hover:bg-gray-100",
          )}
          onClick={() => setViewMode("featured")}
          type="button"
        >
          주요 장소
        </button>
        <button
          className={cn(
            "h-9 rounded-full px-4 text-sm font-bold transition",
            viewMode === "all" ? "bg-brand-700 text-white" : "text-gray-600 hover:bg-gray-100",
          )}
          onClick={() => setViewMode("all")}
          type="button"
        >
          전체
        </button>
      </div>

      <div
        className="absolute bottom-3 left-3 z-20 flex flex-col gap-1.5 sm:bottom-6"
        onPointerDown={(event) => event.stopPropagation()}
        onWheel={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <button
          aria-expanded={isControlMenuOpen}
          className="inline-flex min-h-8 w-fit items-center gap-1.5 rounded-full bg-white/90 px-2.5 text-xs font-bold text-brand-900 shadow-soft backdrop-blur hover:bg-white"
          onClick={() => setIsControlMenuOpen((isOpen) => !isOpen)}
          type="button"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          옵션
        </button>

        {isControlMenuOpen ? (
          <div className="grid w-26 grid-cols-[1rem_minmax(0,1fr)_1rem] items-center gap-x-1.5 gap-y-1 rounded-md bg-white/85 px-1.5 py-1 text-[11px] font-bold shadow-soft backdrop-blur">
            {canMoveToScheduleLocation ? (
              <button
                className="col-span-3 grid min-h-7 grid-cols-subgrid items-center rounded bg-brand-700 px-1 text-white hover:bg-brand-800"
                onClick={handleMoveToCurrentLocation}
                type="button"
              >
                <MapPin className="h-3 w-3 justify-self-center" />
                <span className="truncate text-left">현재 장소</span>
                <ArrowRight className="h-3 w-3 justify-self-center" />
              </button>
            ) : null}
            <label className="col-span-3 grid min-h-7 grid-cols-subgrid items-center rounded bg-white/70 px-1 text-gray-700 ring-1 ring-gray-200">
              <Cigarette className="h-3 w-3 justify-self-center" />
              <span className="truncate text-left">흡연구역</span>
              <input
                checked={showSmokingAreas}
                className="h-3.5 w-3.5 justify-self-center accent-gray-900"
                onChange={(event) => setShowSmokingAreas(event.target.checked)}
                type="checkbox"
              />
            </label>
          </div>
        ) : null}
      </div>

      {noticeMessage ? (
        <div
          className="absolute bottom-3 left-3 right-3 z-20 rounded-lg bg-gray-950/90 px-3 py-2 text-center text-xs font-bold leading-5 text-white shadow-soft backdrop-blur"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <span>{noticeMessage}</span>
          {showPreGuideAction && onPreGuideClick ? (
            <button
              className="ml-2 rounded-full bg-white px-2 py-1 text-xs font-bold text-gray-950"
              onClick={onPreGuideClick}
              type="button"
            >
              사전안내 보러가기
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        className="absolute right-3 top-3 z-20 flex flex-col gap-2"
        onPointerDown={(event) => event.stopPropagation()}
        onWheel={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <button
          aria-label="확대"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-brand-900 shadow-soft backdrop-blur hover:bg-brand-50"
          onClick={() => updateScale(0.25)}
          type="button"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          aria-label="축소"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-brand-900 shadow-soft backdrop-blur hover:bg-brand-50"
          onClick={() => updateScale(-0.25)}
          type="button"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          aria-label="지도 위치 초기화"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-brand-900 shadow-soft backdrop-blur hover:bg-brand-50"
          onClick={resetTransform}
          type="button"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

    </div>
  );
};
