import { getDefaultGuide as getMockDefaultGuide, mockAdminConfig, mockWorkshopGuides } from "../data/mockData";
import { readFromStorage, storageKeys, writeToStorage } from "../lib/storage";
import type {
  AnnouncementItem,
  EventItem,
  EventStatus,
  EventTeam,
  EventSurveyResponse,
  ParticipantProfile,
  RecommendationItem,
  SurveyQuestion,
  WorkshopGuide,
} from "../types/workshop";

export interface WorkshopRepository {
  listGuides: () => WorkshopGuide[];
  saveGuides: (guides: WorkshopGuide[]) => void;
  getDefaultGuide: () => WorkshopGuide;
  getParticipantProfile: () => ParticipantProfile | undefined;
  saveParticipantProfile: (profile: ParticipantProfile) => void;
  listParticipants: () => ParticipantProfile[];
  getSelectedGuideId: (fallbackGuideId: string) => string;
  saveSelectedGuideId: (guideId: string) => void;
  isAdminUnlocked: () => boolean;
  setAdminUnlocked: (isUnlocked: boolean) => void;
  verifyAdminPassword: (password: string) => boolean;
  setAdminPassword: (password: string) => void;
  listEventResponses: () => EventSurveyResponse[];
  saveEventResponses: (responses: EventSurveyResponse[]) => void;
  saveEventResponse: (response: EventSurveyResponse) => void;
  getEventOverrides: () => Record<string, EventItem[]>;
  saveEventOverrides: (eventOverrides: Record<string, EventItem[]>) => void;
}

const createId = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}`;
};

const validEventStatuses: EventStatus[] = ["waiting", "active", "closed"];

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

  return {
    id: eventId,
    workshopId: event.workshopId || workshopId,
    title: event.title || "이벤트",
    description: event.description || "",
    status: validEventStatuses.includes(event.status) ? event.status : "waiting",
    opensAt: event.opensAt || new Date().toISOString(),
    closesAt: event.closesAt || new Date().toISOString(),
    requiresTeamAssignment: event.requiresTeamAssignment ?? teams.length > 0,
    survey: normalizeSurvey(event.survey),
    resultSummary: event.resultSummary,
    teams: teams.map((team, teamIndex) => normalizeTeam(team, eventId, teamIndex)),
  };
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

const normalizeGuide = (guide: WorkshopGuide, index: number): WorkshopGuide => ({
  id: guide.id || createId("guide"),
  round: guide.round || index + 1,
  year: guide.year || new Date().getFullYear(),
  title: guide.title || `${guide.year || new Date().getFullYear()} 워크숍 가이드`,
  subtitle: guide.subtitle || "",
  periodLabel: guide.periodLabel || "",
  locationLabel: guide.locationLabel || "",
  isDefault: guide.isDefault ?? index === 0,
  isPublished: guide.isPublished ?? true,
  scheduleControl: guide.scheduleControl ?? {
    mode: "auto",
    manualCurrentScheduleId: undefined,
  },
  schedule: Array.isArray(guide.schedule) ? guide.schedule : [],
  map: {
    title: guide.map?.title || "워크숍 안내 지도",
    imageUrl: guide.map?.imageUrl || "/assets/konjiam-map-base.png",
    locations: Array.isArray(guide.map?.locations) ? guide.map.locations : [],
  },
  events: Array.isArray(guide.events)
    ? guide.events.map((event, eventIndex) => normalizeEvent(event, eventIndex, guide.id))
    : [],
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
});

const normalizeGuides = (guides: WorkshopGuide[]) => {
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

const listStoredGuides = () => {
  const storedGuides = readFromStorage<WorkshopGuide[] | undefined>(
    storageKeys.guideOverrides,
    undefined,
  );

  return normalizeGuides(storedGuides?.length ? storedGuides : mockWorkshopGuides);
};

export const mockWorkshopRepository: WorkshopRepository = {
  listGuides: () => listStoredGuides(),
  saveGuides: (guides) => {
    writeToStorage(storageKeys.guideOverrides, normalizeGuides(guides));
  },
  getDefaultGuide: () =>
    listStoredGuides().find((guide) => guide.isDefault) ?? getMockDefaultGuide(),
  getParticipantProfile: () =>
    readFromStorage<ParticipantProfile | undefined>(storageKeys.participantProfile, undefined),
  saveParticipantProfile: (profile) => {
    writeToStorage(storageKeys.participantProfile, profile);

    const participants = readFromStorage<ParticipantProfile[]>(storageKeys.participants, []);
    const nextParticipants = participants.filter((participant) => participant.name !== profile.name);
    writeToStorage(storageKeys.participants, [...nextParticipants, profile]);
  },
  listParticipants: () => readFromStorage<ParticipantProfile[]>(storageKeys.participants, []),
  getSelectedGuideId: (fallbackGuideId) =>
    readFromStorage(storageKeys.selectedGuideId, fallbackGuideId),
  saveSelectedGuideId: (guideId) => {
    writeToStorage(storageKeys.selectedGuideId, guideId);
  },
  isAdminUnlocked: () => readFromStorage(storageKeys.adminUnlocked, false),
  setAdminUnlocked: (isUnlocked) => {
    writeToStorage(storageKeys.adminUnlocked, isUnlocked);
  },
  verifyAdminPassword: (password) =>
    password === readFromStorage(storageKeys.adminPassword, mockAdminConfig.password),
  setAdminPassword: (password) => {
    writeToStorage(storageKeys.adminPassword, password);
  },
  listEventResponses: () =>
    readFromStorage<EventSurveyResponse[]>(storageKeys.eventResponses, []),
  saveEventResponses: (responses) => {
    writeToStorage(storageKeys.eventResponses, responses);
  },
  saveEventResponse: (response) => {
    const responses = readFromStorage<EventSurveyResponse[]>(storageKeys.eventResponses, []);
    const nextResponses = responses.filter(
      (savedResponse) =>
        !(
          savedResponse.guideId === response.guideId &&
          savedResponse.eventId === response.eventId &&
          savedResponse.participantName === response.participantName
        ),
    );

    writeToStorage(storageKeys.eventResponses, [...nextResponses, response]);
  },
  getEventOverrides: () =>
    readFromStorage<Record<string, EventItem[]>>(storageKeys.eventOverrides, {}),
  saveEventOverrides: (eventOverrides) => {
    writeToStorage(storageKeys.eventOverrides, eventOverrides);
  },
};
