import {
  Bed,
  Circle,
  Flag,
  Info,
  Presentation,
  Trophy,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { MapLocation, MapLocationCategory } from "../types/workshop";

export const mapLocationCategoryLabels: Record<MapLocationCategory, string> = {
  meal: "식사",
  lodging: "숙소/객실",
  program: "프로그램/회의",
  activity: "활동/이벤트",
  gathering: "이동/집결",
  other: "기타",
};

export const mapLocationCategoryIcons: Record<MapLocationCategory, LucideIcon> = {
  meal: Utensils,
  lodging: Bed,
  program: Presentation,
  activity: Trophy,
  gathering: Flag,
  other: Info,
};

export const getMapLocationCategoryIcon = (
  category: MapLocationCategory | undefined,
): LucideIcon => mapLocationCategoryIcons[category ?? "other"] ?? Circle;

export const inferMapLocationCategory = (
  location: Pick<MapLocation, "id" | "name" | "isSmokingArea">,
): MapLocationCategory => {
  const value = `${location.id} ${location.name}`.toLowerCase();

  if (/(카페|식당|담하|bbq|느티나무|cafeteria|restaurant|dining)/i.test(value)) {
    return "meal";
  }

  if (/(객실|숙소|room|condo|동\b)/i.test(value)) {
    return "lodging";
  }

  if (/(홀|회의|세미나|컨퍼런스|라운지|event-desk|main-hall|seminar)/i.test(value)) {
    return "program";
  }

  if (/(볼링|수영|스파|테니스|스키|루지|곤돌라|pool|spa|tennis|ski|bowling)/i.test(value)) {
    return "activity";
  }

  if (/(로비|집결|주차|입구|parking|lobby|gate)/i.test(value)) {
    return "gathering";
  }

  return location.isSmokingArea ? "other" : "other";
};
