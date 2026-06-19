// All workshop data normalization/inference logic lives here on the server.
// Ported verbatim from the former src/services/workshopRepository.ts so that the
// frontend no longer performs any data shaping.
import { randomUUID } from "node:crypto";
import {
  getDefaultGuide as getMockDefaultGuide,
  mockWorkshopGuides,
} from "../src/data/mockData";
import type {
  AnnouncementItem,
  EventItem,
  EventKind,
  EventPhase,
  EventStatus,
  EventType,
  EventTeam,
  EventSurveyResponse,
  MapLocation,
  MapLocationCategory,
  PosterConfig,
  RecommendationItem,
  SurveyKind,
  SurveyQuestion,
  WorkshopGuide,
  WorkshopStatus,
} from "../src/types/workshop";

const createId = (prefix: string) => {
  try {
    return randomUUID();
  } catch {
    return `${prefix}-${Date.now()}`;
  }
};

// Pure copy of inferMapLocationCategory (kept here to avoid pulling React deps
// from src/lib/mapLocationCategories into the server).
const inferMapLocationCategory = (
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
  return "other";
};

const validEventStatuses: EventStatus[] = ["waiting", "active", "closed"];
const validSurveyKinds: SurveyKind[] = ["general", "activity", "transport", "bowlingLevel"];
const validEventKinds: EventKind[] = ["general", "bowling", "preGuide"];
const validEventPhases: EventPhase[] = ["preSurvey", "scoreInput", "result"];
const validWorkshopStatuses: WorkshopStatus[] = ["pre", "live", "closed"];

const inferEventType = (event: EventItem): EventType => {
  const rawType = (event as { type?: unknown }).type;
  const legacyType = typeof rawType === "string" ? rawType : undefined;
  const searchableText = `${event.id} ${event.title}`.toLowerCase();

  if (legacyType === "survey" || legacyType === "event") {
    return legacyType;
  }

  if (legacyType === "activity") {
    return "survey";
  }

  if (legacyType === "bowling") {
    return searchableText.includes("level") || searchableText.includes("레벨 테스트")
      ? "survey"
      : "event";
  }

  if (searchableText.includes("대회") || searchableText.includes("game-board")) {
    return "event";
  }

  return "survey";
};

const inferSurveyKind = (event: EventItem, type: EventType): SurveyKind | undefined => {
  if (event.surveyKind && validSurveyKinds.includes(event.surveyKind)) {
    return event.surveyKind;
  }

  if (type !== "survey") {
    return undefined;
  }

  const rawType = (event as { type?: unknown }).type;
  const legacyType = typeof rawType === "string" ? rawType : undefined;
  const searchableText = `${event.id} ${event.title}`.toLowerCase();

  if (
    legacyType === "transport" ||
    searchableText.includes("transport") ||
    searchableText.includes("차량") ||
    searchableText.includes("이동 조")
  ) {
    return "transport";
  }

  if (legacyType === "activity" || searchableText.includes("activity") || searchableText.includes("액티비티")) {
    return "activity";
  }

  if (legacyType === "bowling" || searchableText.includes("bowling-level") || searchableText.includes("레벨 테스트")) {
    return "bowlingLevel";
  }

  return "general";
};

const inferEventKind = (event: EventItem, type: EventType): EventKind | undefined => {
  if (event.eventKind && validEventKinds.includes(event.eventKind)) {
    return event.eventKind;
  }

  if (type !== "event") {
    return undefined;
  }

  const rawType = (event as { type?: unknown }).type;
  const legacyType = typeof rawType === "string" ? rawType : undefined;
  const searchableText = `${event.id} ${event.title}`.toLowerCase();

  if (legacyType === "bowling" || searchableText.includes("bowling") || searchableText.includes("볼링")) {
    return "bowling";
  }

  if (searchableText.includes("pre-guide") || searchableText.includes("사전")) {
    return "preGuide";
  }

  return "general";
};

const inferEventPhase = (event: EventItem, type: EventType): EventPhase | undefined => {
  if (event.phase && validEventPhases.includes(event.phase)) {
    return event.phase;
  }

  if (type !== "event" || inferEventKind(event, type) !== "bowling") {
    return undefined;
  }

  if (event.status === "closed") {
    return "result";
  }

  return "preSurvey";
};

const normalizePoster = (
  poster: PosterConfig | undefined,
  fallbackPoster?: PosterConfig,
): PosterConfig => ({
  enabled: poster?.enabled ?? fallbackPoster?.enabled ?? false,
  imageUrl: poster?.imageUrl ?? fallbackPoster?.imageUrl ?? "",
  version: poster?.version || fallbackPoster?.version || "poster-v1",
  durationMs: Number.isFinite(poster?.durationMs)
    ? Math.max(Number(poster?.durationMs), 500)
    : fallbackPoster?.durationMs ?? 2000,
  showOnPreFirstVisit:
    poster?.showOnPreFirstVisit ?? fallbackPoster?.showOnPreFirstVisit ?? true,
  showOnDay1FirstVisit:
    poster?.showOnDay1FirstVisit ?? fallbackPoster?.showOnDay1FirstVisit ?? true,
});

const normalizeSurvey = (survey: SurveyQuestion[] | undefined): SurveyQuestion[] =>
  Array.isArray(survey)
    ? survey.map((question, index) => ({
        id: question.id || `question-${index + 1}`,
        type: question.type || "shortText",
        label: question.label || "문항",
        description: question.description,
        required: question.required ?? false,
        options: question.options ?? [],
      }))
    : [];

const normalizeTeam = (team: EventTeam, eventId: string, index: number): EventTeam => ({
  id: team.id || `${eventId}-team-${index + 1}`,
  eventId: team.eventId || eventId,
  name: team.name || `조 ${index + 1}`,
  members: Array.isArray(team.members) ? team.members : [],
  memo: team.memo ?? "",
});

const normalizeLegacyTeams = (event: EventItem) =>
  Array.isArray(event.groupAssignments)
    ? event.groupAssignments.map((groupAssignment, index) => ({
        id: `${event.id || "event"}-legacy-team-${index + 1}`,
        eventId: event.id || "",
        name: groupAssignment.groupName,
        members: groupAssignment.members,
        memo: "",
      }))
    : [];

const normalizeEvent = (event: EventItem, index: number, workshopId: string): EventItem => {
  const eventId = event.id || `event-${index + 1}`;
  const teams = Array.isArray(event.teams) && event.teams.length > 0
    ? event.teams
    : normalizeLegacyTeams(event);
  const type = inferEventType(event);
  const surveyKind = inferSurveyKind(event, type);
  const eventKind = inferEventKind(event, type);

  return {
    id: eventId,
    workshopId: event.workshopId || workshopId,
    title: event.title || "이벤트",
    description: event.description || "",
    type,
    surveyKind,
    eventKind,
    showInEventList: event.showInEventList ?? (surveyKind === "bowlingLevel" ? false : true),
    linkedSurveyId: event.linkedSurveyId,
    phase: inferEventPhase(event, type),
    pageBackgroundImage: event.pageBackgroundImage,
    themeImage: event.themeImage,
    pageLayoutType: event.pageLayoutType,
    status: validEventStatuses.includes(event.status) ? event.status : "waiting",
    opensAt: event.opensAt || new Date().toISOString(),
    closesAt: event.closesAt || new Date().toISOString(),
    requiresTeamAssignment: event.requiresTeamAssignment ?? teams.length > 0,
    survey: normalizeSurvey(event.survey),
    resultSummary: event.resultSummary,
    teams: teams.map((team, teamIndex) => normalizeTeam(team, eventId, teamIndex)),
  };
};

const isTransportTeamEvent = (event: EventItem) =>
  event.id === "transport-team" ||
  (event.type === "survey" &&
    event.surveyKind === "transport" &&
    (event.title.includes("차량") || event.title.includes("이동")));

const ensureDefault2026Events = (events: EventItem[], mockDefaultGuide?: WorkshopGuide) => {
  const hasBowlingEvent = events.some(
    (event) =>
      event.id === "bowling-competition" ||
      (event.type === "event" &&
        (event.eventKind === "bowling" ||
          event.title.includes("볼링대회") ||
          event.title.includes("볼링 대회"))),
  );

  const mockBowlingEvent = mockDefaultGuide?.events.find(
    (event) => event.id === "bowling-competition",
  );

  const withBowlingEvent = !hasBowlingEvent && mockBowlingEvent && mockDefaultGuide
    ? [...events, normalizeEvent(mockBowlingEvent, events.length, mockDefaultGuide.id)]
    : events;

  const hasTransportTeamEvent = withBowlingEvent.some(isTransportTeamEvent);
  const mockTransportTeamEvent = mockDefaultGuide?.events.find(
    (event) => event.id === "transport-team",
  );

  return !hasTransportTeamEvent && mockTransportTeamEvent && mockDefaultGuide
    ? [
        ...withBowlingEvent,
        normalizeEvent(mockTransportTeamEvent, withBowlingEvent.length, mockDefaultGuide.id),
      ]
    : withBowlingEvent;
};

const normalizeRecommendation = (
  recommendation: RecommendationItem,
  index: number,
): RecommendationItem => ({
  id: recommendation.id || `recommendation-${index + 1}`,
  title: recommendation.title || "추천 코스",
  description: recommendation.description || "",
  category: recommendation.category || "추천",
  locationLabel: recommendation.locationLabel || "위치 미정",
  imageUrl: recommendation.imageUrl || "/assets/recommendation-eco-stream.png",
  isVisible: recommendation.isVisible ?? true,
});

const normalizeAnnouncement = (
  announcement: AnnouncementItem,
  index: number,
): AnnouncementItem => ({
  id: announcement.id || `announcement-${index + 1}`,
  title: announcement.title || "공지",
  body: announcement.body || "",
  isImportant: announcement.isImportant ?? false,
  showOnHomeBanner: announcement.showOnHomeBanner ?? false,
  createdAt: announcement.createdAt || new Date().toISOString(),
});

const normalizeMapLocation = (location: MapLocation, index: number): MapLocation => {
  const normalizedLocation = {
    id: location.id || `location-${index + 1}`,
    name: location.name || "장소",
    description: location.description ?? "",
    category: location.category,
    xPercent: Number.isFinite(location.xPercent) ? location.xPercent : 50,
    yPercent: Number.isFinite(location.yPercent) ? location.yPercent : 50,
    isWorkshopLocation: location.isWorkshopLocation ?? false,
    isSmokingArea: location.isSmokingArea ?? false,
  };

  return {
    ...normalizedLocation,
    category:
      normalizedLocation.category ??
      inferMapLocationCategory({
        id: normalizedLocation.id,
        name: normalizedLocation.name,
        isSmokingArea: normalizedLocation.isSmokingArea,
      }),
  };
};

const normalizeGuide = (guide: WorkshopGuide, index: number): WorkshopGuide => {
  const mockDefaultGuide = guide.id === "workshop-2026" ? getMockDefaultGuide() : undefined;
  const fallbackStartDate = guide.schedule?.[0]?.startAt ?? new Date().toISOString();

  return {
    id: guide.id || createId("guide"),
    round: guide.round || index + 1,
    year: guide.year || new Date().getFullYear(),
    title: guide.title || `${guide.year || new Date().getFullYear()} 워크숍 가이드`,
    subtitle: guide.subtitle || "",
    periodLabel: guide.periodLabel || "",
    startDate: guide.startDate || mockDefaultGuide?.startDate || fallbackStartDate,
    status: validWorkshopStatuses.includes(guide.status)
      ? guide.status
      : mockDefaultGuide?.status ?? "live",
    locationLabel: guide.locationLabel || "",
    preparationItems: Array.isArray(guide.preparationItems)
      ? guide.preparationItems
      : mockDefaultGuide?.preparationItems ?? [],
    venueAddress: guide.venueAddress || mockDefaultGuide?.venueAddress || "",
    transportationGuide:
      guide.transportationGuide || mockDefaultGuide?.transportationGuide || "",
    mapLinkUrl: guide.mapLinkUrl || mockDefaultGuide?.mapLinkUrl,
    poster: normalizePoster(guide.poster, mockDefaultGuide?.poster),
    isDefault: guide.isDefault ?? index === 0,
    isPublished: guide.isPublished ?? true,
    scheduleControl:
      guide.scheduleControl ??
      mockDefaultGuide?.scheduleControl ?? {
        mode: "auto",
        manualCurrentScheduleId: undefined,
      },
    schedule: Array.isArray(guide.schedule)
      ? guide.schedule
      : mockDefaultGuide?.schedule ?? [],
    map: {
      title: guide.map?.title || "워크숍 안내 지도",
      imageUrl: guide.map?.imageUrl || "/assets/konjiam-map-base.png",
      locations: Array.isArray(guide.map?.locations)
        ? guide.map.locations.map((location, locationIndex) =>
            normalizeMapLocation(location, locationIndex),
          )
        : [],
    },
    events: ensureDefault2026Events(
      Array.isArray(guide.events)
        ? guide.events.map((event, eventIndex) => normalizeEvent(event, eventIndex, guide.id))
        : [],
      mockDefaultGuide,
    ),
    recommendations: Array.isArray(guide.recommendations)
      ? guide.recommendations.map((recommendation, recommendationIndex) =>
          normalizeRecommendation(recommendation, recommendationIndex),
        )
      : [],
    announcements: Array.isArray(guide.announcements)
      ? guide.announcements.map((announcement, announcementIndex) =>
          normalizeAnnouncement(announcement, announcementIndex),
        )
      : [],
  };
};

export const normalizeGuides = (guides: WorkshopGuide[]): WorkshopGuide[] => {
  const normalizedGuides = guides.map((guide, index) => normalizeGuide(guide, index));

  if (!normalizedGuides.length) {
    return mockWorkshopGuides.map((guide, index) => normalizeGuide(guide, index));
  }

  const defaultIndex = normalizedGuides.findIndex((guide) => guide.isDefault);

  return normalizedGuides.map((guide, index) => ({
    ...guide,
    isDefault: defaultIndex === -1 ? index === 0 : index === defaultIndex,
  }));
};

// Normalizes a single event survey response (mirrors the prior repository shape).
export const normalizeEventResponse = (
  response: EventSurveyResponse,
): EventSurveyResponse => ({
  id: response.id || createId("response"),
  guideId: response.guideId,
  eventId: response.eventId,
  participantId: response.participantId,
  participantName: response.participantName,
  submittedAt: response.submittedAt || new Date().toISOString(),
  assignedTeamId: response.assignedTeamId,
  answers: response.answers ?? {},
});
