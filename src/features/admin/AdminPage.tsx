import { FormEvent, ReactNode, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Lock,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import konjiamMapImageUrl from "../../assets/konjiam-map-base.png";
import { InteractiveMap } from "../map/InteractiveMap";
import { cn } from "../../lib/cn";
import {
  getMapLocationCategoryIcon,
  mapLocationCategoryLabels,
} from "../../lib/mapLocationCategories";
import { useWorkshopStore } from "../../store/workshopStore";
import type {
  EventItem,
  EventSurveyResponse,
  EventStatus,
  MapLocationCategory,
  MapLocation,
  RecommendationItem,
  ScheduleCategory,
  ScheduleItem,
  SurveyQuestion,
  SurveyQuestionType,
  WorkshopGuide,
  WorkshopStatus,
} from "../../types/workshop";

interface AdminPageProps {
  onBack: () => void;
}

type AdminSectionId =
  | "map"
  | "schedule"
  | "events"
  | "recommendations";

type EventTemplateId = "activity" | "bowling";
type ResponseManageTab = "summary" | "responses" | "teams";

const eventTemplateRequiresTeamAssignment: Record<EventTemplateId, boolean> = {
  activity: false,
  bowling: true,
};

const adminSections: Array<{
  id: AdminSectionId;
  label: string;
}> = [
  { id: "map", label: "장소" },
  { id: "schedule", label: "일정" },
  { id: "events", label: "이벤트" },
  { id: "recommendations", label: "추천" },
];

const eventStatusLabels: Record<EventStatus, string> = {
  waiting: "대기",
  active: "진행중",
  closed: "완료",
};

const workshopStatusLabels: Record<WorkshopStatus, string> = {
  pre: "사전 안내",
  live: "진행중",
  closed: "종료",
};

const scheduleCategoryLabels: Record<ScheduleCategory, string> = {
  orientation: "오리엔테이션",
  session: "세션",
  break: "휴식",
  meal: "식사",
  activity: "액티비티",
  event: "이벤트",
  free: "자유",
  notice: "공지",
};

const surveyTypeLabels: Record<SurveyQuestionType, string> = {
  description: "설명박스",
  singleChoice: "객관식",
  multipleChoice: "체크박스",
  shortText: "단답형",
};

const fieldClass =
  "mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
const compactFieldClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
const labelClass = "text-sm font-semibold text-gray-700";
const panelClass = "rounded-lg border border-gray-200 bg-white p-4 shadow-soft";
const adminCardClass = "rounded-lg border border-gray-200 bg-white p-4 shadow-soft";

interface AdminModalProps {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}

const AdminModal = ({ title, description, children, onClose }: AdminModalProps) => (
  <div
    className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/45 px-3 py-4 sm:items-center"
    role="dialog"
    aria-modal="true"
  >
    <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-gray-950">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-5 text-gray-500">{description}</p>
          ) : null}
        </div>
        <button
          aria-label="닫기"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
          onClick={onClose}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 overflow-y-auto px-4 py-4">{children}</div>
    </div>
  </div>
);

type LocationEditDraft = {
  id: string;
  name: string;
  description: string;
  category: MapLocationCategory;
  xPercent: string;
  yPercent: string;
  isWorkshopLocation: boolean;
  isSmokingArea: boolean;
};

type ScheduleEditDraft = {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  location: string;
  locationId: string;
  category: ScheduleCategory;
};

type RecommendationEditDraft = {
  id: string;
  title: string;
  locationLabel: string;
  description: string;
  category: string;
  imageUrl: string;
  isVisible: boolean;
};

type EventEditDraft = {
  id: string;
  title: string;
  status: EventStatus;
  description: string;
  opensAt: string;
  closesAt: string;
  requiresTeamAssignment: boolean;
  resultSummary: string;
};

const createId = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}`;
};

const getLocalDateTimeValue = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const getIsoDateTimeValue = (value: string) => (value ? new Date(value).toISOString() : "");

const getDateInputValue = (value: string) => {
  const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}/);

  if (dateMatch) {
    return dateMatch[0];
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
};

const getStartDateValue = (value: string) => value;

const getNextPosterVersion = (version: string) => {
  const match = version.match(/^(.*?)(\d+)$/);

  if (!match) {
    return `${version || "poster"}-v2`;
  }

  const [, prefix, numberText] = match;
  return `${prefix}${Number(numberText) + 1}`;
};

const formatAnswerValue = (value: string | string[]) =>
  Array.isArray(value) ? value.join(", ") : value;

const getEventResponseTeam = (event: EventItem, response: EventSurveyResponse) =>
  event.teams.find((team) => team.id === response.assignedTeamId) ??
  event.teams.find((team) => team.members.includes(response.participantName));

const getTeamAssignmentLabel = (event: EventItem, response: EventSurveyResponse) => {
  if (!event.requiresTeamAssignment) {
    return "조 배치 미사용";
  }

  return getEventResponseTeam(event, response)?.name ?? "미배정";
};

const getChoiceResponseSummary = (
  question: SurveyQuestion,
  responses: EventSurveyResponse[],
) => {
  const selectedByOption = new Map<string, string[]>();

  question.options?.forEach((option) => {
    selectedByOption.set(option, []);
  });

  responses.forEach((response) => {
    const answer = response.answers[question.id];
    const selectedOptions = Array.isArray(answer) ? answer : answer ? [answer] : [];

    selectedOptions.forEach((option) => {
      const currentNames = selectedByOption.get(option) ?? [];
      selectedByOption.set(option, [...currentNames, response.participantName]);
    });
  });

  return Array.from(selectedByOption.entries()).map(([option, participantNames]) => ({
    option,
    participantNames,
  }));
};

const getShortTextResponseSummary = (
  question: SurveyQuestion,
  responses: EventSurveyResponse[],
) =>
  responses
    .map((response) => {
      const answer = response.answers[question.id];
      const answerText = Array.isArray(answer) ? answer.join(", ") : answer;

      return {
        participantName: response.participantName,
        answerText: answerText?.trim() ?? "",
      };
    })
    .filter((item) => item.answerText.length > 0);

const createEventFromTemplate = (
  templateId: EventTemplateId,
  workshopId: string,
  title: string,
  status: EventStatus,
): EventItem => {
  const now = new Date();
  const closesAt = new Date(now.getTime() + 60 * 60 * 1000);

  if (templateId === "bowling") {
    return {
      id: createId("event"),
      workshopId,
      title: title || "볼링 대회 레벨 테스트",
      description: "공정한 조 편성을 위해 볼링 경험을 확인합니다.",
      status,
      opensAt: now.toISOString(),
      closesAt: closesAt.toISOString(),
      requiresTeamAssignment: true,
      survey: [
        {
          id: createId("question"),
          type: "description",
          label: "조 편성 안내",
          description: "응답을 바탕으로 초급/중급/상급 참가자가 섞이도록 조를 구성합니다.",
        },
        {
          id: createId("question"),
          type: "singleChoice",
          label: "본인의 볼링 실력을 선택해 주세요.",
          required: true,
          options: ["초급", "중급", "상급"],
        },
      ],
      teams: [],
    };
  }

  return {
    id: createId("event"),
    workshopId,
    title: title || "액티비티 사전 설문",
    description: "유료 액티비티 참여 의사와 선호 종목을 확인합니다.",
    status,
    opensAt: now.toISOString(),
    closesAt: closesAt.toISOString(),
    requiresTeamAssignment: false,
    survey: [
      {
        id: createId("question"),
        type: "description",
        label: "안내",
        description: "오후 액티비티 준비를 위해 사전에 참여 여부를 확인합니다.",
      },
      {
        id: createId("question"),
        type: "singleChoice",
        label: "유료 액티비티에 참여하시겠어요?",
        required: true,
        options: ["참여", "불참", "현장에서 결정"],
      },
      {
        id: createId("question"),
        type: "multipleChoice",
        label: "관심 있는 액티비티를 선택해 주세요.",
        options: ["볼링", "스파", "곤돌라", "산책 코스"],
      },
    ],
    teams: [],
  };
};

const createQuestion = (): SurveyQuestion => ({
  id: createId("question"),
  type: "shortText",
  label: "새 문항",
  required: false,
  options: [],
});

const createGuideFromDraft = (
  draft: {
    title: string;
    year: string;
    round: string;
    periodLabel: string;
    startDate: string;
    status: WorkshopStatus;
    locationLabel: string;
  },
  selectedGuide: WorkshopGuide,
): WorkshopGuide => {
  const year = Number(draft.year) || new Date().getFullYear();
  const round = Number(draft.round) || selectedGuide.round + 1;

  return {
    id: createId("guide"),
    round,
    year,
    title: draft.title || `${year} 워크숍 가이드`,
    subtitle: "",
    periodLabel: draft.periodLabel,
    startDate: getStartDateValue(draft.startDate) || selectedGuide.startDate,
    status: draft.status,
    locationLabel: draft.locationLabel || selectedGuide.locationLabel,
    preparationItems: [...selectedGuide.preparationItems],
    venueAddress: selectedGuide.venueAddress,
    transportationGuide: selectedGuide.transportationGuide,
    mapLinkUrl: selectedGuide.mapLinkUrl,
    poster: { ...selectedGuide.poster },
    isDefault: false,
    isPublished: true,
    scheduleControl: {
      mode: "auto",
      manualCurrentScheduleId: undefined,
    },
    schedule: [],
    map: {
      ...selectedGuide.map,
      locations: selectedGuide.map.locations.map((location) => ({
        ...location,
        isWorkshopLocation: false,
        isSmokingArea: false,
      })),
    },
    events: [],
    recommendations: [],
    announcements: [],
  };
};

export const AdminPage = ({ onBack }: AdminPageProps) => {
  const {
    addEvent,
    addEventTeam,
    addMapLocation,
    addRecommendation,
    addScheduleItem,
    addSurveyQuestion,
    assignEventResponseTeam,
    changeAdminPassword,
    createGuide,
    defaultGuide,
    deleteEvent,
    deleteEventTeam,
    deleteGuide,
    deleteMapLocation,
    deleteRecommendation,
    deleteScheduleItem,
    deleteSurveyQuestion,
    eventResponses,
    guides,
    isAdminUnlocked,
    lockAdmin,
    moveScheduleItem,
    moveSurveyQuestion,
    selectGuide,
    selectedGuide,
    setDefaultGuide,
    unlockAdmin,
    updateEvent,
    updateEventTeam,
    updateGuide,
    updateMapLocation,
    updateRecommendation,
    updateScheduleControl,
    updateScheduleItem,
    updateSurveyQuestion,
  } = useWorkshopStore();
  const [activeSection, setActiveSection] = useState<AdminSectionId>("map");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [guideDraft, setGuideDraft] = useState({
    title: "",
    year: String(new Date().getFullYear()),
    round: "",
    periodLabel: "",
    startDate: "",
    status: "pre" as WorkshopStatus,
    locationLabel: "",
  });
  const [locationDraft, setLocationDraft] = useState({
    name: "",
    description: "",
    category: "other" as MapLocationCategory,
    xPercent: "50",
    yPercent: "50",
    isWorkshopLocation: true,
    isSmokingArea: false,
  });
  const [isLocationAddModalOpen, setIsLocationAddModalOpen] = useState(false);
  const [locationEditDraft, setLocationEditDraft] = useState<LocationEditDraft | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState({
    title: "",
    description: "",
    startAt: "",
    endAt: "",
    location: "",
    locationId: "",
    category: "session" as ScheduleCategory,
  });
  const [isScheduleAddModalOpen, setIsScheduleAddModalOpen] = useState(false);
  const [scheduleEditDraft, setScheduleEditDraft] = useState<ScheduleEditDraft | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventTemplateId, setEventTemplateId] = useState<EventTemplateId>("activity");
  const [eventRequiresTeamAssignment, setEventRequiresTeamAssignment] = useState(
    eventTemplateRequiresTeamAssignment.activity,
  );
  const [eventStatus, setEventStatus] = useState<EventStatus>("waiting");
  const [isEventAddModalOpen, setIsEventAddModalOpen] = useState(false);
  const [eventEditDraft, setEventEditDraft] = useState<EventEditDraft | null>(null);
  const [surveyManageEventId, setSurveyManageEventId] = useState<string>();
  const [responseManageEventId, setResponseManageEventId] = useState<string>();
  const [responseManageTab, setResponseManageTab] = useState<ResponseManageTab>("summary");
  const [responseSummaryOpenKey, setResponseSummaryOpenKey] = useState<string>();
  const [recommendationDraft, setRecommendationDraft] = useState({
    title: "",
    locationLabel: "",
    description: "",
    category: "자유시간",
    imageUrl: "/assets/recommendation-eco-stream.png",
    isVisible: true,
  });
  const [isRecommendationAddModalOpen, setIsRecommendationAddModalOpen] = useState(false);
  const [recommendationEditDraft, setRecommendationEditDraft] =
    useState<RecommendationEditDraft | null>(null);
  const [groupDrafts, setGroupDrafts] = useState<
    Record<string, { teamName: string; membersText: string; memo: string }>
  >({});
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");

  const selectedGuideResponses = eventResponses.filter(
    (response) => response.guideId === selectedGuide.id,
  );
  const surveyManageEvent = surveyManageEventId
    ? selectedGuide.events.find((eventItem) => eventItem.id === surveyManageEventId)
    : undefined;
  const responseManageEvent = responseManageEventId
    ? selectedGuide.events.find((eventItem) => eventItem.id === responseManageEventId)
    : undefined;
  const responseManageEventResponses = responseManageEvent
    ? selectedGuideResponses.filter((response) => response.eventId === responseManageEvent.id)
    : [];
  const closeResponseManageModal = () => {
    setResponseManageEventId(undefined);
    setResponseManageTab("summary");
    setResponseSummaryOpenKey(undefined);
  };
  const updatePoster = (updates: Partial<WorkshopGuide["poster"]>) => {
    updateGuide(selectedGuide.id, {
      poster: {
        ...selectedGuide.poster,
        ...updates,
      },
    });
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isUnlocked = unlockAdmin(password);
    setErrorMessage(isUnlocked ? "" : "비밀번호를 확인해 주세요.");
  };

  const handleCreateGuide = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    createGuide(createGuideFromDraft(guideDraft, selectedGuide));
    setGuideDraft({
      title: "",
      year: String(new Date().getFullYear()),
      round: "",
      periodLabel: "",
      startDate: "",
      status: "pre",
      locationLabel: "",
    });
  };

  const resetLocationDraft = () => {
    setLocationDraft({
      name: "",
      description: "",
      category: "other",
      xPercent: "50",
      yPercent: "50",
      isWorkshopLocation: true,
      isSmokingArea: false,
    });
  };

  const openLocationAddModal = () => {
    resetLocationDraft();
    setIsLocationAddModalOpen(true);
  };

  const handleAddMapLocation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!locationDraft.name.trim()) {
      return;
    }

    addMapLocation(selectedGuide.id, {
      id: createId("location"),
      name: locationDraft.name.trim(),
      description: locationDraft.description.trim(),
      category: locationDraft.category,
      xPercent: Number(locationDraft.xPercent) || 50,
      yPercent: Number(locationDraft.yPercent) || 50,
      isWorkshopLocation: locationDraft.isWorkshopLocation,
      isSmokingArea: locationDraft.isSmokingArea,
    });
    resetLocationDraft();
    setIsLocationAddModalOpen(false);
  };

  const getLocationScheduleUsage = (locationId: string) =>
    selectedGuide.schedule.filter((scheduleItem) => scheduleItem.locationId === locationId);

  const openLocationEditModal = (location: MapLocation) => {
    setLocationEditDraft({
      id: location.id,
      name: location.name,
      description: location.description ?? "",
      category: location.category,
      xPercent: String(location.xPercent),
      yPercent: String(location.yPercent),
      isWorkshopLocation: location.isWorkshopLocation,
      isSmokingArea: location.isSmokingArea,
    });
  };

  const handleSaveLocationEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!locationEditDraft) {
      return;
    }

    updateMapLocation(selectedGuide.id, locationEditDraft.id, {
      name: locationEditDraft.name,
      description: locationEditDraft.description,
      category: locationEditDraft.category,
      xPercent: Number(locationEditDraft.xPercent) || 50,
      yPercent: Number(locationEditDraft.yPercent) || 50,
      isWorkshopLocation: locationEditDraft.isWorkshopLocation,
      isSmokingArea: locationEditDraft.isSmokingArea,
    });
    setLocationEditDraft(null);
  };

  const handleDeleteMapLocation = (location: MapLocation) => {
    const usedScheduleItems = getLocationScheduleUsage(location.id);

    if (usedScheduleItems.length > 0) {
      window.alert(
        `이 장소는 일정에서 사용 중입니다: ${usedScheduleItems
          .map((scheduleItem) => scheduleItem.title)
          .join(", ")}`,
      );
      return;
    }

    if (!window.confirm("이 장소를 삭제하시겠습니까?")) {
      return;
    }

    deleteMapLocation(selectedGuide.id, location.id);
    setLocationEditDraft((currentDraft) =>
      currentDraft?.id === location.id ? null : currentDraft,
    );
  };

  const resetScheduleDraft = () => {
    setScheduleDraft({
      title: "",
      description: "",
      startAt: "",
      endAt: "",
      location: "",
      locationId: "",
      category: "session",
    });
  };

  const openScheduleAddModal = () => {
    setScheduleDraft({
      title: "",
      description: "",
      startAt: "",
      endAt: "",
      location: "",
      locationId: "",
      category: "session",
    });
    setIsScheduleAddModalOpen(true);
  };

  const closeScheduleAddModal = () => {
    resetScheduleDraft();
    setIsScheduleAddModalOpen(false);
  };

  const handleAddScheduleItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!scheduleDraft.title.trim() || !scheduleDraft.startAt || !scheduleDraft.endAt) {
      return;
    }

    addScheduleItem(selectedGuide.id, {
      id: createId("schedule"),
      title: scheduleDraft.title.trim(),
      description: scheduleDraft.description.trim(),
      startAt: getIsoDateTimeValue(scheduleDraft.startAt),
      endAt: getIsoDateTimeValue(scheduleDraft.endAt),
      location: scheduleDraft.location.trim() || "장소 미정",
      locationId: scheduleDraft.locationId || undefined,
      category: scheduleDraft.category,
    });
    closeScheduleAddModal();
  };

  const openScheduleEditModal = (scheduleItem: ScheduleItem) => {
    setScheduleEditDraft({
      id: scheduleItem.id,
      title: scheduleItem.title,
      description: scheduleItem.description,
      startAt: getLocalDateTimeValue(scheduleItem.startAt),
      endAt: getLocalDateTimeValue(scheduleItem.endAt),
      location: scheduleItem.location,
      locationId: scheduleItem.locationId ?? "",
      category: scheduleItem.category,
    });
  };

  const handleSaveScheduleEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!scheduleEditDraft) {
      return;
    }

    updateScheduleItem(selectedGuide.id, scheduleEditDraft.id, {
      title: scheduleEditDraft.title,
      description: scheduleEditDraft.description,
      startAt: getIsoDateTimeValue(scheduleEditDraft.startAt),
      endAt: getIsoDateTimeValue(scheduleEditDraft.endAt),
      location: scheduleEditDraft.location.trim() || "장소 미정",
      locationId: scheduleEditDraft.locationId || undefined,
      category: scheduleEditDraft.category,
    });
    setScheduleEditDraft(null);
  };

  const handleDeleteScheduleItem = (scheduleItem: ScheduleItem) => {
    if (!window.confirm("이 일정을 삭제하시겠습니까?")) {
      return;
    }

    deleteScheduleItem(selectedGuide.id, scheduleItem.id);
    setScheduleEditDraft((currentDraft) =>
      currentDraft?.id === scheduleItem.id ? null : currentDraft,
    );
  };

  const handleAddEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextEvent = createEventFromTemplate(
      eventTemplateId,
      selectedGuide.id,
      eventTitle.trim(),
      eventStatus,
    );

    addEvent(selectedGuide.id, {
      ...nextEvent,
      requiresTeamAssignment: eventRequiresTeamAssignment,
    });
    setEventTitle("");
    setEventTemplateId("activity");
    setEventRequiresTeamAssignment(eventTemplateRequiresTeamAssignment.activity);
    setEventStatus("waiting");
    setIsEventAddModalOpen(false);
  };

  const openEventAddModal = () => {
    setEventTitle("");
    setEventTemplateId("activity");
    setEventRequiresTeamAssignment(eventTemplateRequiresTeamAssignment.activity);
    setEventStatus("waiting");
    setIsEventAddModalOpen(true);
  };

  const openEventEditModal = (eventItem: EventItem) => {
    setEventEditDraft({
      id: eventItem.id,
      title: eventItem.title,
      status: eventItem.status,
      description: eventItem.description,
      opensAt: getLocalDateTimeValue(eventItem.opensAt),
      closesAt: getLocalDateTimeValue(eventItem.closesAt),
      requiresTeamAssignment: eventItem.requiresTeamAssignment,
      resultSummary: eventItem.resultSummary ?? "",
    });
  };

  const handleSaveEventEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!eventEditDraft) {
      return;
    }

    updateEvent(selectedGuide.id, eventEditDraft.id, {
      title: eventEditDraft.title,
      status: eventEditDraft.status,
      description: eventEditDraft.description,
      opensAt: getIsoDateTimeValue(eventEditDraft.opensAt),
      closesAt: getIsoDateTimeValue(eventEditDraft.closesAt),
      requiresTeamAssignment: eventEditDraft.requiresTeamAssignment,
      resultSummary: eventEditDraft.resultSummary,
    });
    setEventEditDraft(null);
  };

  const handleDeleteEvent = (eventItem: EventItem) => {
    if (!window.confirm("이 이벤트를 삭제하시겠습니까?")) {
      return;
    }

    deleteEvent(selectedGuide.id, eventItem.id);
    setEventEditDraft((currentDraft) => (currentDraft?.id === eventItem.id ? null : currentDraft));
    setSurveyManageEventId((currentId) => (currentId === eventItem.id ? undefined : currentId));
    setResponseManageEventId((currentId) => {
      if (currentId !== eventItem.id) {
        return currentId;
      }

      setResponseManageTab("summary");
      setResponseSummaryOpenKey(undefined);
      return undefined;
    });
  };

  const resetRecommendationDraft = () => {
    setRecommendationDraft({
      title: "",
      locationLabel: "",
      description: "",
      category: "자유시간",
      imageUrl: "/assets/recommendation-eco-stream.png",
      isVisible: true,
    });
  };

  const openRecommendationAddModal = () => {
    resetRecommendationDraft();
    setIsRecommendationAddModalOpen(true);
  };

  const handleAddRecommendation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!recommendationDraft.title.trim()) {
      return;
    }

    addRecommendation(selectedGuide.id, {
      id: createId("recommendation"),
      ...recommendationDraft,
      title: recommendationDraft.title.trim(),
      locationLabel: recommendationDraft.locationLabel.trim() || "위치 미정",
      description: recommendationDraft.description.trim(),
    });
    resetRecommendationDraft();
    setIsRecommendationAddModalOpen(false);
  };

  const openRecommendationEditModal = (recommendation: RecommendationItem) => {
    setRecommendationEditDraft({
      id: recommendation.id,
      title: recommendation.title,
      locationLabel: recommendation.locationLabel,
      description: recommendation.description,
      category: recommendation.category,
      imageUrl: recommendation.imageUrl,
      isVisible: recommendation.isVisible,
    });
  };

  const handleSaveRecommendationEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!recommendationEditDraft) {
      return;
    }

    updateRecommendation(selectedGuide.id, recommendationEditDraft.id, {
      title: recommendationEditDraft.title,
      locationLabel: recommendationEditDraft.locationLabel.trim() || "위치 미정",
      description: recommendationEditDraft.description,
      category: recommendationEditDraft.category,
      imageUrl: recommendationEditDraft.imageUrl,
      isVisible: recommendationEditDraft.isVisible,
    });
    setRecommendationEditDraft(null);
  };

  const handleDeleteRecommendation = (recommendation: RecommendationItem) => {
    if (!window.confirm("이 추천 코스를 삭제하시겠습니까?")) {
      return;
    }

    deleteRecommendation(selectedGuide.id, recommendation.id);
    setRecommendationEditDraft((currentDraft) =>
      currentDraft?.id === recommendation.id ? null : currentDraft,
    );
  };

  const handlePasswordChange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newPassword || newPassword !== newPasswordConfirm) {
      setSettingsMessage("새 비밀번호를 확인해 주세요.");
      return;
    }

    changeAdminPassword(newPassword);
    setNewPassword("");
    setNewPasswordConfirm("");
    setSettingsMessage("비밀번호가 변경되었습니다.");
  };

  if (!isAdminUnlocked) {
    return (
      <section className="mx-auto max-w-sm space-y-4 overflow-x-hidden">
        <Button
          aria-label="홈으로 돌아가기"
          className="h-10 w-10 rounded-full p-0"
          icon={<ArrowLeft className="h-7 w-7" />}
          onClick={onBack}
          variant="ghost"
        />
        <form className={panelClass} onSubmit={handleLogin}>
          <div className="w-fit rounded-full bg-brand-50 p-3 text-brand-700">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">관리자 페이지</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            mock 단계의 간단 비밀번호 진입 구조입니다.
          </p>
          <input
            className={fieldClass}
            onChange={(inputEvent) => setPassword(inputEvent.target.value)}
            placeholder="비밀번호"
            type="password"
            value={password}
          />
          {errorMessage ? <p className="mt-2 text-sm font-semibold text-red-600">{errorMessage}</p> : null}
          <Button className="mt-4 w-full" disabled={!password} type="submit">
            확인
          </Button>
        </form>
      </section>
    );
  }

  return (
    <section className="min-w-0 max-w-full space-y-4 overflow-x-hidden pb-6">
      <div className="grid min-h-12 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-gray-200 bg-white pb-3">
        <Button
          aria-label="홈으로 돌아가기"
          className="h-10 w-10 rounded-full p-0"
          icon={<ArrowLeft className="h-7 w-7" />}
          onClick={onBack}
          variant="ghost"
        />

        <label className="relative min-w-0">
          <select
            aria-label="워크숍 회차 선택"
            className="w-full appearance-none truncate bg-transparent py-2 pr-7 text-base font-bold text-gray-950 outline-none sm:text-lg"
            onChange={(event) => selectGuide(event.target.value)}
            value={selectedGuide.id}
          >
            {guides.map((guide) => (
              <option key={guide.id} value={guide.id}>
                {guide.title}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            ▼
          </span>
        </label>

        <details className="relative shrink-0">
          <summary className="flex min-h-10 cursor-pointer list-none items-center rounded-lg px-3 text-sm font-bold text-gray-700 hover:bg-gray-100">
            ⚙ 관리
          </summary>
          <div className="absolute right-0 top-12 z-40 max-h-[calc(100dvh-8rem)] w-[min(42rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-2xl">
            <div className="flex flex-wrap justify-end gap-2">
              <Button icon={<ArrowLeft className="h-6 w-6" />} onClick={onBack} variant="ghost">
                홈으로 돌아가기
              </Button>
              <Button icon={<LogOut className="h-4 w-4" />} onClick={lockAdmin} variant="secondary">
                로그아웃
              </Button>
            </div>

            <section className="mt-4 space-y-3 border-t border-gray-100 pt-4">
              <h2 className="font-bold">회차 설정</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <label>
                  <span className={labelClass}>가이드명</span>
                  <input
                    className={fieldClass}
                    onChange={(event) => updateGuide(selectedGuide.id, { title: event.target.value })}
                    value={selectedGuide.title}
                  />
                </label>
                <label>
                  <span className={labelClass}>부제</span>
                  <input
                    className={fieldClass}
                    onChange={(event) =>
                      updateGuide(selectedGuide.id, { subtitle: event.target.value })
                    }
                    value={selectedGuide.subtitle}
                  />
                </label>
                <label>
                  <span className={labelClass}>기간</span>
                  <input
                    className={fieldClass}
                    onChange={(event) =>
                      updateGuide(selectedGuide.id, { periodLabel: event.target.value })
                    }
                    value={selectedGuide.periodLabel}
                  />
                </label>
                <label>
                  <span className={labelClass}>시작일</span>
                  <input
                    className={fieldClass}
                    onChange={(event) =>
                      updateGuide(selectedGuide.id, {
                        startDate: getStartDateValue(event.target.value),
                      })
                    }
                    type="date"
                    value={getDateInputValue(selectedGuide.startDate)}
                  />
                </label>
                <label>
                  <span className={labelClass}>상태</span>
                  <select
                    className={fieldClass}
                    onChange={(event) =>
                      updateGuide(selectedGuide.id, {
                        status: event.target.value as WorkshopStatus,
                      })
                    }
                    value={selectedGuide.status}
                  >
                    {Object.entries(workshopStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={labelClass}>장소</span>
                  <input
                    className={fieldClass}
                    onChange={(event) =>
                      updateGuide(selectedGuide.id, { locationLabel: event.target.value })
                    }
                    value={selectedGuide.locationLabel}
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => setDefaultGuide(selectedGuide.id)} variant="secondary">
                  기본 지정
                </Button>
                <label className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gray-100 px-4 text-sm font-semibold text-gray-700">
                  <input
                    checked={selectedGuide.isPublished}
                    onChange={(event) =>
                      updateGuide(selectedGuide.id, { isPublished: event.target.checked })
                    }
                    type="checkbox"
                  />
                  이전 가이드 공개
                </label>
                <Button
                  disabled={guides.length <= 1}
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={() => deleteGuide(selectedGuide.id)}
                  variant="danger"
                >
                  회차 삭제
                </Button>
              </div>
            </section>

            <section className="mt-4 space-y-3 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold">포스터 스플래시</h2>
                <label className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gray-100 px-4 text-sm font-semibold text-gray-700">
                  <input
                    checked={selectedGuide.poster.enabled}
                    onChange={(event) => updatePoster({ enabled: event.target.checked })}
                    type="checkbox"
                  />
                  사용
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label>
                  <span className={labelClass}>이미지 URL</span>
                  <input
                    className={fieldClass}
                    onChange={(event) => updatePoster({ imageUrl: event.target.value })}
                    placeholder="/assets/2026_workshop_poster.png"
                    value={selectedGuide.poster.imageUrl}
                  />
                </label>
                <label>
                  <span className={labelClass}>포스터 버전</span>
                  <div className="mt-2 flex gap-2">
                    <input
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                      onChange={(event) => updatePoster({ version: event.target.value })}
                      value={selectedGuide.poster.version}
                    />
                    <Button
                      className="shrink-0"
                      onClick={() =>
                        updatePoster({
                          version: getNextPosterVersion(selectedGuide.poster.version),
                        })
                      }
                      variant="secondary"
                    >
                      증가
                    </Button>
                  </div>
                </label>
                <label>
                  <span className={labelClass}>노출 시간(ms)</span>
                  <input
                    className={fieldClass}
                    min={500}
                    onChange={(event) =>
                      updatePoster({ durationMs: Number(event.target.value) || 2000 })
                    }
                    type="number"
                    value={selectedGuide.poster.durationMs}
                  />
                </label>
                <div className="grid gap-2 pt-1">
                  <label className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gray-100 px-4 text-sm font-semibold text-gray-700">
                    <input
                      checked={selectedGuide.poster.showOnPreFirstVisit}
                      onChange={(event) =>
                        updatePoster({ showOnPreFirstVisit: event.target.checked })
                      }
                      type="checkbox"
                    />
                    사전 기간 최초 방문
                  </label>
                  <label className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gray-100 px-4 text-sm font-semibold text-gray-700">
                    <input
                      checked={selectedGuide.poster.showOnDay1FirstVisit}
                      onChange={(event) =>
                        updatePoster({ showOnDay1FirstVisit: event.target.checked })
                      }
                      type="checkbox"
                    />
                    1일차 최초 방문
                  </label>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-950">
                {selectedGuide.poster.imageUrl ? (
                  <img
                    alt="포스터 미리보기"
                    className="mx-auto max-h-72 w-full object-contain"
                    src={selectedGuide.poster.imageUrl}
                  />
                ) : (
                  <p className="px-4 py-8 text-center text-sm font-semibold text-gray-400">
                    포스터 이미지 URL을 입력해 주세요.
                  </p>
                )}
              </div>
            </section>

            <section className="mt-4 space-y-3 border-t border-gray-100 pt-4">
              <h2 className="font-bold">회차 생성</h2>
              <form className="space-y-3" onSubmit={handleCreateGuide}>
                <div className="grid gap-3 md:grid-cols-2">
                  <label>
                    <span className={labelClass}>가이드명</span>
                    <input
                      className={fieldClass}
                      onChange={(event) =>
                        setGuideDraft({ ...guideDraft, title: event.target.value })
                      }
                      placeholder="2027 워크숍 가이드"
                      value={guideDraft.title}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>연도</span>
                    <input
                      className={fieldClass}
                      onChange={(event) =>
                        setGuideDraft({ ...guideDraft, year: event.target.value })
                      }
                      type="number"
                      value={guideDraft.year}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>회차</span>
                    <input
                      className={fieldClass}
                      onChange={(event) =>
                        setGuideDraft({ ...guideDraft, round: event.target.value })
                      }
                      type="number"
                      value={guideDraft.round}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>시작일</span>
                    <input
                      className={fieldClass}
                      onChange={(event) =>
                        setGuideDraft({ ...guideDraft, startDate: event.target.value })
                      }
                      type="date"
                      value={guideDraft.startDate}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>상태</span>
                    <select
                      className={fieldClass}
                      onChange={(event) =>
                        setGuideDraft({
                          ...guideDraft,
                          status: event.target.value as WorkshopStatus,
                        })
                      }
                      value={guideDraft.status}
                    >
                      {Object.entries(workshopStatusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className={labelClass}>장소</span>
                    <input
                      className={fieldClass}
                      onChange={(event) =>
                        setGuideDraft({ ...guideDraft, locationLabel: event.target.value })
                      }
                      placeholder="곤지암 리조트"
                      value={guideDraft.locationLabel}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className={labelClass}>기간</span>
                  <input
                    className={fieldClass}
                    onChange={(event) =>
                      setGuideDraft({ ...guideDraft, periodLabel: event.target.value })
                    }
                    placeholder="2027.06.12 - 2027.06.13"
                    value={guideDraft.periodLabel}
                  />
                </label>
                <Button icon={<Plus className="h-4 w-4" />} type="submit">
                  회차 추가
                </Button>
              </form>
            </section>

            <section className="mt-4 space-y-3 border-t border-gray-100 pt-4">
              <h2 className="font-bold">관리자 비밀번호</h2>
              <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={handlePasswordChange}>
                <input
                  className={compactFieldClass}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="새 비밀번호"
                  type="password"
                  value={newPassword}
                />
                <input
                  className={compactFieldClass}
                  onChange={(event) => setNewPasswordConfirm(event.target.value)}
                  placeholder="새 비밀번호 확인"
                  type="password"
                  value={newPasswordConfirm}
                />
                <Button type="submit">확인</Button>
              </form>
              {settingsMessage ? (
                <p className="text-sm font-semibold text-brand-700">{settingsMessage}</p>
              ) : null}
            </section>
          </div>
        </details>
      </div>

      <nav className="overflow-x-hidden border-b border-gray-200 bg-white">
        <div className="grid grid-cols-4 gap-1 px-1">
          {adminSections.map((section) => {
            const isActive = activeSection === section.id;

            return (
              <button
                className={cn(
                  "min-h-11 min-w-0 rounded-t-lg border-b-2 px-1 text-sm transition",
                  isActive
                    ? "border-brand-700 bg-brand-50 font-bold text-gray-950"
                    : "border-transparent font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                )}
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                type="button"
              >
                <span className="block truncate">{section.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {activeSection === "map" ? (
        <div className="space-y-4">
          <div className={panelClass}>
            <h2 className="font-bold">지도 설정</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label>
                <span className={labelClass}>지도명</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    updateGuide(selectedGuide.id, {
                      map: { ...selectedGuide.map, title: event.target.value },
                    })
                  }
                  value={selectedGuide.map.title}
                />
              </label>
              <label>
                <span className={labelClass}>이미지 경로</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    updateGuide(selectedGuide.id, {
                      map: { ...selectedGuide.map, imageUrl: event.target.value },
                    })
                  }
                  value={selectedGuide.map.imageUrl ?? ""}
                />
              </label>
            </div>
          </div>

          <div className={`${panelClass} p-4 md:hidden`}>
            <h2 className="font-bold">마커 위치 편집</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              모바일에서는 드래그 편집을 사용하지 않습니다. 장소 카드의 수정에서 X/Y 좌표를 입력해 주세요.
            </p>
          </div>

          <div className={`${panelClass} hidden overflow-hidden p-0 md:block`}>
            <div className="border-b border-gray-200 p-4">
              <h2 className="font-bold">마커 위치 편집</h2>
            </div>
            <div className="h-[26rem] max-h-[65dvh] min-h-[20rem] overflow-hidden bg-[#dce8c8]">
              <InteractiveMap
                fallbackImageUrl={konjiamMapImageUrl}
                imageUrl={selectedGuide.map.imageUrl}
                isLocationEditingEnabled
                locations={selectedGuide.map.locations}
                onLocationPositionChange={(locationId, position) =>
                  updateMapLocation(selectedGuide.id, locationId, position)
                }
                title={selectedGuide.map.title}
              />
            </div>
          </div>

          <div className={`${panelClass} overflow-hidden p-0`}>
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-4">
              <h2 className="font-bold">장소 관리</h2>
              <Button icon={<Plus className="h-4 w-4" />} onClick={openLocationAddModal}>
                추가
              </Button>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-2">
              {selectedGuide.map.locations.map((location) => {
                const CategoryIcon = getMapLocationCategoryIcon(location.category);
                const usedScheduleItems = getLocationScheduleUsage(location.id);

                return (
                  <article className={adminCardClass} key={location.id}>
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <CategoryIcon className="h-4 w-4 shrink-0 text-brand-700" />
                          <h3 className="truncate font-bold text-gray-950">{location.name}</h3>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-gray-500">
                          {mapLocationCategoryLabels[location.category]} · X {location.xPercent}, Y {location.yPercent}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          aria-label="수정"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
                          onClick={() => openLocationEditModal(location)}
                          type="button"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="삭제"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteMapLocation(location)}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {location.description ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-600">
                        {location.description}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-bold",
                          location.isWorkshopLocation
                            ? "bg-brand-50 text-brand-800"
                            : "bg-gray-100 text-gray-500",
                        )}
                      >
                        {location.isWorkshopLocation ? "워크숍 사용" : "전체만 표시"}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-bold",
                          location.isSmokingArea
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-500",
                        )}
                      >
                        {location.isSmokingArea ? "흡연구역" : "일반 장소"}
                      </span>
                      {usedScheduleItems.length > 0 ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                          일정 사용 중
                        </span>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === "schedule" ? (
        <div className="space-y-4">
          <div className={panelClass}>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-bold">현재 일정 제어</h2>
                <p className="mt-1 text-sm text-gray-500">
                  현재 일정 바와 일정 탭 하이라이트에 반영됩니다.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  className={compactFieldClass}
                  onChange={(event) =>
                    updateScheduleControl(selectedGuide.id, {
                      mode: event.target.value as "auto" | "manual",
                      manualCurrentScheduleId:
                        event.target.value === "manual"
                          ? selectedGuide.scheduleControl.manualCurrentScheduleId ??
                            selectedGuide.schedule[0]?.id
                          : undefined,
                    })
                  }
                  value={selectedGuide.scheduleControl.mode}
                >
                  <option value="auto">자동 계산</option>
                  <option value="manual">수동 지정</option>
                </select>
                <select
                  className={compactFieldClass}
                  disabled={selectedGuide.scheduleControl.mode !== "manual"}
                  onChange={(event) =>
                    updateScheduleControl(selectedGuide.id, {
                      mode: "manual",
                      manualCurrentScheduleId: event.target.value,
                    })
                  }
                  value={selectedGuide.scheduleControl.manualCurrentScheduleId ?? ""}
                >
                  <option value="">일정 선택</option>
                  {selectedGuide.schedule.map((scheduleItem) => (
                    <option key={scheduleItem.id} value={scheduleItem.id}>
                      {scheduleItem.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <section className={panelClass}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-bold">일정 추가</h2>
                <p className="mt-1 text-sm text-gray-500">
                  새 일정은 모달에서 입력한 뒤 카드 목록에 추가됩니다.
                </p>
              </div>
              <Button className="shrink-0" icon={<Plus className="h-4 w-4" />} onClick={openScheduleAddModal}>
                추가
              </Button>
            </div>
          </section>

          <div className={`${panelClass} overflow-hidden p-0`}>
            <div className="border-b border-gray-200 p-4">
              <h2 className="font-bold">일정 목록</h2>
            </div>
            <div className="grid gap-3 p-4 lg:grid-cols-2">
              {selectedGuide.schedule.length > 0 ? (
                selectedGuide.schedule.map((scheduleItem, index) => (
                  <article className={adminCardClass} key={scheduleItem.id}>
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                            #{index + 1}
                          </span>
                          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-800">
                            {scheduleCategoryLabels[scheduleItem.category]}
                          </span>
                        </div>
                        <h3 className="mt-2 line-clamp-2 font-bold text-gray-950">
                          {scheduleItem.title}
                        </h3>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          aria-label="위로"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
                          onClick={() => moveScheduleItem(selectedGuide.id, scheduleItem.id, "up")}
                          type="button"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="아래로"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
                          onClick={() => moveScheduleItem(selectedGuide.id, scheduleItem.id, "down")}
                          type="button"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1 text-sm leading-5 text-gray-600">
                      <p className="font-semibold text-gray-800">
                        {getLocalDateTimeValue(scheduleItem.startAt).replace("T", " ")} -{" "}
                        {getLocalDateTimeValue(scheduleItem.endAt).replace("T", " ")}
                      </p>
                      <p className="line-clamp-1 font-semibold text-gray-700">
                        장소: {scheduleItem.location}
                      </p>
                      {scheduleItem.description ? (
                        <p className="line-clamp-2 text-gray-500">{scheduleItem.description}</p>
                      ) : null}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      <Button
                        className="px-3"
                        onClick={() =>
                          updateScheduleControl(selectedGuide.id, {
                            mode: "manual",
                            manualCurrentScheduleId: scheduleItem.id,
                          })
                        }
                        variant="secondary"
                      >
                        현재 지정
                      </Button>
                      <Button
                        className="px-3"
                        icon={<Pencil className="h-4 w-4" />}
                        onClick={() => openScheduleEditModal(scheduleItem)}
                        variant="secondary"
                      >
                        수정
                      </Button>
                      <Button
                        className="col-span-2 px-3 sm:col-span-1"
                        icon={<Trash2 className="h-4 w-4" />}
                        onClick={() => handleDeleteScheduleItem(scheduleItem)}
                        variant="danger"
                      >
                        삭제
                      </Button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                  등록된 일정이 없습니다.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === "events" ? (
        <div className="space-y-4">
          <section className={panelClass}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-bold">이벤트 관리</h2>
                <p className="mt-1 text-sm text-gray-500">
                  이벤트별 하위 관리는 카드의 버튼에서 엽니다.
                </p>
              </div>
              <Button className="shrink-0" icon={<Plus className="h-4 w-4" />} onClick={openEventAddModal}>
                추가
              </Button>
            </div>

            <div className="mt-4 grid gap-3 border-t border-gray-100 pt-4 md:grid-cols-2 xl:grid-cols-3">
              {selectedGuide.events.length > 0 ? (
                selectedGuide.events.map((eventItem) => {
                  const responseCount = selectedGuideResponses.filter(
                    (response) => response.eventId === eventItem.id,
                  ).length;

                  return (
                    <article
                      className="rounded-lg border border-gray-200 bg-white p-3"
                      key={eventItem.id}
                    >
                      <div>
                        <span
                          className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600"
                        >
                          {eventStatusLabels[eventItem.status]}
                        </span>
                        <p className="mt-2 line-clamp-2 text-sm font-bold text-gray-950">
                          {eventItem.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                          {eventItem.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600">
                            {eventItem.requiresTeamAssignment ? "조 배치 사용" : "조 배치 미사용"}
                          </span>
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600">
                            문항 {eventItem.survey.length}개
                          </span>
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600">
                            응답 {responseCount}개
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          className="min-h-9 px-2 py-1.5 text-xs"
                          icon={<Pencil className="h-3.5 w-3.5" />}
                          onClick={() => openEventEditModal(eventItem)}
                          variant="secondary"
                        >
                          수정
                        </Button>
                        <Button
                          className="min-h-9 px-2 py-1.5 text-xs"
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          onClick={() => handleDeleteEvent(eventItem)}
                          variant="danger"
                        >
                          삭제
                        </Button>
                        <Button
                          className="col-span-2 min-h-9 px-2 py-1.5 text-xs"
                          onClick={() => setSurveyManageEventId(eventItem.id)}
                          variant="secondary"
                        >
                          설문 문항 관리
                        </Button>
                        <Button
                          className="col-span-2 min-h-9 px-2 py-1.5 text-xs"
                          onClick={() => {
                            setResponseManageEventId(eventItem.id);
                            setResponseManageTab("summary");
                            setResponseSummaryOpenKey(undefined);
                          }}
                          variant="secondary"
                        >
                          응답/조배치 관리
                        </Button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500 md:col-span-2 xl:col-span-3">
                  등록된 이벤트가 없습니다.
                </p>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {activeSection === "recommendations" ? (
        <div className="space-y-4">
          <section className={panelClass}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-bold">추천 코스 추가</h2>
                <p className="mt-1 text-sm text-gray-500">
                  새 추천 코스는 모달에서 입력합니다.
                </p>
              </div>
              <Button className="shrink-0" icon={<Plus className="h-4 w-4" />} onClick={openRecommendationAddModal}>
                추가
              </Button>
            </div>
          </section>

          <div className="grid gap-3 lg:grid-cols-2">
            {selectedGuide.recommendations.length > 0 ? (
              selectedGuide.recommendations.map((recommendation) => (
                <article className={adminCardClass} key={recommendation.id}>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="h-32 w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-24 sm:w-32">
                      <img
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.src = "/assets/konjiam-map-base.png";
                        }}
                        src={recommendation.imageUrl}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-800">
                          {recommendation.category}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-bold",
                            recommendation.isVisible
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-500",
                          )}
                        >
                          {recommendation.isVisible ? "노출" : "숨김"}
                        </span>
                      </div>
                      <h3 className="mt-2 line-clamp-2 font-bold text-gray-950">
                        {recommendation.title}
                      </h3>
                      <p className="mt-1 line-clamp-1 text-sm font-semibold text-gray-600">
                        {recommendation.locationLabel}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-500">
                        {recommendation.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    <Button
                      className="px-3"
                      icon={<Pencil className="h-4 w-4" />}
                      onClick={() => openRecommendationEditModal(recommendation)}
                      variant="secondary"
                    >
                      수정
                    </Button>
                    <Button
                      className="px-3"
                      icon={<Trash2 className="h-4 w-4" />}
                      onClick={() => handleDeleteRecommendation(recommendation)}
                      variant="danger"
                    >
                      삭제
                    </Button>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                등록된 추천 코스가 없습니다.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {isLocationAddModalOpen ? (
        <AdminModal
          title="장소 추가"
          description="지도 필터와 일정 연결에 사용할 장소를 추가합니다."
          onClose={() => {
            resetLocationDraft();
            setIsLocationAddModalOpen(false);
          }}
        >
          <form className="space-y-4" onSubmit={handleAddMapLocation}>
            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className={labelClass}>장소명</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setLocationDraft({ ...locationDraft, name: event.target.value })
                  }
                  placeholder="새 장소"
                  value={locationDraft.name}
                />
              </label>
              <label>
                <span className={labelClass}>카테고리</span>
                <select
                  className={fieldClass}
                  onChange={(event) =>
                    setLocationDraft({
                      ...locationDraft,
                      category: event.target.value as MapLocationCategory,
                    })
                  }
                  value={locationDraft.category}
                >
                  {Object.entries(mapLocationCategoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="md:col-span-2">
                <span className={labelClass}>설명</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setLocationDraft({ ...locationDraft, description: event.target.value })
                  }
                  placeholder="운영 메모 또는 장소 설명"
                  value={locationDraft.description}
                />
              </label>
              <label>
                <span className={labelClass}>X 좌표</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setLocationDraft({ ...locationDraft, xPercent: event.target.value })
                  }
                  type="number"
                  value={locationDraft.xPercent}
                />
              </label>
              <label>
                <span className={labelClass}>Y 좌표</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setLocationDraft({ ...locationDraft, yPercent: event.target.value })
                  }
                  type="number"
                  value={locationDraft.yPercent}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gray-100 px-3 text-sm font-semibold text-gray-700">
                <input
                  checked={locationDraft.isWorkshopLocation}
                  onChange={(event) =>
                    setLocationDraft({
                      ...locationDraft,
                      isWorkshopLocation: event.target.checked,
                    })
                  }
                  type="checkbox"
                />
                워크숍 사용 장소
              </label>
              <label className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gray-100 px-3 text-sm font-semibold text-gray-700">
                <input
                  checked={locationDraft.isSmokingArea}
                  onChange={(event) =>
                    setLocationDraft({
                      ...locationDraft,
                      isSmokingArea: event.target.checked,
                    })
                  }
                  type="checkbox"
                />
                흡연구역
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                onClick={() => {
                  resetLocationDraft();
                  setIsLocationAddModalOpen(false);
                }}
                variant="secondary"
              >
                취소
              </Button>
              <Button disabled={!locationDraft.name.trim()} icon={<Plus className="h-4 w-4" />} type="submit">
                저장
              </Button>
            </div>
          </form>
        </AdminModal>
      ) : null}

      {isScheduleAddModalOpen ? (
        <AdminModal
          title="일정 추가"
          description="시작/종료 시간과 지도 장소 연결을 입력합니다."
          onClose={closeScheduleAddModal}
        >
          <form className="space-y-4" onSubmit={handleAddScheduleItem}>
            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className={labelClass}>시작</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setScheduleDraft({ ...scheduleDraft, startAt: event.target.value })
                  }
                  type="datetime-local"
                  value={scheduleDraft.startAt}
                />
              </label>
              <label>
                <span className={labelClass}>종료</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setScheduleDraft({ ...scheduleDraft, endAt: event.target.value })
                  }
                  type="datetime-local"
                  value={scheduleDraft.endAt}
                />
              </label>
              <label>
                <span className={labelClass}>프로그램명</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setScheduleDraft({ ...scheduleDraft, title: event.target.value })
                  }
                  value={scheduleDraft.title}
                />
              </label>
              <label>
                <span className={labelClass}>구분</span>
                <select
                  className={fieldClass}
                  onChange={(event) =>
                    setScheduleDraft({
                      ...scheduleDraft,
                      category: event.target.value as ScheduleCategory,
                    })
                  }
                  value={scheduleDraft.category}
                >
                  {Object.entries(scheduleCategoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={labelClass}>장소명</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setScheduleDraft({ ...scheduleDraft, location: event.target.value })
                  }
                  value={scheduleDraft.location}
                />
              </label>
              <label>
                <span className={labelClass}>지도 장소 연결</span>
                <select
                  className={fieldClass}
                  onChange={(event) =>
                    setScheduleDraft({ ...scheduleDraft, locationId: event.target.value })
                  }
                  value={scheduleDraft.locationId}
                >
                  <option value="">연결 없음</option>
                  {selectedGuide.map.locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="md:col-span-2">
                <span className={labelClass}>설명</span>
                <textarea
                  className={fieldClass}
                  onChange={(event) =>
                    setScheduleDraft({ ...scheduleDraft, description: event.target.value })
                  }
                  rows={3}
                  value={scheduleDraft.description}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button onClick={closeScheduleAddModal} variant="secondary">
                취소
              </Button>
              <Button
                disabled={!scheduleDraft.title.trim() || !scheduleDraft.startAt || !scheduleDraft.endAt}
                icon={<Plus className="h-4 w-4" />}
                type="submit"
              >
                저장
              </Button>
            </div>
          </form>
        </AdminModal>
      ) : null}

      {isEventAddModalOpen ? (
        <AdminModal
          title="이벤트 추가"
          description="기존 템플릿 기반으로 이벤트를 추가합니다."
          onClose={() => {
            setEventTitle("");
            setEventTemplateId("activity");
            setEventRequiresTeamAssignment(eventTemplateRequiresTeamAssignment.activity);
            setEventStatus("waiting");
            setIsEventAddModalOpen(false);
          }}
        >
          <form className="space-y-4" onSubmit={handleAddEvent}>
            <label className="block">
              <span className={labelClass}>이벤트명</span>
              <input
                className={fieldClass}
                onChange={(event) => setEventTitle(event.target.value)}
                placeholder="비워두면 템플릿 이름을 사용합니다."
                value={eventTitle}
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className={labelClass}>템플릿</span>
                <select
                  className={fieldClass}
                  onChange={(event) => {
                    const nextTemplateId = event.target.value as EventTemplateId;
                    setEventTemplateId(nextTemplateId);
                    setEventRequiresTeamAssignment(
                      eventTemplateRequiresTeamAssignment[nextTemplateId],
                    );
                  }}
                  value={eventTemplateId}
                >
                  <option value="activity">액티비티 사전 설문</option>
                  <option value="bowling">볼링 대회 레벨 테스트</option>
                </select>
              </label>
              <label>
                <span className={labelClass}>상태</span>
                <select
                  className={fieldClass}
                  onChange={(event) => setEventStatus(event.target.value as EventStatus)}
                  value={eventStatus}
                >
                  {Object.entries(eventStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block rounded-lg bg-gray-50 p-3">
              <span className="inline-flex min-h-6 items-center gap-2 text-sm font-semibold text-gray-700">
                <input
                  checked={eventRequiresTeamAssignment}
                  className="h-4 w-4 accent-brand-700"
                  onChange={(event) => setEventRequiresTeamAssignment(event.target.checked)}
                  type="checkbox"
                />
                조 배치 사용
              </span>
              <span className="mt-1 block text-xs leading-5 text-gray-500">
                체크하면 응답자를 조별로 배정하고 참가자가 자기 조를 확인할 수 있습니다.
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                onClick={() => {
                  setEventTitle("");
                  setEventTemplateId("activity");
                  setEventRequiresTeamAssignment(eventTemplateRequiresTeamAssignment.activity);
                  setEventStatus("waiting");
                  setIsEventAddModalOpen(false);
                }}
                variant="secondary"
              >
                취소
              </Button>
              <Button icon={<Plus className="h-4 w-4" />} type="submit">
                저장
              </Button>
            </div>
          </form>
        </AdminModal>
      ) : null}

      {isRecommendationAddModalOpen ? (
        <AdminModal
          title="추천 코스 추가"
          description="참가자 추천 탭에 보일 코스를 추가합니다."
          onClose={() => {
            resetRecommendationDraft();
            setIsRecommendationAddModalOpen(false);
          }}
        >
          <form className="space-y-4" onSubmit={handleAddRecommendation}>
            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className={labelClass}>코스명</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setRecommendationDraft({
                      ...recommendationDraft,
                      title: event.target.value,
                    })
                  }
                  value={recommendationDraft.title}
                />
              </label>
              <label>
                <span className={labelClass}>관련 장소</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setRecommendationDraft({
                      ...recommendationDraft,
                      locationLabel: event.target.value,
                    })
                  }
                  value={recommendationDraft.locationLabel}
                />
              </label>
              <label>
                <span className={labelClass}>태그/소요시간</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setRecommendationDraft({
                      ...recommendationDraft,
                      category: event.target.value,
                    })
                  }
                  value={recommendationDraft.category}
                />
              </label>
              <label>
                <span className={labelClass}>이미지</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setRecommendationDraft({
                      ...recommendationDraft,
                      imageUrl: event.target.value,
                    })
                  }
                  value={recommendationDraft.imageUrl}
                />
              </label>
              <label className="md:col-span-2">
                <span className={labelClass}>설명</span>
                <textarea
                  className={fieldClass}
                  onChange={(event) =>
                    setRecommendationDraft({
                      ...recommendationDraft,
                      description: event.target.value,
                    })
                  }
                  rows={4}
                  value={recommendationDraft.description}
                />
              </label>
            </div>
            <label className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gray-100 px-3 text-sm font-semibold text-gray-700">
              <input
                checked={recommendationDraft.isVisible}
                onChange={(event) =>
                  setRecommendationDraft({
                    ...recommendationDraft,
                    isVisible: event.target.checked,
                  })
                }
                type="checkbox"
              />
              노출
            </label>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                onClick={() => {
                  resetRecommendationDraft();
                  setIsRecommendationAddModalOpen(false);
                }}
                variant="secondary"
              >
                취소
              </Button>
              <Button disabled={!recommendationDraft.title.trim()} icon={<Plus className="h-4 w-4" />} type="submit">
                저장
              </Button>
            </div>
          </form>
        </AdminModal>
      ) : null}

      {locationEditDraft ? (
        <AdminModal
          title="장소 수정"
          description="지도 필터와 일정 연결에 쓰이는 장소 정보입니다."
          onClose={() => setLocationEditDraft(null)}
        >
          <form className="space-y-4" onSubmit={handleSaveLocationEdit}>
            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className={labelClass}>장소명</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setLocationEditDraft({ ...locationEditDraft, name: event.target.value })
                  }
                  value={locationEditDraft.name}
                />
              </label>
              <label>
                <span className={labelClass}>카테고리</span>
                <select
                  className={fieldClass}
                  onChange={(event) =>
                    setLocationEditDraft({
                      ...locationEditDraft,
                      category: event.target.value as MapLocationCategory,
                    })
                  }
                  value={locationEditDraft.category}
                >
                  {Object.entries(mapLocationCategoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="md:col-span-2">
                <span className={labelClass}>설명</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setLocationEditDraft({
                      ...locationEditDraft,
                      description: event.target.value,
                    })
                  }
                  value={locationEditDraft.description}
                />
              </label>
              <label>
                <span className={labelClass}>X 좌표</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setLocationEditDraft({ ...locationEditDraft, xPercent: event.target.value })
                  }
                  type="number"
                  value={locationEditDraft.xPercent}
                />
              </label>
              <label>
                <span className={labelClass}>Y 좌표</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setLocationEditDraft({ ...locationEditDraft, yPercent: event.target.value })
                  }
                  type="number"
                  value={locationEditDraft.yPercent}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gray-100 px-3 text-sm font-semibold text-gray-700">
                <input
                  checked={locationEditDraft.isWorkshopLocation}
                  onChange={(event) =>
                    setLocationEditDraft({
                      ...locationEditDraft,
                      isWorkshopLocation: event.target.checked,
                    })
                  }
                  type="checkbox"
                />
                워크숍 사용 장소
              </label>
              <label className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gray-100 px-3 text-sm font-semibold text-gray-700">
                <input
                  checked={locationEditDraft.isSmokingArea}
                  onChange={(event) =>
                    setLocationEditDraft({
                      ...locationEditDraft,
                      isSmokingArea: event.target.checked,
                    })
                  }
                  type="checkbox"
                />
                흡연구역
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button onClick={() => setLocationEditDraft(null)} variant="secondary">
                취소
              </Button>
              <Button icon={<Check className="h-4 w-4" />} type="submit">
                저장
              </Button>
            </div>
          </form>
        </AdminModal>
      ) : null}

      {scheduleEditDraft ? (
        <AdminModal
          title="일정 수정"
          description="시간, 장소 연결, 구분 정보를 수정합니다."
          onClose={() => setScheduleEditDraft(null)}
        >
          <form className="space-y-4" onSubmit={handleSaveScheduleEdit}>
            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className={labelClass}>시작</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setScheduleEditDraft({ ...scheduleEditDraft, startAt: event.target.value })
                  }
                  type="datetime-local"
                  value={scheduleEditDraft.startAt}
                />
              </label>
              <label>
                <span className={labelClass}>종료</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setScheduleEditDraft({ ...scheduleEditDraft, endAt: event.target.value })
                  }
                  type="datetime-local"
                  value={scheduleEditDraft.endAt}
                />
              </label>
              <label>
                <span className={labelClass}>프로그램명</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setScheduleEditDraft({ ...scheduleEditDraft, title: event.target.value })
                  }
                  value={scheduleEditDraft.title}
                />
              </label>
              <label>
                <span className={labelClass}>구분</span>
                <select
                  className={fieldClass}
                  onChange={(event) =>
                    setScheduleEditDraft({
                      ...scheduleEditDraft,
                      category: event.target.value as ScheduleCategory,
                    })
                  }
                  value={scheduleEditDraft.category}
                >
                  {Object.entries(scheduleCategoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={labelClass}>장소명</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setScheduleEditDraft({ ...scheduleEditDraft, location: event.target.value })
                  }
                  value={scheduleEditDraft.location}
                />
              </label>
              <label>
                <span className={labelClass}>지도 장소 연결</span>
                <select
                  className={fieldClass}
                  onChange={(event) =>
                    setScheduleEditDraft({ ...scheduleEditDraft, locationId: event.target.value })
                  }
                  value={scheduleEditDraft.locationId}
                >
                  <option value="">연결 없음</option>
                  {selectedGuide.map.locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="md:col-span-2">
                <span className={labelClass}>설명</span>
                <textarea
                  className={fieldClass}
                  onChange={(event) =>
                    setScheduleEditDraft({
                      ...scheduleEditDraft,
                      description: event.target.value,
                    })
                  }
                  rows={3}
                  value={scheduleEditDraft.description}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button onClick={() => setScheduleEditDraft(null)} variant="secondary">
                취소
              </Button>
              <Button icon={<Check className="h-4 w-4" />} type="submit">
                저장
              </Button>
            </div>
          </form>
        </AdminModal>
      ) : null}

      {recommendationEditDraft ? (
        <AdminModal
          title="추천 코스 수정"
          description="참가자 추천 탭에 보이는 코스 정보입니다."
          onClose={() => setRecommendationEditDraft(null)}
        >
          <form className="space-y-4" onSubmit={handleSaveRecommendationEdit}>
            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className={labelClass}>코스명</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setRecommendationEditDraft({
                      ...recommendationEditDraft,
                      title: event.target.value,
                    })
                  }
                  value={recommendationEditDraft.title}
                />
              </label>
              <label>
                <span className={labelClass}>관련 장소</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setRecommendationEditDraft({
                      ...recommendationEditDraft,
                      locationLabel: event.target.value,
                    })
                  }
                  value={recommendationEditDraft.locationLabel}
                />
              </label>
              <label>
                <span className={labelClass}>태그/소요시간</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setRecommendationEditDraft({
                      ...recommendationEditDraft,
                      category: event.target.value,
                    })
                  }
                  value={recommendationEditDraft.category}
                />
              </label>
              <label>
                <span className={labelClass}>이미지</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setRecommendationEditDraft({
                      ...recommendationEditDraft,
                      imageUrl: event.target.value,
                    })
                  }
                  value={recommendationEditDraft.imageUrl}
                />
              </label>
              <label className="md:col-span-2">
                <span className={labelClass}>설명</span>
                <textarea
                  className={fieldClass}
                  onChange={(event) =>
                    setRecommendationEditDraft({
                      ...recommendationEditDraft,
                      description: event.target.value,
                    })
                  }
                  rows={4}
                  value={recommendationEditDraft.description}
                />
              </label>
            </div>
            <label className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gray-100 px-3 text-sm font-semibold text-gray-700">
              <input
                checked={recommendationEditDraft.isVisible}
                onChange={(event) =>
                  setRecommendationEditDraft({
                    ...recommendationEditDraft,
                    isVisible: event.target.checked,
                  })
                }
                type="checkbox"
              />
              노출
            </label>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button onClick={() => setRecommendationEditDraft(null)} variant="secondary">
                취소
              </Button>
              <Button icon={<Check className="h-4 w-4" />} type="submit">
                저장
              </Button>
            </div>
          </form>
        </AdminModal>
      ) : null}

      {eventEditDraft ? (
        <AdminModal
          title="이벤트 수정"
          description="이벤트 기본 정보만 수정합니다. 설문과 조 배치 관리는 기존 패널에서 유지됩니다."
          onClose={() => setEventEditDraft(null)}
        >
          <form className="space-y-4" onSubmit={handleSaveEventEdit}>
            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className={labelClass}>이벤트명</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setEventEditDraft({ ...eventEditDraft, title: event.target.value })
                  }
                  value={eventEditDraft.title}
                />
              </label>
              <label>
                <span className={labelClass}>상태</span>
                <select
                  className={fieldClass}
                  onChange={(event) =>
                    setEventEditDraft({
                      ...eventEditDraft,
                      status: event.target.value as EventStatus,
                    })
                  }
                  value={eventEditDraft.status}
                >
                  {Object.entries(eventStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={labelClass}>오픈</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setEventEditDraft({ ...eventEditDraft, opensAt: event.target.value })
                  }
                  type="datetime-local"
                  value={eventEditDraft.opensAt}
                />
              </label>
              <label>
                <span className={labelClass}>종료</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setEventEditDraft({ ...eventEditDraft, closesAt: event.target.value })
                  }
                  type="datetime-local"
                  value={eventEditDraft.closesAt}
                />
              </label>
              <label className="md:col-span-2">
                <span className={labelClass}>설명</span>
                <textarea
                  className={fieldClass}
                  onChange={(event) =>
                    setEventEditDraft({ ...eventEditDraft, description: event.target.value })
                  }
                  rows={3}
                  value={eventEditDraft.description}
                />
              </label>
              <label>
                <span className={labelClass}>관리자 메모</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setEventEditDraft({ ...eventEditDraft, resultSummary: event.target.value })
                  }
                  value={eventEditDraft.resultSummary}
                />
              </label>
              <label className="md:col-span-2">
                <span className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-gray-700">
                  <input
                    checked={eventEditDraft.requiresTeamAssignment}
                    className="h-4 w-4 accent-brand-700"
                    onChange={(event) =>
                      setEventEditDraft({
                        ...eventEditDraft,
                        requiresTeamAssignment: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                  조 배치 사용
                </span>
                <span className="block text-xs leading-5 text-gray-500">
                  체크하면 응답자를 조별로 배정하고 참가자가 자기 조를 확인할 수 있습니다.
                </span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button onClick={() => setEventEditDraft(null)} variant="secondary">
                취소
              </Button>
              <Button icon={<Check className="h-4 w-4" />} type="submit">
                저장
              </Button>
            </div>
          </form>
        </AdminModal>
      ) : null}

      {surveyManageEvent ? (
        <AdminModal
          title="설문 문항 관리"
          description={surveyManageEvent.title}
          onClose={() => setSurveyManageEventId(undefined)}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-600">
                  문항 {surveyManageEvent.survey.length}개
                </p>
              </div>
              <Button
                className="shrink-0"
                icon={<Plus className="h-4 w-4" />}
                onClick={() =>
                  addSurveyQuestion(selectedGuide.id, surveyManageEvent.id, createQuestion())
                }
                variant="secondary"
              >
                문항 추가
              </Button>
            </div>

            <div className="space-y-3">
              {surveyManageEvent.survey.length > 0 ? (
                surveyManageEvent.survey.map((question, questionIndex) => (
                  <section
                    className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                    key={question.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-gray-600 ring-1 ring-gray-200">
                        #{questionIndex + 1}
                      </span>
                      <div className="flex gap-1">
                        <button
                          aria-label="위로"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                          disabled={questionIndex === 0}
                          onClick={() =>
                            moveSurveyQuestion(
                              selectedGuide.id,
                              surveyManageEvent.id,
                              question.id,
                              "up",
                            )
                          }
                          type="button"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="아래로"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                          disabled={questionIndex === surveyManageEvent.survey.length - 1}
                          onClick={() =>
                            moveSurveyQuestion(
                              selectedGuide.id,
                              surveyManageEvent.id,
                              question.id,
                              "down",
                            )
                          }
                          type="button"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-[10rem_minmax(0,1fr)]">
                      <label>
                        <span className={labelClass}>타입</span>
                        <select
                          className={fieldClass}
                          onChange={(selectEvent) =>
                            updateSurveyQuestion(
                              selectedGuide.id,
                              surveyManageEvent.id,
                              question.id,
                              {
                                type: selectEvent.target.value as SurveyQuestionType,
                              },
                            )
                          }
                          value={question.type}
                        >
                          {Object.entries(surveyTypeLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span className={labelClass}>문항</span>
                        <input
                          className={fieldClass}
                          onChange={(inputEvent) =>
                            updateSurveyQuestion(
                              selectedGuide.id,
                              surveyManageEvent.id,
                              question.id,
                              { label: inputEvent.target.value },
                            )
                          }
                          value={question.label}
                        />
                      </label>
                      <label className="md:col-span-2">
                        <span className={labelClass}>문항 설명</span>
                        <input
                          className={fieldClass}
                          onChange={(inputEvent) =>
                            updateSurveyQuestion(
                              selectedGuide.id,
                              surveyManageEvent.id,
                              question.id,
                              { description: inputEvent.target.value },
                            )
                          }
                          value={question.description ?? ""}
                        />
                      </label>
                    </div>

                    {question.type === "singleChoice" ||
                    question.type === "multipleChoice" ? (
                      <label className="mt-3 block">
                        <span className={labelClass}>선택지</span>
                        <input
                          className={fieldClass}
                          onChange={(inputEvent) =>
                            updateSurveyQuestion(
                              selectedGuide.id,
                              surveyManageEvent.id,
                              question.id,
                              {
                                options: inputEvent.target.value
                                  .split(",")
                                  .map((option) => option.trim())
                                  .filter(Boolean),
                              },
                            )
                          }
                          placeholder="옵션을 쉼표로 구분"
                          value={question.options?.join(", ") ?? ""}
                        />
                      </label>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <label className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-gray-700 ring-1 ring-gray-200">
                        <input
                          checked={question.required ?? false}
                          className="h-4 w-4 accent-brand-700"
                          onChange={(inputEvent) =>
                            updateSurveyQuestion(
                              selectedGuide.id,
                              surveyManageEvent.id,
                              question.id,
                              { required: inputEvent.target.checked },
                            )
                          }
                          type="checkbox"
                        />
                        필수
                      </label>
                      <Button
                        icon={<Trash2 className="h-4 w-4" />}
                        onClick={() => {
                          if (!window.confirm("이 문항을 삭제하시겠습니까?")) {
                            return;
                          }

                          deleteSurveyQuestion(selectedGuide.id, surveyManageEvent.id, question.id);
                        }}
                        variant="danger"
                      >
                        삭제
                      </Button>
                    </div>
                  </section>
                ))
              ) : (
                <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                  등록된 문항이 없습니다. 문항 추가를 눌러 시작해 주세요.
                </p>
              )}
            </div>
          </div>
        </AdminModal>
      ) : null}

      {responseManageEvent ? (
        <AdminModal
          title="응답/조배치 관리"
          description={responseManageEvent.title}
          onClose={closeResponseManageModal}
        >
          {(() => {
            const groupDraft = groupDrafts[responseManageEvent.id] ?? {
              teamName: "",
              membersText: "",
              memo: "",
            };

            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1 text-sm font-bold">
                  <button
                    className={cn(
                      "min-h-9 rounded-md px-3 transition",
                      responseManageTab === "summary"
                        ? "bg-white text-gray-950 shadow-sm"
                        : "text-gray-600",
                    )}
                    onClick={() => {
                      setResponseManageTab("summary");
                      setResponseSummaryOpenKey(undefined);
                    }}
                    type="button"
                  >
                    요약
                  </button>
                  <button
                    className={cn(
                      "min-h-9 rounded-md px-3 transition",
                      responseManageTab === "responses"
                        ? "bg-white text-gray-950 shadow-sm"
                        : "text-gray-600",
                    )}
                    onClick={() => setResponseManageTab("responses")}
                    type="button"
                  >
                    응답 목록
                  </button>
                  {responseManageEvent.requiresTeamAssignment ? (
                    <button
                      className={cn(
                        "col-span-2 min-h-9 rounded-md px-3 transition",
                        responseManageTab === "teams"
                          ? "bg-white text-gray-950 shadow-sm"
                          : "text-gray-600",
                      )}
                      onClick={() => setResponseManageTab("teams")}
                      type="button"
                    >
                      조 배치
                    </button>
                  ) : null}
                </div>

                {!responseManageEvent.requiresTeamAssignment ? (
                  <section className="rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-600">
                    이 이벤트는 조 배치가 필요 없는 설문입니다.
                  </section>
                ) : null}

                {responseManageTab === "summary" ? (
                  <section>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-gray-950">설문 결과 요약</h3>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                        응답 {responseManageEventResponses.length}개
                      </span>
                    </div>

                    <div className="mt-3 space-y-3">
                      {responseManageEvent.survey.length > 0 ? (
                        responseManageEvent.survey.map((question, questionIndex) => {
                          if (question.type === "description") {
                            return (
                              <section
                                className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                                key={question.id}
                              >
                                <p className="text-xs font-bold text-gray-500">
                                  #{questionIndex + 1} 안내 문항
                                </p>
                                <p className="mt-1 font-bold text-gray-950">{question.label}</p>
                              </section>
                            );
                          }

                          if (
                            question.type === "singleChoice" ||
                            question.type === "multipleChoice"
                          ) {
                            const choiceSummary = getChoiceResponseSummary(
                              question,
                              responseManageEventResponses,
                            );

                            return (
                              <section
                                className="rounded-lg border border-gray-200 bg-white p-3"
                                key={question.id}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-brand-700">
                                      #{questionIndex + 1} {surveyTypeLabels[question.type]}
                                    </p>
                                    <h4 className="mt-1 break-words font-bold text-gray-950">
                                      {question.label}
                                    </h4>
                                  </div>
                                </div>
                                <div className="mt-3 space-y-2">
                                  {choiceSummary.length > 0 ? (
                                    choiceSummary.map(({ option, participantNames }) => {
                                      const summaryKey = `${responseManageEvent.id}:${question.id}:${option}`;
                                      const isOpen = responseSummaryOpenKey === summaryKey;

                                      return (
                                        <div
                                          className="rounded-lg border border-gray-100 bg-gray-50 p-2"
                                          key={option}
                                        >
                                          <button
                                            className="flex min-h-9 w-full items-center justify-between gap-2 text-left"
                                            onClick={() =>
                                              setResponseSummaryOpenKey(
                                                isOpen ? undefined : summaryKey,
                                              )
                                            }
                                            type="button"
                                          >
                                            <span className="min-w-0 break-words text-sm font-bold text-gray-950">
                                              {option} {participantNames.length}명
                                            </span>
                                            <span className="shrink-0 text-xs font-bold text-brand-700">
                                              {isOpen ? "접기" : "보기"}
                                            </span>
                                          </button>
                                          {isOpen ? (
                                            <div className="mt-2 flex flex-wrap gap-1.5 border-t border-gray-200 pt-2">
                                              {participantNames.length > 0 ? (
                                                participantNames.map((participantName) => (
                                                  <span
                                                    className="max-w-full break-words rounded-full bg-white px-2 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200"
                                                    key={participantName}
                                                  >
                                                    {participantName}
                                                  </span>
                                                ))
                                              ) : (
                                                <p className="text-xs text-gray-500">
                                                  선택한 응답자가 없습니다.
                                                </p>
                                              )}
                                            </div>
                                          ) : null}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
                                      선택지가 없습니다.
                                    </p>
                                  )}
                                </div>
                              </section>
                            );
                          }

                          const textSummary = getShortTextResponseSummary(
                            question,
                            responseManageEventResponses,
                          );

                          return (
                            <section
                              className="rounded-lg border border-gray-200 bg-white p-3"
                              key={question.id}
                            >
                              <p className="text-xs font-bold text-brand-700">
                                #{questionIndex + 1} {surveyTypeLabels[question.type]}
                              </p>
                              <h4 className="mt-1 break-words font-bold text-gray-950">
                                {question.label}
                              </h4>
                              <div className="mt-3 space-y-2">
                                {textSummary.length > 0 ? (
                                  textSummary.map((item) => (
                                    <p
                                      className="break-words rounded-lg bg-gray-50 p-2 text-sm leading-5 text-gray-600"
                                      key={`${question.id}:${item.participantName}`}
                                    >
                                      <span className="font-bold text-gray-950">
                                        {item.participantName}:
                                      </span>{" "}
                                      {item.answerText}
                                    </p>
                                  ))
                                ) : (
                                  <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
                                    저장된 단답형 응답이 없습니다.
                                  </p>
                                )}
                              </div>
                            </section>
                          );
                        })
                      ) : (
                        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
                          등록된 설문 문항이 없습니다.
                        </p>
                      )}
                    </div>
                  </section>
                ) : null}

                {responseManageTab === "responses" ? (
                  <section>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold text-gray-950">응답 목록</h3>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                      응답 {responseManageEventResponses.length}개
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {responseManageEventResponses.length > 0 ? (
                      responseManageEventResponses.map((response) => {
                        const assignedTeam = getEventResponseTeam(responseManageEvent, response);

                        return (
                          <section
                            className="rounded-lg border border-gray-200 bg-white p-3"
                            key={response.id}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="font-bold text-gray-950">
                                  {response.participantName}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-gray-500">
                                  {new Date(response.submittedAt).toLocaleString("ko-KR")}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-xs font-bold",
                                  responseManageEvent.requiresTeamAssignment
                                    ? assignedTeam
                                      ? "bg-brand-50 text-brand-700"
                                      : "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-600",
                                )}
                              >
                                {getTeamAssignmentLabel(responseManageEvent, response)}
                              </span>
                            </div>

                            <div className="mt-3 space-y-2 text-sm leading-5 text-gray-600">
                              {Object.entries(response.answers).length > 0 ? (
                                Object.entries(response.answers).map(([questionId, answer]) => {
                                  const question = responseManageEvent.survey.find(
                                    (item) => item.id === questionId,
                                  );

                                  return (
                                    <p key={questionId}>
                                      <span className="font-semibold text-gray-950">
                                        {question?.label ?? questionId}:
                                      </span>{" "}
                                      {formatAnswerValue(answer)}
                                    </p>
                                  );
                                })
                              ) : (
                                <p className="text-gray-500">저장된 답변이 없습니다.</p>
                              )}
                            </div>

                            {responseManageEvent.requiresTeamAssignment ? (
                              <label className="mt-3 block">
                                <span className={labelClass}>조 선택</span>
                                <select
                                  className={fieldClass}
                                  onChange={(selectEvent) =>
                                    assignEventResponseTeam(
                                      selectedGuide.id,
                                      responseManageEvent.id,
                                      response.participantName,
                                      selectEvent.target.value || undefined,
                                    )
                                  }
                                  value={assignedTeam?.id ?? ""}
                                >
                                  <option value="">미배정</option>
                                  {responseManageEvent.teams.map((team) => (
                                    <option key={team.id} value={team.id}>
                                      {team.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ) : null}
                          </section>
                        );
                      })
                    ) : (
                      <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500 lg:col-span-2">
                        이 이벤트에 저장된 응답이 없습니다.
                      </p>
                    )}
                  </div>
                </section>
                ) : null}

                {responseManageEvent.requiresTeamAssignment && responseManageTab === "teams" ? (
                  <section className="border-t border-gray-100 pt-4">
                    <h3 className="font-bold text-gray-950">조 배치 관리</h3>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <input
                        className={compactFieldClass}
                        onChange={(inputEvent) =>
                          setGroupDrafts({
                            ...groupDrafts,
                            [responseManageEvent.id]: {
                              ...groupDraft,
                              teamName: inputEvent.target.value,
                            },
                          })
                        }
                        placeholder="조 이름"
                        value={groupDraft.teamName}
                      />
                      <input
                        className={compactFieldClass}
                        onChange={(inputEvent) =>
                          setGroupDrafts({
                            ...groupDrafts,
                            [responseManageEvent.id]: {
                              ...groupDraft,
                              memo: inputEvent.target.value,
                            },
                          })
                        }
                        placeholder="메모"
                        value={groupDraft.memo}
                      />
                      <input
                        className={compactFieldClass}
                        onChange={(inputEvent) =>
                          setGroupDrafts({
                            ...groupDrafts,
                            [responseManageEvent.id]: {
                              ...groupDraft,
                              membersText: inputEvent.target.value,
                            },
                          })
                        }
                        placeholder="참가자명을 쉼표로 구분"
                        value={groupDraft.membersText}
                      />
                      <Button
                        onClick={() => {
                          if (!groupDraft.teamName.trim()) {
                            return;
                          }

                          addEventTeam(selectedGuide.id, responseManageEvent.id, {
                            id: createId("team"),
                            eventId: responseManageEvent.id,
                            name: groupDraft.teamName.trim(),
                            members: groupDraft.membersText
                              .split(",")
                              .map((member) => member.trim())
                              .filter(Boolean),
                            memo: groupDraft.memo.trim(),
                          });
                          setGroupDrafts({
                            ...groupDrafts,
                            [responseManageEvent.id]: {
                              teamName: "",
                              membersText: "",
                              memo: "",
                            },
                          });
                        }}
                        variant="secondary"
                      >
                        조 추가
                      </Button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {responseManageEvent.teams.length > 0 ? (
                        responseManageEvent.teams.map((team) => (
                          <section
                            className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                            key={team.id}
                          >
                            <div className="grid gap-2 md:grid-cols-2">
                              <label>
                                <span className={labelClass}>조 이름</span>
                                <input
                                  className={fieldClass}
                                  onChange={(inputEvent) =>
                                    updateEventTeam(
                                      selectedGuide.id,
                                      responseManageEvent.id,
                                      team.id,
                                      { name: inputEvent.target.value },
                                    )
                                  }
                                  value={team.name}
                                />
                              </label>
                              <label>
                                <span className={labelClass}>메모</span>
                                <input
                                  className={fieldClass}
                                  onChange={(inputEvent) =>
                                    updateEventTeam(
                                      selectedGuide.id,
                                      responseManageEvent.id,
                                      team.id,
                                      { memo: inputEvent.target.value },
                                    )
                                  }
                                  value={team.memo ?? ""}
                                />
                              </label>
                              <label className="md:col-span-2">
                                <span className={labelClass}>참가자</span>
                                <input
                                  className={fieldClass}
                                  onChange={(inputEvent) =>
                                    updateEventTeam(
                                      selectedGuide.id,
                                      responseManageEvent.id,
                                      team.id,
                                      {
                                        members: inputEvent.target.value
                                          .split(",")
                                          .map((member) => member.trim())
                                          .filter(Boolean),
                                      },
                                    )
                                  }
                                  value={team.members.join(", ")}
                                />
                              </label>
                            </div>
                            <div className="mt-3 flex justify-end">
                              <Button
                                icon={<Trash2 className="h-4 w-4" />}
                                onClick={() =>
                                  deleteEventTeam(selectedGuide.id, responseManageEvent.id, team.id)
                                }
                                variant="danger"
                              >
                                삭제
                              </Button>
                            </div>
                          </section>
                        ))
                      ) : (
                        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
                          생성된 조가 없습니다.
                        </p>
                      )}
                    </div>
                  </section>
                ) : null}
              </div>
            );
          })()}
        </AdminModal>
      ) : null}

    </section>
  );
};
