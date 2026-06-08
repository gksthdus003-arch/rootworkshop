import {
  Building2,
  ChevronDown,
  ChevronUp,
  Cigarette,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
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
import type { MapLocation } from "../../types/workshop";

type ViewMode = "current" | "all";

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
  focusLocationId?: string;
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

const getFocusedTransform = (location: MapLocation | undefined, mapSize: number) => {
  if (!location || mapSize <= 0) {
    return INITIAL_TRANSFORM;
  }

  const scale = 2.15;

  return {
    scale,
    x: -((location.xPercent - 50) / 100) * mapSize * scale,
    y: -((location.yPercent - 50) / 100) * mapSize * scale,
  };
};

export const InteractiveMap = ({
  title,
  imageUrl,
  fallbackImageUrl,
  locations,
  focusLocationId,
}: InteractiveMapProps) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pointersRef = useRef(new Map<number, PointerPoint>());
  const gestureRef = useRef<GestureState | null>(null);
  const transformRef = useRef<TransformState>(INITIAL_TRANSFORM);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [viewMode, setViewMode] = useState<ViewMode>("current");
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [showSmokingAreas, setShowSmokingAreas] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [transform, setTransform] = useState<TransformState>(INITIAL_TRANSFORM);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl ?? fallbackImageUrl);
  const [hasImageError, setHasImageError] = useState(false);

  const fallbackMapSize =
    typeof window === "undefined" ? 360 : Math.min(window.innerWidth, window.innerHeight);
  const mapSize = Math.max(
    320,
    Math.min(viewportSize.width || fallbackMapSize, viewportSize.height || fallbackMapSize),
  );
  const focusLocation = locations.find((location) => location.id === focusLocationId);

  const visibleLocations = useMemo(
    () =>
      locations.filter((location) => {
        if (location.isSmokingArea) {
          return showSmokingAreas;
        }

        if (showAllLocations) {
          return true;
        }

        return location.isWorkshopLocation;
      }),
    [locations, showAllLocations, showSmokingAreas],
  );

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
    if (viewMode === "current") {
      setTransform(getFocusedTransform(focusLocation, mapSize));
      return;
    }

    setTransform(INITIAL_TRANSFORM);
  }, [focusLocation?.id, mapSize, viewMode]);

  const resetTransform = () => {
    setTransform(viewMode === "current" ? getFocusedTransform(focusLocation, mapSize) : INITIAL_TRANSFORM);
  };

  const updateScale = (scaleDelta: number) => {
    setTransform((previous) => ({
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

      setTransform({
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

    setTransform({
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

  const inverseScale = 1 / transform.scale;

  return (
    <div
      aria-label={title}
      className="relative h-full w-full overflow-hidden bg-[#dce8c8]"
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
        className="absolute left-1/2 top-1/2 origin-center select-none"
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
            className="h-full w-full object-contain"
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

        {focusLocation ? (
          <div
            aria-hidden
            className="absolute h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-700 bg-brand-500/15 shadow-[0_0_0_10px_rgba(34,197,94,0.16)]"
            style={{
              left: `${focusLocation.xPercent}%`,
              top: `${focusLocation.yPercent}%`,
            }}
          />
        ) : null}

        {visibleLocations.map((location) => {
          const isFocused = location.id === focusLocation?.id;

          return (
            <div
              className="absolute"
              key={location.id}
              style={{
                left: `${location.xPercent}%`,
                top: `${location.yPercent}%`,
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
                    "max-w-36 truncate rounded-full px-2.5 py-1 text-[11px] font-bold shadow-soft",
                    isFocused
                      ? "bg-yellow-300 text-gray-950"
                      : location.isSmokingArea
                        ? "bg-gray-900 text-white"
                        : "bg-white text-brand-900",
                  )}
                >
                  {location.name}
                </span>
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-soft",
                    isFocused
                      ? "border-yellow-300 bg-brand-700 text-white"
                      : location.isSmokingArea
                        ? "border-white bg-gray-900 text-white"
                        : "border-white bg-brand-700 text-white",
                  )}
                >
                  {location.isSmokingArea ? (
                    <Cigarette className="h-4 w-4" />
                  ) : location.isWorkshopLocation ? (
                    <Building2 className="h-4 w-4" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
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
            viewMode === "current" ? "bg-brand-700 text-white" : "text-gray-600 hover:bg-gray-100",
          )}
          onClick={() => setViewMode("current")}
          type="button"
        >
          현재 장소
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
        className="absolute right-3 top-3 z-20 flex flex-col gap-2"
        onPointerDown={(event) => event.stopPropagation()}
        onWheel={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <button
          aria-label="확대"
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/95 text-brand-900 shadow-soft backdrop-blur hover:bg-brand-50"
          onClick={() => updateScale(0.25)}
          type="button"
        >
          <Plus className="h-5 w-5" />
        </button>
        <button
          aria-label="축소"
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/95 text-brand-900 shadow-soft backdrop-blur hover:bg-brand-50"
          onClick={() => updateScale(-0.25)}
          type="button"
        >
          <Minus className="h-5 w-5" />
        </button>
        <button
          aria-label="지도 위치 초기화"
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/95 text-brand-900 shadow-soft backdrop-blur hover:bg-brand-50"
          onClick={resetTransform}
          type="button"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>

      <div
        className="absolute bottom-4 left-4 z-20 w-[min(14rem,calc(100%-2rem))]"
        onPointerDown={(event) => event.stopPropagation()}
        onWheel={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {isOptionsOpen ? (
          <div className="mb-2 rounded-lg bg-white/95 p-3 shadow-soft backdrop-blur">
            <label className="flex min-h-8 items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                checked={showAllLocations}
                className="h-4 w-4 accent-brand-700"
                onChange={(event) => setShowAllLocations(event.target.checked)}
                type="checkbox"
              />
              모든 장소
            </label>
            <label className="flex min-h-8 items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                checked={showSmokingAreas}
                className="h-4 w-4 accent-brand-700"
                onChange={(event) => setShowSmokingAreas(event.target.checked)}
                type="checkbox"
              />
              흡연구역
            </label>
          </div>
        ) : null}

        <button
          aria-expanded={isOptionsOpen}
          className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg bg-white/95 px-3 py-2 text-sm font-bold text-brand-900 shadow-soft backdrop-blur hover:bg-brand-50"
          onClick={() => setIsOptionsOpen((isOpen) => !isOpen)}
          type="button"
        >
          <span className="flex items-center gap-1.5">
            <LocateFixed className="h-4 w-4" />
            지도 옵션
          </span>
          {isOptionsOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
};
