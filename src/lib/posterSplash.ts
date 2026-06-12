import { getDateKey, getTodayDateKey } from "./preGuide";
import type { PosterConfig } from "../types/workshop";

export type PosterSplashPhase = "pre" | "day1";

export const getPosterSeenKey = (version: string, phase: PosterSplashPhase) =>
  `posterSeen:${version}:${phase}`;

export const getPosterSplashPhase = (
  poster: PosterConfig,
  startDate: string,
): PosterSplashPhase | undefined => {
  if (!poster.enabled || !poster.imageUrl || !poster.version) {
    return undefined;
  }

  const startDateKey = getDateKey(startDate);
  const todayDateKey = getTodayDateKey();

  if (!startDateKey) {
    return undefined;
  }

  if (todayDateKey < startDateKey && poster.showOnPreFirstVisit) {
    return "pre";
  }

  if (todayDateKey === startDateKey && poster.showOnDay1FirstVisit) {
    return "day1";
  }

  return undefined;
};

export const hasSeenPosterSplash = (version: string, phase: PosterSplashPhase) => {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(getPosterSeenKey(version, phase)) === "true";
};

export const markPosterSplashSeen = (version: string, phase: PosterSplashPhase) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getPosterSeenKey(version, phase), "true");
};
