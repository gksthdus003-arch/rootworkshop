import { useEffect, useState } from "react";
import {
  getPosterSplashPhase,
  hasSeenPosterSplash,
  markPosterSplashSeen,
} from "../../lib/posterSplash";
import type { WorkshopGuide } from "../../types/workshop";

interface SplashScreenProps {
  guide: WorkshopGuide;
}

const getSplashDecision = (guide: WorkshopGuide) => {
  const phase = getPosterSplashPhase(guide.poster, guide.startDate);

  if (!phase || hasSeenPosterSplash(guide.poster.version, phase)) {
    return undefined;
  }

  return phase;
};

export const SplashScreen = ({ guide }: SplashScreenProps) => {
  const [splash] = useState(() => {
    const phase = getSplashDecision(guide);

    return phase
      ? {
          phase,
          poster: guide.poster,
        }
      : undefined;
  });
  const [isVisible, setIsVisible] = useState(Boolean(splash));

  useEffect(() => {
    if (!splash) {
      setIsVisible(false);
      return undefined;
    }

    setIsVisible(true);
    markPosterSplashSeen(splash.poster.version, splash.phase);

    const timeoutId = window.setTimeout(() => {
      setIsVisible(false);
    }, splash.poster.durationMs);

    return () => window.clearTimeout(timeoutId);
  }, [splash]);

  if (!isVisible || !splash) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#101010]">
      <div
        className="poster-splash-motion relative flex h-full w-full items-center justify-center"
        style={{ animationDuration: `${splash.poster.durationMs}ms` }}
      >
        <img
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-55 blur-xl"
          draggable={false}
          src={splash.poster.imageUrl}
        />
        <img
          alt=""
          className="relative max-h-full max-w-full object-contain"
          draggable={false}
          src={splash.poster.imageUrl}
        />
      </div>
    </div>
  );
};
