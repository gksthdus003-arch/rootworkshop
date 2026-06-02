import { CalendarDays, Map, PartyPopper, Sparkles } from "lucide-react";
import type { BottomTabId } from "../types/workshop";

export const bottomTabs: Array<{
  id: BottomTabId;
  label: string;
  icon: typeof Map;
}> = [
  { id: "map", label: "지도", icon: Map },
  { id: "schedule", label: "일정", icon: CalendarDays },
  { id: "events", label: "이벤트", icon: PartyPopper },
  { id: "recommendations", label: "추천", icon: Sparkles },
];
