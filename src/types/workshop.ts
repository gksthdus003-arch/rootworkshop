export type WorkshopGuideId = string;

export type BottomTabId = "map" | "schedule" | "events" | "recommendations";
export type WorkshopStatus = "pre" | "live" | "closed";

export type ScheduleCategory =
  | "orientation"
  | "session"
  | "break"
  | "meal"
  | "activity"
  | "event"
  | "free"
  | "notice";

export type EventStatus = "active" | "waiting" | "closed";
export type SurveyQuestionType = "description" | "singleChoice" | "multipleChoice" | "shortText";
export type MapLocationCategory =
  | "meal"
  | "lodging"
  | "program"
  | "activity"
  | "gathering"
  | "other";

export interface ParticipantProfile {
  name: string;
  createdAt: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  description: string;
  displayTime?: string;
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
  category: MapLocationCategory;
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
  workshopId?: WorkshopGuideId;
  title: string;
  description: string;
  status: EventStatus;
  opensAt: string;
  closesAt: string;
  requiresTeamAssignment: boolean;
  survey: SurveyQuestion[];
  resultSummary?: string;
  teams: EventTeam[];
  /** @deprecated Legacy localStorage shape. Normalized into teams at load time. */
  groupAssignments?: Array<{
    groupName: string;
    members: string[];
  }>;
}

export interface EventTeam {
  id: string;
  eventId: string;
  name: string;
  members: string[];
  memo?: string;
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
  assignedTeamId?: string;
  answers: Record<string, string | string[]>;
}

export interface PosterConfig {
  enabled: boolean;
  imageUrl: string;
  version: string;
  durationMs: number;
  showOnPreFirstVisit: boolean;
  showOnDay1FirstVisit: boolean;
}

export interface WorkshopGuide {
  id: WorkshopGuideId;
  round: number;
  year: number;
  title: string;
  subtitle: string;
  periodLabel: string;
  startDate: string;
  status: WorkshopStatus;
  locationLabel: string;
  preparationItems: string[];
  venueAddress: string;
  transportationGuide: string;
  mapLinkUrl?: string;
  poster: PosterConfig;
  isDefault: boolean;
  isPublished: boolean;
  scheduleControl: ScheduleControlConfig;
  schedule: ScheduleItem[];
  map: MapConfig;
  events: EventItem[];
  recommendations: RecommendationItem[];
  announcements: AnnouncementItem[];
}
