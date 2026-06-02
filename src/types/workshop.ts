export type WorkshopGuideId = string;

export type BottomTabId = "map" | "schedule" | "events" | "recommendations";

export type ScheduleCategory =
  | "orientation"
  | "session"
  | "break"
  | "meal"
  | "activity"
  | "notice";

export type EventStatus = "active" | "waiting" | "closed";
export type SurveyQuestionType = "description" | "singleChoice" | "multipleChoice" | "shortText";

export interface ParticipantProfile {
  name: string;
  createdAt: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  location: string;
  locationId?: string;
  category: ScheduleCategory;
}

export interface ScheduleControlConfig {
  mode: "auto" | "manual";
  manualCurrentScheduleId?: string;
}

export interface MapLocation {
  id: string;
  name: string;
  xPercent: number;
  yPercent: number;
  isWorkshopLocation: boolean;
  isSmokingArea: boolean;
}

export interface MapConfig {
  title: string;
  imageUrl?: string;
  locations: MapLocation[];
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  status: EventStatus;
  opensAt: string;
  closesAt: string;
  survey: SurveyQuestion[];
  resultSummary?: string;
  groupAssignments?: Array<{
    groupName: string;
    members: string[];
  }>;
}

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  label: string;
  description?: string;
  required?: boolean;
  options?: string[];
}

export interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  category: string;
  locationLabel: string;
  imageUrl: string;
  isVisible: boolean;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  isImportant: boolean;
  showOnHomeBanner: boolean;
  createdAt: string;
}

export interface EventSurveyResponse {
  id: string;
  guideId: WorkshopGuideId;
  eventId: string;
  participantName: string;
  submittedAt: string;
  answers: Record<string, string | string[]>;
}

export interface WorkshopGuide {
  id: WorkshopGuideId;
  round: number;
  year: number;
  title: string;
  subtitle: string;
  periodLabel: string;
  locationLabel: string;
  isDefault: boolean;
  isPublished: boolean;
  scheduleControl: ScheduleControlConfig;
  schedule: ScheduleItem[];
  map: MapConfig;
  events: EventItem[];
  recommendations: RecommendationItem[];
  announcements: AnnouncementItem[];
}
