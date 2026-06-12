import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from "react";
import { mockWorkshopRepository } from "../services/workshopRepository";
import type {
  AnnouncementItem,
  BottomTabId,
  EventItem,
  EventSurveyResponse,
  EventTeam,
  MapLocation,
  ParticipantProfile,
  RecommendationItem,
  ScheduleControlConfig,
  ScheduleItem,
  SurveyQuestion,
  WorkshopGuide,
} from "../types/workshop";

interface WorkshopStoreValue {
  guides: WorkshopGuide[];
  defaultGuide: WorkshopGuide;
  selectedGuide: WorkshopGuide;
  selectedGuideId: string;
  participantProfile?: ParticipantProfile;
  participants: ParticipantProfile[];
  activeTab: BottomTabId;
  scheduleFocusRequestId: number;
  eventResponses: EventSurveyResponse[];
  isAdminUnlocked: boolean;
  setActiveTab: (tabId: BottomTabId) => void;
  openScheduleTab: () => void;
  selectGuide: (guideId: string) => void;
  saveParticipantName: (name: string) => void;
  createGuide: (guide: WorkshopGuide) => void;
  updateGuide: (guideId: string, updates: Partial<WorkshopGuide>) => void;
  deleteGuide: (guideId: string) => void;
  setDefaultGuide: (guideId: string) => void;
  addMapLocation: (guideId: string, location: MapLocation) => void;
  updateMapLocation: (
    guideId: string,
    locationId: string,
    updates: Partial<MapLocation>,
  ) => void;
  deleteMapLocation: (guideId: string, locationId: string) => void;
  addScheduleItem: (guideId: string, scheduleItem: ScheduleItem) => void;
  updateScheduleItem: (
    guideId: string,
    scheduleItemId: string,
    updates: Partial<ScheduleItem>,
  ) => void;
  deleteScheduleItem: (guideId: string, scheduleItemId: string) => void;
  moveScheduleItem: (guideId: string, scheduleItemId: string, direction: "up" | "down") => void;
  updateScheduleControl: (guideId: string, updates: Partial<ScheduleControlConfig>) => void;
  addEvent: (guideId: string, event: EventItem) => void;
  updateEvent: (guideId: string, eventId: string, updates: Partial<EventItem>) => void;
  deleteEvent: (guideId: string, eventId: string) => void;
  addSurveyQuestion: (guideId: string, eventId: string, question: SurveyQuestion) => void;
  updateSurveyQuestion: (
    guideId: string,
    eventId: string,
    questionId: string,
    updates: Partial<SurveyQuestion>,
  ) => void;
  deleteSurveyQuestion: (guideId: string, eventId: string, questionId: string) => void;
  moveSurveyQuestion: (
    guideId: string,
    eventId: string,
    questionId: string,
    direction: "up" | "down",
  ) => void;
  addEventTeam: (guideId: string, eventId: string, team: EventTeam) => void;
  updateEventTeam: (
    guideId: string,
    eventId: string,
    teamId: string,
    updates: Partial<EventTeam>,
  ) => void;
  deleteEventTeam: (guideId: string, eventId: string, teamId: string) => void;
  assignEventResponseTeam: (
    guideId: string,
    eventId: string,
    participantName: string,
    teamId?: string,
  ) => void;
  addRecommendation: (guideId: string, recommendation: RecommendationItem) => void;
  updateRecommendation: (
    guideId: string,
    recommendationId: string,
    updates: Partial<RecommendationItem>,
  ) => void;
  deleteRecommendation: (guideId: string, recommendationId: string) => void;
  addAnnouncement: (guideId: string, announcement: AnnouncementItem) => void;
  updateAnnouncement: (
    guideId: string,
    announcementId: string,
    updates: Partial<AnnouncementItem>,
  ) => void;
  deleteAnnouncement: (guideId: string, announcementId: string) => void;
  saveEventResponse: (response: EventSurveyResponse) => void;
  unlockAdmin: (password: string) => boolean;
  lockAdmin: () => void;
  changeAdminPassword: (password: string) => void;
}

const WorkshopStoreContext = createContext<WorkshopStoreValue | null>(null);

const getInitialActiveTab = (): BottomTabId => {
  if (typeof window === "undefined") {
    return "map";
  }

  const tab = new URLSearchParams(window.location.search).get("tab");

  if (
    tab === "map" ||
    tab === "schedule" ||
    tab === "events" ||
    tab === "recommendations"
  ) {
    return tab;
  }

  return "map";
};

export const WorkshopProvider = ({ children }: PropsWithChildren) => {
  const [guides, setGuides] = useState(() => mockWorkshopRepository.listGuides());
  const defaultGuide = useMemo(
    () => guides.find((guide) => guide.isDefault) ?? guides[0] ?? mockWorkshopRepository.getDefaultGuide(),
    [guides],
  );
  const [selectedGuideId, setSelectedGuideId] = useState(() =>
    mockWorkshopRepository.getSelectedGuideId(defaultGuide.id),
  );
  const [participantProfile, setParticipantProfile] = useState<ParticipantProfile | undefined>(() =>
    mockWorkshopRepository.getParticipantProfile(),
  );
  const [activeTab, setActiveTab] = useState<BottomTabId>(() => getInitialActiveTab());
  const [scheduleFocusRequestId, setScheduleFocusRequestId] = useState(0);
  const [participants, setParticipants] = useState(() =>
    mockWorkshopRepository.listParticipants(),
  );
  const [eventResponses, setEventResponses] = useState(() =>
    mockWorkshopRepository.listEventResponses(),
  );
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() =>
    mockWorkshopRepository.isAdminUnlocked(),
  );

  const selectedGuide = useMemo(
    () => guides.find((guide) => guide.id === selectedGuideId) ?? defaultGuide,
    [defaultGuide, guides, selectedGuideId],
  );

  const value = useMemo<WorkshopStoreValue>(() => {
    const saveGuides = (nextGuides: WorkshopGuide[]) => {
      setGuides(nextGuides);
      mockWorkshopRepository.saveGuides(nextGuides);
    };

    const updateGuideById = (
      guideId: string,
      updater: (guide: WorkshopGuide) => WorkshopGuide,
    ) => {
      saveGuides(guides.map((guide) => (guide.id === guideId ? updater(guide) : guide)));
    };

    const selectGuide = (guideId: string) => {
      setSelectedGuideId(guideId);
      mockWorkshopRepository.saveSelectedGuideId(guideId);
    };

    const saveParticipantName = (name: string) => {
      const profile = {
        name: name.trim(),
        createdAt: new Date().toISOString(),
      };

      setParticipantProfile(profile);
      mockWorkshopRepository.saveParticipantProfile(profile);
      setParticipants(mockWorkshopRepository.listParticipants());
    };

    const unlockAdmin = (password: string) => {
      const isMatched = mockWorkshopRepository.verifyAdminPassword(password);

      if (isMatched) {
        setIsAdminUnlocked(true);
        mockWorkshopRepository.setAdminUnlocked(true);
      }

      return isMatched;
    };

    const lockAdmin = () => {
      setIsAdminUnlocked(false);
      mockWorkshopRepository.setAdminUnlocked(false);
    };

    const openScheduleTab = () => {
      setActiveTab("schedule");
      setScheduleFocusRequestId((requestId) => requestId + 1);
    };

    const createGuide = (guide: WorkshopGuide) => {
      const nextGuides = guide.isDefault
        ? [...guides.map((item) => ({ ...item, isDefault: false })), guide]
        : [...guides, guide];

      saveGuides(nextGuides);
    };

    const updateGuide = (guideId: string, updates: Partial<WorkshopGuide>) => {
      saveGuides(
        guides.map((guide) => {
          if (guide.id === guideId) {
            return {
              ...guide,
              ...updates,
            };
          }

          return updates.isDefault ? { ...guide, isDefault: false } : guide;
        }),
      );
    };

    const deleteGuide = (guideId: string) => {
      if (guides.length <= 1) {
        return;
      }

      const remainingGuides = guides.filter((guide) => guide.id !== guideId);
      const hasDefaultGuide = remainingGuides.some((guide) => guide.isDefault);
      const nextGuides = hasDefaultGuide
        ? remainingGuides
        : remainingGuides.map((guide, index) => ({
            ...guide,
            isDefault: index === 0,
          }));
      const nextSelectedGuideId = nextGuides.some((guide) => guide.id === selectedGuideId)
        ? selectedGuideId
        : nextGuides.find((guide) => guide.isDefault)?.id ?? nextGuides[0].id;

      setSelectedGuideId(nextSelectedGuideId);
      mockWorkshopRepository.saveSelectedGuideId(nextSelectedGuideId);
      saveGuides(nextGuides);
    };

    const setDefaultGuide = (guideId: string) => {
      saveGuides(
        guides.map((guide) => ({
          ...guide,
          isDefault: guide.id === guideId,
        })),
      );
    };

    const addMapLocation = (guideId: string, location: MapLocation) => {
      updateGuideById(guideId, (guide) => ({
        ...guide,
        map: {
          ...guide.map,
          locations: [...guide.map.locations, location],
        },
      }));
    };

    const updateMapLocation = (
      guideId: string,
      locationId: string,
      updates: Partial<MapLocation>,
    ) => {
      updateGuideById(guideId, (guide) => ({
        ...guide,
        map: {
          ...guide.map,
          locations: guide.map.locations.map((location) =>
            location.id === locationId ? { ...location, ...updates } : location,
          ),
        },
      }));
    };

    const deleteMapLocation = (guideId: string, locationId: string) => {
      updateGuideById(guideId, (guide) => ({
        ...guide,
        map: {
          ...guide.map,
          locations: guide.map.locations.filter((location) => location.id !== locationId),
        },
      }));
    };

    const addScheduleItem = (guideId: string, scheduleItem: ScheduleItem) => {
      updateGuideById(guideId, (guide) => ({
        ...guide,
        schedule: [...guide.schedule, scheduleItem],
      }));
    };

    const updateScheduleItem = (
      guideId: string,
      scheduleItemId: string,
      updates: Partial<ScheduleItem>,
    ) => {
      updateGuideById(guideId, (guide) => ({
        ...guide,
        schedule: guide.schedule.map((scheduleItem) =>
          scheduleItem.id === scheduleItemId ? { ...scheduleItem, ...updates } : scheduleItem,
        ),
      }));
    };

    const deleteScheduleItem = (guideId: string, scheduleItemId: string) => {
      updateGuideById(guideId, (guide) => ({
        ...guide,
        schedule: guide.schedule.filter((scheduleItem) => scheduleItem.id !== scheduleItemId),
        scheduleControl:
          guide.scheduleControl.manualCurrentScheduleId === scheduleItemId
            ? { mode: "auto" }
            : guide.scheduleControl,
      }));
    };

    const moveScheduleItem = (
      guideId: string,
      scheduleItemId: string,
      direction: "up" | "down",
    ) => {
      updateGuideById(guideId, (guide) => {
        const schedule = [...guide.schedule];
        const currentIndex = schedule.findIndex((scheduleItem) => scheduleItem.id === scheduleItemId);
        const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

        if (currentIndex < 0 || nextIndex < 0 || nextIndex >= schedule.length) {
          return guide;
        }

        [schedule[currentIndex], schedule[nextIndex]] = [schedule[nextIndex], schedule[currentIndex]];

        return {
          ...guide,
          schedule,
        };
      });
    };

    const updateScheduleControl = (
      guideId: string,
      updates: Partial<ScheduleControlConfig>,
    ) => {
      updateGuideById(guideId, (guide) => ({
        ...guide,
        scheduleControl: {
          ...guide.scheduleControl,
          ...updates,
        },
      }));
    };

    const addEvent = (guideId: string, event: EventItem) => {
      updateGuideById(guideId, (guide) => ({
        ...guide,
        events: [...guide.events, event],
      }));
    };

    const updateEvent = (guideId: string, eventId: string, updates: Partial<EventItem>) => {
      updateGuideById(guideId, (guide) => ({
        ...guide,
        events: guide.events.map((event) =>
          event.id === eventId ? { ...event, ...updates } : event,
        ),
      }));
    };

    const deleteEvent = (guideId: string, eventId: string) => {
      updateGuideById(guideId, (guide) => ({
        ...guide,
        events: guide.events.filter((event) => event.id !== eventId),
      }));
    };

    const addSurveyQuestion = (guideId: string, eventId: string, question: SurveyQuestion) => {
      updateEvent(guideId, eventId, {
        survey: [
          ...(guides
            .find((guide) => guide.id === guideId)
            ?.events.find((event) => event.id === eventId)?.survey ?? []),
          question,
        ],
      });
    };

    const updateSurveyQuestion = (
      guideId: string,
      eventId: string,
      questionId: string,
      updates: Partial<SurveyQuestion>,
    ) => {
      updateGuideById(guideId, (guide) => ({
        ...guide,
        events: guide.events.map((event) =>
          event.id === eventId
            ? {
                ...event,
                survey: event.survey.map((question) =>
                  question.id === questionId ? { ...question, ...updates } : question,
                ),
              }
            : event,
        ),
      }));
    };

    const deleteSurveyQuestion = (guideId: string, eventId: string, questionId: string) => {
      updateGuideById(guideId, (guide) => ({
        ...guide,
        events: guide.events.map((event) =>
          event.id === eventId
            ? {
                ...event,
                survey: event.survey.filter((question) => question.id !== questionId),
              }
            : event,
        ),
      }));
    };

    const moveSurveyQuestion = (
      guideId: string,
      eventId: string,
      questionId: string,
      direction: "up" | "down",
    ) => {
      updateGuideById(guideId, (guide) => ({
        ...guide,
        events: guide.events.map((event) => {
          if (event.id !== eventId) {
            return event;
          }

          const survey = [...event.survey];
          const currentIndex = survey.findIndex((question) => question.id === questionId);
          const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

          if (currentIndex < 0 || nextIndex < 0 || nextIndex >= survey.length) {
            return event;
          }

          [survey[currentIndex], survey[nextIndex]] = [survey[nextIndex], survey[currentIndex]];

          return {
            ...event,
            survey,
          };
        }),
      }));
    };

    const syncEventTeamAssignments = (
      guideId: string,
      eventId: string,
      teams: EventTeam[],
    ) => {
      setEventResponses((responses) => {
        const nextResponses = responses.map((response) => {
          if (response.guideId !== guideId || response.eventId !== eventId) {
            return response;
          }

          const assignedTeam = teams.find((team) =>
            team.members.includes(response.participantName),
          );

          return {
            ...response,
            assignedTeamId: assignedTeam?.id,
          };
        });

        mockWorkshopRepository.saveEventResponses(nextResponses);
        return nextResponses;
      });
    };

    const addEventTeam = (guideId: string, eventId: string, team: EventTeam) => {
      const guide = guides.find((item) => item.id === guideId);
      const event = guide?.events.find((item) => item.id === eventId);
      const nextTeams = [...(event?.teams ?? []), team];

      updateGuideById(guideId, (guide) => ({
        ...guide,
        events: guide.events.map((event) =>
          event.id === eventId
            ? {
                ...event,
                teams: [...event.teams, team],
              }
            : event,
        ),
      }));
      syncEventTeamAssignments(guideId, eventId, nextTeams);
    };

    const updateEventTeam = (
      guideId: string,
      eventId: string,
      teamId: string,
      updates: Partial<EventTeam>,
    ) => {
      const guide = guides.find((item) => item.id === guideId);
      const event = guide?.events.find((item) => item.id === eventId);
      const nextTeams = (event?.teams ?? []).map((team) =>
        team.id === teamId ? { ...team, ...updates } : team,
      );

      updateGuideById(guideId, (guide) => ({
        ...guide,
        events: guide.events.map((event) =>
          event.id === eventId
            ? {
                ...event,
                teams: event.teams.map((team) =>
                  team.id === teamId ? { ...team, ...updates } : team,
                ),
              }
            : event,
        ),
      }));
      syncEventTeamAssignments(guideId, eventId, nextTeams);
    };

    const deleteEventTeam = (guideId: string, eventId: string, teamId: string) => {
      const guide = guides.find((item) => item.id === guideId);
      const event = guide?.events.find((item) => item.id === eventId);
      const nextTeams = (event?.teams ?? []).filter((team) => team.id !== teamId);

      updateGuideById(guideId, (guide) => ({
        ...guide,
        events: guide.events.map((event) =>
          event.id === eventId
            ? {
                ...event,
                teams: event.teams.filter((team) => team.id !== teamId),
              }
            : event,
        ),
      }));
      syncEventTeamAssignments(guideId, eventId, nextTeams);
    };

    const assignEventResponseTeam = (
      guideId: string,
      eventId: string,
      participantName: string,
      teamId?: string,
    ) => {
      updateGuideById(guideId, (guide) => ({
        ...guide,
        events: guide.events.map((event) => {
          if (event.id !== eventId) {
            return event;
          }

          return {
            ...event,
            teams: event.teams.map((team) => {
              const membersWithoutParticipant = team.members.filter(
                (member) => member !== participantName,
              );

              return {
                ...team,
                members:
                  team.id === teamId
                    ? [...membersWithoutParticipant, participantName]
                    : membersWithoutParticipant,
              };
            }),
          };
        }),
      }));

      setEventResponses((responses) => {
        const nextResponses = responses.map((response) =>
          response.guideId === guideId &&
          response.eventId === eventId &&
          response.participantName === participantName
            ? {
                ...response,
                assignedTeamId: teamId,
              }
            : response,
        );

        mockWorkshopRepository.saveEventResponses(nextResponses);
        return nextResponses;
      });
    };

    const addRecommendation = (guideId: string, recommendation: RecommendationItem) => {
      updateGuideById(guideId, (guide) => ({
        ...guide,
        recommendations: [...guide.recommendations, recommendation],
      }));
    };

    const updateRecommendation = (
      guideId: string,
      recommendationId: string,
      updates: Partial<RecommendationItem>,
    ) => {
      updateGuideById(guideId, (guide) => ({
        ...guide,
        recommendations: guide.recommendations.map((recommendation) =>
          recommendation.id === recommendationId
            ? { ...recommendation, ...updates }
            : recommendation,
        ),
      }));
    };

    const deleteRecommendation = (guideId: string, recommendationId: string) => {
      updateGuideById(guideId, (guide) => ({
        ...guide,
        recommendations: guide.recommendations.filter(
          (recommendation) => recommendation.id !== recommendationId,
        ),
      }));
    };

    const addAnnouncement = (guideId: string, announcement: AnnouncementItem) => {
      updateGuideById(guideId, (guide) => ({
        ...guide,
        announcements: [announcement, ...guide.announcements],
      }));
    };

    const updateAnnouncement = (
      guideId: string,
      announcementId: string,
      updates: Partial<AnnouncementItem>,
    ) => {
      updateGuideById(guideId, (guide) => ({
        ...guide,
        announcements: guide.announcements.map((announcement) =>
          announcement.id === announcementId ? { ...announcement, ...updates } : announcement,
        ),
      }));
    };

    const deleteAnnouncement = (guideId: string, announcementId: string) => {
      updateGuideById(guideId, (guide) => ({
        ...guide,
        announcements: guide.announcements.filter(
          (announcement) => announcement.id !== announcementId,
        ),
      }));
    };

    const saveEventResponse = (response: EventSurveyResponse) => {
      setEventResponses((responses) => {
        const nextResponses = responses.filter(
          (savedResponse) =>
            !(
              savedResponse.guideId === response.guideId &&
              savedResponse.eventId === response.eventId &&
              savedResponse.participantName === response.participantName
            ),
        );

        return [...nextResponses, response];
      });
      mockWorkshopRepository.saveEventResponse(response);
    };

    const changeAdminPassword = (password: string) => {
      mockWorkshopRepository.setAdminPassword(password);
    };

    return {
      guides,
      defaultGuide,
      selectedGuide,
      selectedGuideId,
      participantProfile,
      participants,
      activeTab,
      scheduleFocusRequestId,
      eventResponses,
      isAdminUnlocked,
      setActiveTab,
      openScheduleTab,
      selectGuide,
      saveParticipantName,
      createGuide,
      updateGuide,
      deleteGuide,
      setDefaultGuide,
      addMapLocation,
      updateMapLocation,
      deleteMapLocation,
      addScheduleItem,
      updateScheduleItem,
      deleteScheduleItem,
      moveScheduleItem,
      updateScheduleControl,
      addEvent,
      updateEvent,
      deleteEvent,
      addSurveyQuestion,
      updateSurveyQuestion,
      deleteSurveyQuestion,
      moveSurveyQuestion,
      addEventTeam,
      updateEventTeam,
      deleteEventTeam,
      assignEventResponseTeam,
      addRecommendation,
      updateRecommendation,
      deleteRecommendation,
      addAnnouncement,
      updateAnnouncement,
      deleteAnnouncement,
      saveEventResponse,
      unlockAdmin,
      lockAdmin,
      changeAdminPassword,
    };
  }, [
    activeTab,
    defaultGuide,
    eventResponses,
    guides,
    isAdminUnlocked,
    participantProfile,
    participants,
    scheduleFocusRequestId,
    selectedGuide,
    selectedGuideId,
  ]);

  return <WorkshopStoreContext.Provider value={value}>{children}</WorkshopStoreContext.Provider>;
};

export const useWorkshopStore = () => {
  const context = useContext(WorkshopStoreContext);

  if (!context) {
    throw new Error("useWorkshopStore must be used inside WorkshopProvider.");
  }

  return context;
};
