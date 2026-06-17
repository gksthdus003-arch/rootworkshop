import { FormEvent, ReactNode, useEffect, useState } from "react";
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
  EventKind,
  EventPhase,
  EventSurveyResponse,
  EventStatus,
  EventType,
  MapLocationCategory,
  MapLocation,
  RecommendationItem,
  SurveyKind,
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

type EventTemplateId = "activitySurvey" | "bowlingLevelSurvey" | "bowlingEvent";
type ResponseManageTab = "summary" | "responses" | "teams";

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

const eventTypeLabels: Record<EventType, string> = {
  survey: "설문형",
  event: "이벤트형",
};

const eventPhaseLabels: Record<EventPhase, string> = {
  preSurvey: "사전 설문 단계",
  scoreInput: "점수 입력 단계",
  result: "결과 공개 단계",
};

const getEventTemplateDefaults = (templateId: EventTemplateId) => {
  if (templateId === "bowlingEvent") {
    return {
      type: "event" as EventType,
      showInEventList: true,
      requiresTeamAssignment: true,
    };
  }

  if (templateId === "bowlingLevelSurvey") {
    return {
      type: "survey" as EventType,
      showInEventList: false,
      requiresTeamAssignment: true,
    };
  }

  return {
    type: "survey" as EventType,
    showInEventList: true,
    requiresTeamAssignment: true,
  };
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
  <AdminModalFrame title={title} description={description} onClose={onClose}>
    {children}
  </AdminModalFrame>
);

const AdminModalFrame = ({ title, description, children, onClose }: AdminModalProps) => {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden overscroll-contain bg-gray-950/45 px-3 py-4 sm:items-center"
      onTouchMove={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
    <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden overscroll-contain rounded-lg bg-white shadow-2xl">
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
      <div
        className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4"
        onTouchMove={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  </div>
  );
};

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
  type: EventType;
  surveyKind: SurveyKind;
  eventKind: EventKind;
  showInEventList: boolean;
  linkedSurveyId: string;
  phase: EventPhase;
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

const formatAnswerValue = (value: string | string[] | number) =>
  Array.isArray(value) ? value.join(", ") : String(value);

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
    const selectedOptions = Array.isArray(answer)
      ? answer
      : answer !== undefined && answer !== ""
        ? [String(answer)]
        : [];

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
      const answerText = Array.isArray(answer) ? answer.join(", ") : answer !== undefined ? String(answer) : "";

      return {
        participantName: response.participantName,
        answerText: answerText.trim(),
      };
    })
    .filter((item) => item.answerText.length > 0);

const getNumericResponseAnswer = (response: EventSurveyResponse, key: string) => {
  const value = response.answers[key];
  const textValue = Array.isArray(value) ? value[0] : value;
  const numberValue = Number(textValue);

  return Number.isFinite(numberValue) && textValue !== "" ? numberValue : undefined;
};

const getResponseAnswerByKeyOrLabel = (
  event: EventItem | undefined,
  response: EventSurveyResponse,
  key: string,
  labelKeywords: string[],
) => {
  const directValue = response.answers[key];

  if (directValue !== undefined) {
    return directValue;
  }

  const matchedQuestion = event?.survey.find((question) =>
    labelKeywords.some((keyword) => question.label.includes(keyword)),
  );

  return matchedQuestion ? response.answers[matchedQuestion.id] : undefined;
};

const getParticipantScoreTotal = (response: EventSurveyResponse) =>
  (getNumericResponseAnswer(response, "game1Score") ?? 0) +
  (getNumericResponseAnswer(response, "game2Score") ?? 0);

const formatTargetDiff = (score: number | undefined, targetScore: number | undefined) => {
  if (score === undefined || targetScore === undefined) {
    return "-";
  }

  const diff = score - targetScore;

  return `목표보다 ${diff > 0 ? `+${diff}` : String(diff)}`;
};

const getNormalizedParticipantName = (name: string | undefined) => name?.trim() ?? "";

const isSameParticipantResponse = (left: EventSurveyResponse, right: EventSurveyResponse) => {
  if (left.participantId && right.participantId) {
    return left.participantId === right.participantId;
  }

  return (
    getNormalizedParticipantName(left.participantName) !== "" &&
    getNormalizedParticipantName(left.participantName) ===
      getNormalizedParticipantName(right.participantName)
  );
};

const findParticipantResponse = (
  responses: EventSurveyResponse[],
  participantResponse: EventSurveyResponse,
) => responses.find((response) => isSameParticipantResponse(response, participantResponse));

const getBowlingTeamRankings = (
  teamSourceEvent: EventItem,
  scoreResponses: EventSurveyResponse[],
  teamResponses: EventSurveyResponse[] = scoreResponses,
) =>
  teamSourceEvent.teams
    .map((team, index) => {
      const teamScoreResponses = scoreResponses.filter((scoreResponse) => {
        const teamResponse = findParticipantResponse(teamResponses, scoreResponse);
        const responseName = getNormalizedParticipantName(
          teamResponse?.participantName ?? scoreResponse.participantName,
        );

        return (
          teamResponse?.assignedTeamId === team.id ||
          scoreResponse.assignedTeamId === team.id ||
          team.members.some((member) => member.trim() === responseName)
        );
      });

      return {
        team,
        index,
        totalScore: teamScoreResponses.reduce(
          (sum, response) => sum + getParticipantScoreTotal(response),
          0,
        ),
        submittedCount: teamScoreResponses.filter(
          (response) =>
            getNumericResponseAnswer(response, "game1Score") !== undefined ||
            getNumericResponseAnswer(response, "game2Score") !== undefined,
        ).length,
      };
    })
    .sort((left, right) => right.totalScore - left.totalScore || left.index - right.index);

const createEventFromTemplate = (
  templateId: EventTemplateId,
  workshopId: string,
  title: string,
  status: EventStatus,
): EventItem => {
  const now = new Date();
  const closesAt = new Date(now.getTime() + 60 * 60 * 1000);

  if (templateId === "bowlingLevelSurvey") {
    return {
      id: createId("event"),
      workshopId,
      title: title || "볼링 대회 레벨 테스트",
      description: "공정한 조 편성을 위해 볼링 경험을 확인합니다.",
      type: "survey",
      surveyKind: "bowlingLevel",
      showInEventList: false,
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
        {
          id: createId("question"),
          type: "singleChoice",
          label: "최근 1년 내 볼링 경험이 있나요?",
          required: true,
          options: ["거의 없음", "가끔 있음", "자주 있음"],
        },
        {
          id: createId("question"),
          type: "singleChoice",
          label: "커브 또는 스핀 구사가 가능한가요?",
          required: true,
          options: ["아니요", "조금 가능", "가능"],
        },
        {
          id: createId("question"),
          type: "shortText",
          label: "이번 볼링 목표 점수를 숫자로 입력해 주세요.",
          required: true,
        },
      ],
      teams: [],
    };
  }

  if (templateId === "bowlingEvent") {
    return {
      id: createId("event"),
      workshopId,
      title: title || "대표님배 볼링대회",
      description: "목표 점수와 실제 점수로 팀 순위를 확인합니다.",
      type: "event",
      eventKind: "bowling",
      showInEventList: true,
      phase: "preSurvey",
      status,
      opensAt: now.toISOString(),
      closesAt: closesAt.toISOString(),
      requiresTeamAssignment: true,
      survey: [],
      teams: [],
    };
  }

  return {
    id: createId("event"),
    workshopId,
    title: title || "액티비티 사전 설문",
    description: "유료 액티비티 참여 의사와 선호 종목을 확인합니다.",
    type: "survey",
    surveyKind: "activity",
    showInEventList: true,
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
    participants,
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
  const [eventTemplateId, setEventTemplateId] = useState<EventTemplateId>("activitySurvey");
  const [eventAddType, setEventAddType] = useState<EventType>(
    getEventTemplateDefaults("activitySurvey").type,
  );
  const [eventAddShowInEventList, setEventAddShowInEventList] = useState(
    getEventTemplateDefaults("activitySurvey").showInEventList,
  );
  const [eventAddLinkedSurveyId, setEventAddLinkedSurveyId] = useState("");
  const [eventRequiresTeamAssignment, setEventRequiresTeamAssignment] = useState(
    getEventTemplateDefaults("activitySurvey").requiresTeamAssignment,
  );
  const [eventStatus, setEventStatus] = useState<EventStatus>("waiting");
  const [isEventAddModalOpen, setIsEventAddModalOpen] = useState(false);
  const [eventEditDraft, setEventEditDraft] = useState<EventEditDraft | null>(null);
  const [surveyManageEventId, setSurveyManageEventId] = useState<string>();
  const [responseManageEventId, setResponseManageEventId] = useState<string>();
  const [responseManageTab, setResponseManageTab] = useState<ResponseManageTab>("summary");
  const [responseSummaryOpenKey, setResponseSummaryOpenKey] = useState<string>();
  const [questionOptionDrafts, setQuestionOptionDrafts] = useState<Record<string, string>>({});
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
  const [teamEditDrafts, setTeamEditDrafts] = useState<
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
  const parseMemberNames = (membersText: string) =>
    membersText
      .split(",")
      .map((member) => member.trim())
      .filter(Boolean);
  const getTargetScoreLabel = (participantName: string) => {
    const targetResponse = selectedGuideResponses.find((response) => {
      if (response.participantName !== participantName) {
        return false;
      }

      const responseEvent = selectedGuide.events.find((eventItem) => eventItem.id === response.eventId);
      const targetScore = getResponseAnswerByKeyOrLabel(responseEvent, response, "targetScore", [
        "목표",
      ]);
      const targetScoreText = Array.isArray(targetScore) ? targetScore[0] : targetScore;

      return Boolean(targetScoreText);
    });
    const targetResponseEvent = selectedGuide.events.find(
      (eventItem) => eventItem.id === targetResponse?.eventId,
    );
    const targetScore = targetResponse
      ? getResponseAnswerByKeyOrLabel(targetResponseEvent, targetResponse, "targetScore", ["목표"])
      : undefined;
    const targetScoreText = Array.isArray(targetScore) ? targetScore[0] : targetScore;

    return targetScoreText ? `목표점수 ${targetScoreText}` : "목표점수 -";
  };
  const getKnownParticipantNames = () =>
    new Set([
      ...participants.map((participant) => participant.name),
      ...selectedGuideResponses.map((response) => response.participantName),
    ]);
  const getTeamMemberWarnings = (
    event: EventItem,
    teamId: string | undefined,
    membersText: string,
  ) => {
    const parsedMembers = parseMemberNames(membersText);
    const knownNames = getKnownParticipantNames();
    const seenNames = new Set<string>();
    const warnings: string[] = [];

    parsedMembers.forEach((member) => {
      if (seenNames.has(member)) {
        warnings.push(`${member}님이 같은 조에 중복 입력되었습니다.`);
      }
      seenNames.add(member);

      const assignedTeam = event.teams.find(
        (team) => team.id !== teamId && team.members.includes(member),
      );

      if (assignedTeam) {
        warnings.push(`${member}님은 이미 ${assignedTeam.name}에 배정되어 있습니다.`);
      }

      if (!knownNames.has(member)) {
        warnings.push(`${member}님은 현재 응답자 목록에 없습니다. 이름 오타인지 확인해주세요.`);
      }
    });

    return Array.from(new Set(warnings));
  };
  const confirmTeamMemberWarnings = (
    event: EventItem,
    teamId: string | undefined,
    membersText: string,
  ) => {
    const warnings = getTeamMemberWarnings(event, teamId, membersText);

    if (!warnings.length) {
      return true;
    }

    return window.confirm(`${warnings.join("\n")}\n\n그래도 저장하시겠습니까?`);
  };
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
      type: eventAddType,
      surveyKind: eventAddType === "survey" ? nextEvent.surveyKind ?? "general" : undefined,
      eventKind: eventAddType === "event" ? nextEvent.eventKind ?? "general" : undefined,
      showInEventList: eventAddShowInEventList,
      linkedSurveyId:
        eventAddType === "event" && eventAddLinkedSurveyId ? eventAddLinkedSurveyId : undefined,
      phase:
        eventAddType === "event" && nextEvent.eventKind === "bowling"
          ? nextEvent.phase ?? "preSurvey"
          : undefined,
      requiresTeamAssignment: eventRequiresTeamAssignment,
    });
    setEventTitle("");
    setEventTemplateId("activitySurvey");
    setEventAddType(getEventTemplateDefaults("activitySurvey").type);
    setEventAddShowInEventList(getEventTemplateDefaults("activitySurvey").showInEventList);
    setEventAddLinkedSurveyId("");
    setEventRequiresTeamAssignment(getEventTemplateDefaults("activitySurvey").requiresTeamAssignment);
    setEventStatus("waiting");
    setIsEventAddModalOpen(false);
  };

  const openEventAddModal = () => {
    setEventTitle("");
    setEventTemplateId("activitySurvey");
    setEventAddType(getEventTemplateDefaults("activitySurvey").type);
    setEventAddShowInEventList(getEventTemplateDefaults("activitySurvey").showInEventList);
    setEventAddLinkedSurveyId("");
    setEventRequiresTeamAssignment(getEventTemplateDefaults("activitySurvey").requiresTeamAssignment);
    setEventStatus("waiting");
    setIsEventAddModalOpen(true);
  };

  const openEventEditModal = (eventItem: EventItem) => {
    setEventEditDraft({
      id: eventItem.id,
      title: eventItem.title,
      type: eventItem.type ?? "survey",
      surveyKind: eventItem.surveyKind ?? "general",
      eventKind: eventItem.eventKind ?? "general",
      showInEventList: eventItem.showInEventList ?? true,
      linkedSurveyId: eventItem.linkedSurveyId ?? "",
      phase: eventItem.phase ?? "preSurvey",
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
      type: eventEditDraft.type,
      surveyKind: eventEditDraft.type === "survey" ? eventEditDraft.surveyKind : undefined,
      eventKind:
        eventEditDraft.type === "event"
          ? eventEditDraft.eventKind === "bowling" || eventEditDraft.title.includes("볼링")
            ? "bowling"
            : eventEditDraft.eventKind
          : undefined,
      showInEventList: eventEditDraft.showInEventList,
      linkedSurveyId:
        eventEditDraft.type === "event" && eventEditDraft.linkedSurveyId
          ? eventEditDraft.linkedSurveyId
          : undefined,
      phase:
        eventEditDraft.type === "event" &&
        (eventEditDraft.eventKind === "bowling" || eventEditDraft.title.includes("볼링"))
          ? eventEditDraft.phase
          : undefined,
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
                            {eventTypeLabels[eventItem.type ?? "survey"]}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-1 text-[11px] font-bold",
                              eventItem.showInEventList === false
                                ? "bg-gray-900 text-white"
                                : "bg-emerald-50 text-emerald-700",
                            )}
                          >
                            {eventItem.showInEventList === false ? "이벤트 탭 숨김" : "이벤트 탭 노출"}
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
            setEventTemplateId("activitySurvey");
            setEventAddType(getEventTemplateDefaults("activitySurvey").type);
            setEventAddShowInEventList(getEventTemplateDefaults("activitySurvey").showInEventList);
            setEventAddLinkedSurveyId("");
            setEventRequiresTeamAssignment(
              getEventTemplateDefaults("activitySurvey").requiresTeamAssignment,
            );
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
                    const nextDefaults = getEventTemplateDefaults(nextTemplateId);
                    setEventTemplateId(nextTemplateId);
                    setEventAddType(nextDefaults.type);
                    setEventAddShowInEventList(nextDefaults.showInEventList);
                    setEventRequiresTeamAssignment(nextDefaults.requiresTeamAssignment);
                    setEventAddLinkedSurveyId("");
                  }}
                  value={eventTemplateId}
                >
                  <option value="activitySurvey">액티비티 사전 설문</option>
                  <option value="bowlingLevelSurvey">볼링 대회 레벨 테스트</option>
                  <option value="bowlingEvent">대표님배 볼링대회</option>
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
            <div className="grid gap-3 rounded-lg bg-gray-50 p-3 md:grid-cols-2">
              <label>
                <span className={labelClass}>이벤트 타입</span>
                <select
                  className={fieldClass}
                  onChange={(event) => setEventAddType(event.target.value as EventType)}
                  value={eventAddType}
                >
                  {Object.entries(eventTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-2 pt-1">
                <label className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-gray-700">
                  <input
                    checked={eventAddShowInEventList}
                    className="h-4 w-4 accent-brand-700"
                    onChange={(event) => setEventAddShowInEventList(event.target.checked)}
                    type="checkbox"
                  />
                  이벤트 탭 노출
                </label>
                <label className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-gray-700">
                  <input
                    checked={eventRequiresTeamAssignment}
                    className="h-4 w-4 accent-brand-700"
                    onChange={(event) => setEventRequiresTeamAssignment(event.target.checked)}
                    type="checkbox"
                  />
                  조 배치 사용
                </label>
              </div>
              {eventAddType === "event" && eventTemplateId === "bowlingEvent" ? (
                <label className="md:col-span-2">
                  <span className={labelClass}>연결 설문</span>
                  <select
                    className={fieldClass}
                    onChange={(event) => setEventAddLinkedSurveyId(event.target.value)}
                    value={eventAddLinkedSurveyId}
                  >
                    <option value="">자동 선택</option>
                    {selectedGuide.events
                      .filter((eventItem) => eventItem.type === "survey")
                      .map((eventItem) => (
                        <option key={eventItem.id} value={eventItem.id}>
                          {eventItem.title}
                        </option>
                      ))}
                  </select>
                </label>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                onClick={() => {
                  setEventTitle("");
                  setEventTemplateId("activitySurvey");
                  setEventAddType(getEventTemplateDefaults("activitySurvey").type);
                  setEventAddShowInEventList(
                    getEventTemplateDefaults("activitySurvey").showInEventList,
                  );
                  setEventAddLinkedSurveyId("");
                  setEventRequiresTeamAssignment(
                    getEventTemplateDefaults("activitySurvey").requiresTeamAssignment,
                  );
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
          {(() => {
            const isBowlingEventDraft =
              eventEditDraft.type === "event" &&
              (eventEditDraft.eventKind === "bowling" || eventEditDraft.title.includes("볼링"));

            return (
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
              {isBowlingEventDraft ? (
                <label>
                  <span className={labelClass}>볼링 진행 단계</span>
                  <select
                    className={fieldClass}
                    onChange={(event) =>
                      setEventEditDraft({
                        ...eventEditDraft,
                        phase: event.target.value as EventPhase,
                      })
                    }
                    value={eventEditDraft.phase}
                  >
                    {Object.entries(eventPhaseLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
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
              )}
              <label>
                <span className={labelClass}>이벤트 타입</span>
                <select
                  className={fieldClass}
                  onChange={(event) =>
                    setEventEditDraft({
                      ...eventEditDraft,
                      type: event.target.value as EventType,
                      surveyKind:
                        event.target.value === "survey" ? eventEditDraft.surveyKind : "general",
                      eventKind:
                        event.target.value === "event"
                          ? eventEditDraft.title.includes("볼링")
                            ? "bowling"
                            : eventEditDraft.eventKind
                          : "general",
                    })
                  }
                  value={eventEditDraft.type}
                >
                  {Object.entries(eventTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {isBowlingEventDraft ? (
                <label>
                  <span className={labelClass}>연결 설문</span>
                  <select
                    className={fieldClass}
                    onChange={(event) =>
                      setEventEditDraft({
                        ...eventEditDraft,
                        linkedSurveyId: event.target.value,
                      })
                    }
                    value={eventEditDraft.linkedSurveyId}
                  >
                    <option value="">자동 선택</option>
                    {selectedGuide.events
                      .filter((eventItem) => eventItem.type === "survey")
                      .map((eventItem) => (
                        <option key={eventItem.id} value={eventItem.id}>
                          {eventItem.title}
                        </option>
                      ))}
                  </select>
                </label>
              ) : null}
              <label className="rounded-lg bg-gray-50 p-3">
                <span className="inline-flex min-h-6 items-center gap-2 text-sm font-semibold text-gray-700">
                  <input
                    checked={eventEditDraft.showInEventList}
                    className="h-4 w-4 accent-brand-700"
                    onChange={(event) =>
                      setEventEditDraft({
                        ...eventEditDraft,
                        showInEventList: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                  이벤트 탭 노출
                </span>
                <span className="mt-1 block text-xs leading-5 text-gray-500">
                  꺼도 관리자 이벤트 관리에는 계속 표시됩니다.
                </span>
              </label>
              <label>
                <span className={labelClass}>종료일</span>
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
            );
          })()}
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
                          onBlur={(inputEvent) => {
                            const nextOptions = inputEvent.target.value
                              .split(",")
                              .map((option) => option.trim())
                              .filter(Boolean);

                            updateSurveyQuestion(
                              selectedGuide.id,
                              surveyManageEvent.id,
                              question.id,
                              {
                                options: nextOptions,
                              },
                            );
                            setQuestionOptionDrafts((currentDrafts) => {
                              const nextDrafts = { ...currentDrafts };
                              delete nextDrafts[question.id];
                              return nextDrafts;
                            });
                          }}
                          onChange={(inputEvent) =>
                            setQuestionOptionDrafts({
                              ...questionOptionDrafts,
                              [question.id]: inputEvent.target.value,
                            })
                          }
                          placeholder="옵션을 쉼표로 구분"
                          value={questionOptionDrafts[question.id] ?? question.options?.join(", ") ?? ""}
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
            const isBowlingCompetitionManage =
              responseManageEvent.type === "event" && responseManageEvent.eventKind === "bowling";
            const linkedBowlingSurveyEvent = isBowlingCompetitionManage
              ? selectedGuide.events.find((eventItem) => eventItem.id === responseManageEvent.linkedSurveyId) ??
                selectedGuide.events.find(
                  (eventItem) =>
                    eventItem.type === "survey" && eventItem.surveyKind === "bowlingLevel",
                )
              : undefined;
            const linkedBowlingSurveyResponses = linkedBowlingSurveyEvent
              ? selectedGuideResponses.filter(
                  (response) => response.eventId === linkedBowlingSurveyEvent.id,
                )
              : [];
            const bowlingTeamSourceEvent = linkedBowlingSurveyEvent ?? responseManageEvent;
            const bowlingRankings = isBowlingCompetitionManage
              ? getBowlingTeamRankings(
                  bowlingTeamSourceEvent,
                  responseManageEventResponses,
                  linkedBowlingSurveyEvent
                    ? linkedBowlingSurveyResponses
                    : responseManageEventResponses,
                ).filter((ranking) => ranking.submittedCount > 0 || ranking.totalScore > 0)
              : [];

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

                    {responseManageEvent.type === "survey" &&
                    responseManageEvent.surveyKind === "bowlingLevel" ? (
                      <section className="mt-3 rounded-lg border border-brand-100 bg-brand-50 p-3">
                        <h4 className="font-bold text-brand-950">볼링 레벨 테스트 빠른 확인</h4>
                        <div className="mt-3 space-y-2">
                          {responseManageEventResponses.length > 0 ? (
                            responseManageEventResponses.map((response) => (
                              <div
                                className="rounded-lg bg-white p-3 text-sm"
                                key={response.id}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-bold text-gray-950">
                                    {response.participantName}
                                  </span>
                                  <span className="text-xs font-bold text-brand-700">
                                    {getTeamAssignmentLabel(responseManageEvent, response)}
                                  </span>
                                </div>
                                <div className="mt-2 grid gap-1 text-xs leading-5 text-gray-600 sm:grid-cols-2">
                                  <span>
                                    목표점수:{" "}
                                    {formatAnswerValue(
                                      getResponseAnswerByKeyOrLabel(
                                        responseManageEvent,
                                        response,
                                        "targetScore",
                                        ["목표"],
                                      ) ?? "-",
                                    )}
                                  </span>
                                  <span>
                                    실력:{" "}
                                    {formatAnswerValue(
                                      getResponseAnswerByKeyOrLabel(
                                        responseManageEvent,
                                        response,
                                        "level",
                                        ["실력", "타입"],
                                      ) ?? "-",
                                    )}
                                  </span>
                                  <span>
                                    경험:{" "}
                                    {formatAnswerValue(
                                      getResponseAnswerByKeyOrLabel(
                                        responseManageEvent,
                                        response,
                                        "experience",
                                        ["경험"],
                                      ) ?? "-",
                                    )}
                                  </span>
                                  <span>
                                    스타일:{" "}
                                    {formatAnswerValue(
                                      getResponseAnswerByKeyOrLabel(
                                        responseManageEvent,
                                        response,
                                        "style",
                                        ["스타일", "커브", "스핀"],
                                      ) ?? "-",
                                    )}
                                  </span>
                                  <span className="sm:col-span-2">
                                    중요하게 생각하는 것:{" "}
                                    {formatAnswerValue(
                                      getResponseAnswerByKeyOrLabel(
                                        responseManageEvent,
                                        response,
                                        "priority",
                                        ["중요"],
                                      ) ?? "-",
                                    )}
                                  </span>
                                  <span className="sm:col-span-2">
                                    평균점수: {formatAnswerValue(response.answers.averageScore ?? "-")}
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="rounded-lg bg-white p-3 text-sm text-gray-500">
                              저장된 레벨 테스트 응답이 없습니다.
                            </p>
                          )}
                        </div>
                      </section>
                    ) : null}

                    {responseManageEvent.type === "event" &&
                    responseManageEvent.eventKind === "bowling" ? (
                      <div className="mt-3 space-y-3">
                        <section className="rounded-lg border border-brand-100 bg-brand-50 p-3">
                          <h4 className="font-bold text-brand-950">
                            볼링대회 조 배치는 연결된 볼링 레벨 테스트에서 관리합니다.
                          </h4>
                          <p className="mt-1 text-sm leading-5 text-brand-900">
                            이 화면은 볼링대회 점수 제출 현황을 확인합니다. 조 목록과 목표점수는{" "}
                            {linkedBowlingSurveyEvent?.title ?? "연결 설문"} 데이터를 기준으로 집계합니다.
                          </p>
                          {linkedBowlingSurveyEvent ? (
                            <Button
                              className="mt-3"
                              onClick={() => {
                                setResponseManageEventId(linkedBowlingSurveyEvent.id);
                                setResponseManageTab("teams");
                              }}
                              variant="secondary"
                            >
                              연결 설문 조배치 관리 열기
                            </Button>
                          ) : null}
                        </section>
                      <div className="grid gap-3 lg:grid-cols-2">
                        <section className="rounded-lg border border-gray-200 bg-white p-3">
                          <h4 className="font-bold text-gray-950">점수 제출 현황</h4>
                          <div className="mt-3 space-y-2">
                            {responseManageEventResponses.length > 0 ? (
                              responseManageEventResponses.map((response) => {
                                const game1Score = getNumericResponseAnswer(response, "game1Score");
                                const game2Score = getNumericResponseAnswer(response, "game2Score");
                                const totalScore = getParticipantScoreTotal(response);
                                const levelResponse = linkedBowlingSurveyEvent
                                  ? findParticipantResponse(linkedBowlingSurveyResponses, response)
                                  : undefined;
                                const targetScoreValue = levelResponse
                                  ? getResponseAnswerByKeyOrLabel(
                                      linkedBowlingSurveyEvent,
                                      levelResponse,
                                      "targetScore",
                                      ["목표"],
                                    )
                                  : undefined;
                                const targetScoreText = Array.isArray(targetScoreValue)
                                  ? targetScoreValue[0]
                                  : targetScoreValue;
                                const targetScoreNumber = Number(targetScoreText);
                                const targetScore =
                                  Number.isFinite(targetScoreNumber) && targetScoreText !== ""
                                    ? targetScoreNumber
                                    : undefined;
                                const assignedTeam = levelResponse
                                  ? getEventResponseTeam(bowlingTeamSourceEvent, levelResponse)
                                  : getEventResponseTeam(bowlingTeamSourceEvent, response);

                                return (
                                  <div
                                    className="rounded-lg bg-gray-50 p-3 text-sm"
                                    key={response.id}
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <span className="font-bold text-gray-950">
                                        {response.participantName}
                                      </span>
                                      <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-brand-700 ring-1 ring-brand-100">
                                        {assignedTeam?.name ?? "미배정"}
                                      </span>
                                    </div>
                                    <div className="mt-2 grid gap-1 text-xs leading-5 text-gray-600 sm:grid-cols-2">
                                      <span>1R 점수: {game1Score ?? "-"}</span>
                                      <span>2R 점수: {game2Score ?? "-"}</span>
                                      <span>개인 총점: {totalScore}점</span>
                                      <span>목표점수: {targetScore ?? "-"}</span>
                                      <span>1R 차이: {formatTargetDiff(game1Score, targetScore)}</span>
                                      <span>2R 차이: {formatTargetDiff(game2Score, targetScore)}</span>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
                                저장된 응답이 없습니다.
                              </p>
                            )}
                          </div>
                        </section>

                        <section className="rounded-lg border border-gray-200 bg-white p-3">
                          <h4 className="font-bold text-gray-950">조별 합산 순위</h4>
                          <div className="mt-3 space-y-2">
                            {bowlingRankings.length > 0 ? (
                              bowlingRankings.map((ranking, index) => (
                                <div
                                  className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-2 text-sm"
                                  key={ranking.team.id}
                                >
                                  <span className="font-bold text-gray-950">
                                    {index + 1}. {ranking.team.name}
                                  </span>
                                  <span className="text-xs font-semibold text-brand-700">
                                    {ranking.totalScore}점 · 제출 {ranking.submittedCount}명
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
                                등록된 조가 없습니다.
                              </p>
                            )}
                          </div>
                        </section>
                      </div>
                      </div>
                    ) : null}

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

                  {isBowlingCompetitionManage ? (
                    <p className="mt-3 rounded-lg bg-brand-50 p-3 text-sm font-semibold leading-5 text-brand-900">
                      볼링대회 조 배치는 연결된 볼링 레벨 테스트에서 관리합니다.
                      {linkedBowlingSurveyEvent
                        ? " 조 선택을 수정하려면 연결 설문 조배치 관리로 이동해주세요."
                        : " 연결 설문을 먼저 설정해주세요."}
                    </p>
                  ) : responseManageEvent.requiresTeamAssignment ? (
                    <p className="mt-3 rounded-lg bg-brand-50 p-3 text-sm font-semibold leading-5 text-brand-900">
                      조 추가/수정은 조 배치 탭에서 할 수 있습니다.
                      {responseManageEvent.teams.length === 0
                        ? " 먼저 조 배치 탭에서 조를 추가해주세요."
                        : " 아래 조 선택은 조 배치 탭의 조 목록을 기준으로 합니다."}
                    </p>
                  ) : null}

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

                            {responseManageEvent.requiresTeamAssignment && !isBowlingCompetitionManage ? (
                              <label className="mt-3 block">
                                <span className={labelClass}>조 선택</span>
                                <select
                                  className={fieldClass}
                                  disabled={responseManageEvent.teams.length === 0}
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
                                  <option value="">
                                    {responseManageEvent.teams.length === 0
                                      ? "먼저 조를 추가해주세요"
                                      : "미배정"}
                                  </option>
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
                    {isBowlingCompetitionManage ? (
                      <div className="rounded-lg border border-brand-100 bg-brand-50 p-3">
                        <h3 className="font-bold text-brand-950">
                          볼링대회 조 배치는 연결된 볼링 레벨 테스트에서 관리합니다.
                        </h3>
                        <p className="mt-1 text-sm leading-5 text-brand-900">
                          이 이벤트 자체 조 목록은 사용하지 않습니다. 볼링페이지의 팀 멤버와 순위는{" "}
                          {linkedBowlingSurveyEvent?.title ?? "연결 설문"} 조배정 데이터를 기준으로 표시됩니다.
                        </p>
                        {linkedBowlingSurveyEvent ? (
                          <Button
                            className="mt-3"
                            onClick={() => {
                              setResponseManageEventId(linkedBowlingSurveyEvent.id);
                              setResponseManageTab("teams");
                            }}
                            variant="secondary"
                          >
                            연결 설문 조배치 관리 열기
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                    <>
                    <h3 className="font-bold text-gray-950">조 목록 관리</h3>
                    <p className="mt-1 text-sm leading-5 text-gray-500">
                      여기에서 조를 추가/수정/삭제한 뒤, 응답 목록 탭에서 응답자별 조를 선택할 수 있습니다.
                    </p>
                    <div className="mt-3 rounded-lg bg-gray-50 p-3">
                      <p className="text-sm font-bold text-gray-950">응답자 참고</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {responseManageEventResponses.length > 0 ? (
                          responseManageEventResponses.map((response) => (
                            <span
                              className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200"
                              key={response.id}
                            >
                              {response.participantName} / {getTargetScoreLabel(response.participantName)}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">
                            이 이벤트에 저장된 응답자가 없습니다.
                          </span>
                        )}
                      </div>
                    </div>
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

                          if (
                            !confirmTeamMemberWarnings(
                              responseManageEvent,
                              undefined,
                              groupDraft.membersText,
                            )
                          ) {
                            return;
                          }

                          addEventTeam(selectedGuide.id, responseManageEvent.id, {
                            id: createId("team"),
                            eventId: responseManageEvent.id,
                            name: groupDraft.teamName.trim(),
                            members: parseMemberNames(groupDraft.membersText),
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
                        responseManageEvent.teams.map((team) => {
                          const teamEditDraft = teamEditDrafts[team.id];

                          return (
                            <section
                              className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                              key={team.id}
                            >
                              {teamEditDraft ? (
                                <>
                                  <div className="grid gap-2 md:grid-cols-2">
                                    <label>
                                      <span className={labelClass}>조 이름</span>
                                      <input
                                        className={fieldClass}
                                        onChange={(inputEvent) =>
                                          setTeamEditDrafts({
                                            ...teamEditDrafts,
                                            [team.id]: {
                                              ...teamEditDraft,
                                              teamName: inputEvent.target.value,
                                            },
                                          })
                                        }
                                        value={teamEditDraft.teamName}
                                      />
                                    </label>
                                    <label>
                                      <span className={labelClass}>메모</span>
                                      <input
                                        className={fieldClass}
                                        onChange={(inputEvent) =>
                                          setTeamEditDrafts({
                                            ...teamEditDrafts,
                                            [team.id]: {
                                              ...teamEditDraft,
                                              memo: inputEvent.target.value,
                                            },
                                          })
                                        }
                                        value={teamEditDraft.memo}
                                      />
                                    </label>
                                    <label className="md:col-span-2">
                                      <span className={labelClass}>참가자</span>
                                      <input
                                        className={fieldClass}
                                        onChange={(inputEvent) =>
                                          setTeamEditDrafts({
                                            ...teamEditDrafts,
                                            [team.id]: {
                                              ...teamEditDraft,
                                              membersText: inputEvent.target.value,
                                            },
                                          })
                                        }
                                        value={teamEditDraft.membersText}
                                      />
                                    </label>
                                  </div>
                                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                                    <Button
                                      onClick={() =>
                                        setTeamEditDrafts((currentDrafts) => {
                                          const nextDrafts = { ...currentDrafts };
                                          delete nextDrafts[team.id];
                                          return nextDrafts;
                                        })
                                      }
                                      variant="secondary"
                                    >
                                      취소
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        if (!teamEditDraft.teamName.trim()) {
                                          return;
                                        }

                                        if (
                                          !confirmTeamMemberWarnings(
                                            responseManageEvent,
                                            team.id,
                                            teamEditDraft.membersText,
                                          )
                                        ) {
                                          return;
                                        }

                                        updateEventTeam(
                                          selectedGuide.id,
                                          responseManageEvent.id,
                                          team.id,
                                          {
                                            name: teamEditDraft.teamName.trim(),
                                            members: parseMemberNames(teamEditDraft.membersText),
                                            memo: teamEditDraft.memo.trim(),
                                          },
                                        );
                                        setTeamEditDrafts((currentDrafts) => {
                                          const nextDrafts = { ...currentDrafts };
                                          delete nextDrafts[team.id];
                                          return nextDrafts;
                                        });
                                      }}
                                    >
                                      저장
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div>
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div>
                                        <p className="font-bold text-gray-950">{team.name}</p>
                                        {team.memo ? (
                                          <p className="mt-1 text-xs font-semibold text-gray-500">
                                            {team.memo}
                                          </p>
                                        ) : null}
                                      </div>
                                      <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-gray-600 ring-1 ring-gray-200">
                                        {team.members.length}명
                                      </span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                      {team.members.length > 0 ? (
                                        team.members.map((member) => (
                                          <span
                                            className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200"
                                            key={member}
                                          >
                                            {member} / {getTargetScoreLabel(member)}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-sm text-gray-500">
                                          배정된 조원이 없습니다.
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                                    <Button
                                      onClick={() =>
                                        setTeamEditDrafts({
                                          ...teamEditDrafts,
                                          [team.id]: {
                                            teamName: team.name,
                                            membersText: team.members.join(", "),
                                            memo: team.memo ?? "",
                                          },
                                        })
                                      }
                                      variant="secondary"
                                    >
                                      수정
                                    </Button>
                                    <Button
                                      icon={<Trash2 className="h-4 w-4" />}
                                      onClick={() =>
                                        deleteEventTeam(
                                          selectedGuide.id,
                                          responseManageEvent.id,
                                          team.id,
                                        )
                                      }
                                      variant="danger"
                                    >
                                      삭제
                                    </Button>
                                  </div>
                                </>
                              )}
                            </section>
                          );
                        })
                      ) : (
                        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
                          생성된 조가 없습니다.
                        </p>
                      )}
                    </div>
                    </>
                    )}
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
