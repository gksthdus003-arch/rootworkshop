import { FormEvent, useState } from "react";
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
  AnnouncementItem,
  EventItem,
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
  | "recommendations"
  | "announcements";

type EventTemplateId = "activity" | "bowling";

const adminSections: Array<{
  id: AdminSectionId;
  label: string;
}> = [
  { id: "map", label: "장소" },
  { id: "schedule", label: "일정" },
  { id: "events", label: "이벤트" },
  { id: "recommendations", label: "추천" },
  { id: "announcements", label: "공지" },
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
    addAnnouncement,
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
    deleteAnnouncement,
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
    updateAnnouncement,
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
  const [editingLocationId, setEditingLocationId] = useState<string>();
  const [scheduleDraft, setScheduleDraft] = useState({
    title: "",
    description: "",
    startAt: "",
    endAt: "",
    location: "",
    locationId: "",
    category: "session" as ScheduleCategory,
  });
  const [eventTitle, setEventTitle] = useState("");
  const [eventTemplateId, setEventTemplateId] = useState<EventTemplateId>("activity");
  const [eventStatus, setEventStatus] = useState<EventStatus>("waiting");
  const [selectedEventId, setSelectedEventId] = useState<string>();
  const [recommendationDraft, setRecommendationDraft] = useState({
    title: "",
    locationLabel: "",
    description: "",
    category: "자유시간",
    imageUrl: "/assets/recommendation-eco-stream.png",
    isVisible: true,
  });
  const [announcementDraft, setAnnouncementDraft] = useState({
    title: "",
    body: "",
    isImportant: false,
    showOnHomeBanner: false,
  });
  const [groupDrafts, setGroupDrafts] = useState<
    Record<string, { teamName: string; membersText: string; memo: string }>
  >({});
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");

  const selectedGuideResponses = eventResponses.filter(
    (response) => response.guideId === selectedGuide.id,
  );
  const selectedAdminEvent =
    selectedGuide.events.find((eventItem) => eventItem.id === selectedEventId) ??
    selectedGuide.events[0];
  const selectedEventResponses = selectedAdminEvent
    ? selectedGuideResponses.filter((response) => response.eventId === selectedAdminEvent.id)
    : [];
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

  const getLocationScheduleUsage = (locationId: string) =>
    selectedGuide.schedule.filter((scheduleItem) => scheduleItem.locationId === locationId);

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
    setEditingLocationId((currentId) => (currentId === location.id ? undefined : currentId));
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

  const handleAddEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextEvent = createEventFromTemplate(
      eventTemplateId,
      selectedGuide.id,
      eventTitle.trim(),
      eventStatus,
    );

    addEvent(selectedGuide.id, nextEvent);
    setSelectedEventId(nextEvent.id);
    setEventTitle("");
    setEventTemplateId("activity");
    setEventStatus("waiting");
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
    setRecommendationDraft({
      title: "",
      locationLabel: "",
      description: "",
      category: "자유시간",
      imageUrl: "/assets/recommendation-eco-stream.png",
      isVisible: true,
    });
  };

  const handleAddAnnouncement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!announcementDraft.title.trim()) {
      return;
    }

    addAnnouncement(selectedGuide.id, {
      id: createId("announcement"),
      ...announcementDraft,
      title: announcementDraft.title.trim(),
      body: announcementDraft.body.trim(),
      createdAt: new Date().toISOString(),
    });
    setAnnouncementDraft({
      title: "",
      body: "",
      isImportant: false,
      showOnHomeBanner: false,
    });
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
        <Button icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack} variant="ghost">
          홈으로 돌아가기
        </Button>
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
      <div className="relative flex min-h-12 items-center justify-between gap-3 border-b border-gray-200 bg-white">
        <label className="relative min-w-0 flex-1">
          <select
            aria-label="워크숍 회차 선택"
            className="w-full appearance-none truncate bg-transparent py-2 pr-7 text-lg font-bold text-gray-950 outline-none"
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

        <Button className="shrink-0 px-3" icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack} variant="ghost">
          홈으로 돌아가기
        </Button>

        <details className="relative shrink-0">
          <summary className="flex min-h-10 cursor-pointer list-none items-center rounded-lg px-3 text-sm font-bold text-gray-700 hover:bg-gray-100">
            ⚙ 관리
          </summary>
          <div className="absolute right-0 top-12 z-40 max-h-[calc(100dvh-8rem)] w-[min(42rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-2xl">
            <div className="flex flex-wrap justify-end gap-2">
              <Button icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack} variant="ghost">
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
          {adminSections.map((section) => {
            const isActive = activeSection === section.id;

            return (
              <div className="flex items-center gap-4" key={section.id}>
                <button
                  className={cn(
                    "min-h-12 whitespace-nowrap border-b-2 px-1 text-sm transition",
                    isActive
                      ? "border-brand-700 font-bold text-gray-950"
                      : "border-transparent font-semibold text-gray-500 hover:text-gray-900",
                  )}
                  onClick={() => setActiveSection(section.id)}
                  type="button"
                >
                  {section.label}
                </button>
                {section.id !== "announcements" ? (
                  <span className="text-sm font-semibold text-gray-300">|</span>
                ) : null}
              </div>
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

          <div className={`${panelClass} overflow-hidden p-0`}>
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
            <div className="border-b border-gray-200 p-4">
              <h2 className="font-bold">장소 관리</h2>
            </div>
            <form
              className="grid gap-3 border-b border-gray-100 bg-gray-50/70 p-4 md:grid-cols-2"
              onSubmit={handleAddMapLocation}
            >
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
              <div className="flex flex-wrap items-center gap-2 md:col-span-2">
                <label className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-gray-700 ring-1 ring-gray-200">
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
                <label className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-gray-700 ring-1 ring-gray-200">
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
                <Button className="ml-auto" disabled={!locationDraft.name.trim()} type="submit">
                  추가
                </Button>
              </div>
            </form>
            <div className="grid gap-3 p-4 md:grid-cols-2">
              {selectedGuide.map.locations.map((location) => {
                const CategoryIcon = getMapLocationCategoryIcon(location.category);
                const isEditing = editingLocationId === location.id;
                const usedScheduleItems = getLocationScheduleUsage(location.id);

                return (
                  <article className="rounded-lg border border-gray-200 bg-white p-4" key={location.id}>
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
                          aria-label={isEditing ? "수정 닫기" : "수정"}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
                          onClick={() =>
                            setEditingLocationId(isEditing ? undefined : location.id)
                          }
                          type="button"
                        >
                          {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
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

                    {isEditing ? (
                      <div className="mt-4 grid gap-3 border-t border-gray-100 pt-4">
                        <label>
                          <span className={labelClass}>장소명</span>
                          <input
                            className={fieldClass}
                            onChange={(event) =>
                              updateMapLocation(selectedGuide.id, location.id, {
                                name: event.target.value,
                              })
                            }
                            value={location.name}
                          />
                        </label>
                        <label>
                          <span className={labelClass}>카테고리</span>
                          <select
                            className={fieldClass}
                            onChange={(event) =>
                              updateMapLocation(selectedGuide.id, location.id, {
                                category: event.target.value as MapLocationCategory,
                              })
                            }
                            value={location.category}
                          >
                            {Object.entries(mapLocationCategoryLabels).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span className={labelClass}>설명</span>
                          <input
                            className={fieldClass}
                            onChange={(event) =>
                              updateMapLocation(selectedGuide.id, location.id, {
                                description: event.target.value,
                              })
                            }
                            value={location.description ?? ""}
                          />
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gray-100 px-3 text-sm font-semibold text-gray-700">
                            <input
                              checked={location.isWorkshopLocation}
                              onChange={(event) =>
                                updateMapLocation(selectedGuide.id, location.id, {
                                  isWorkshopLocation: event.target.checked,
                                })
                              }
                              type="checkbox"
                            />
                            워크숍 사용 장소
                          </label>
                          <label className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gray-100 px-3 text-sm font-semibold text-gray-700">
                            <input
                              checked={location.isSmokingArea}
                              onChange={(event) =>
                                updateMapLocation(selectedGuide.id, location.id, {
                                  isSmokingArea: event.target.checked,
                                })
                              }
                              type="checkbox"
                            />
                            흡연구역
                          </label>
                          <Button
                            className="ml-auto"
                            icon={<Check className="h-4 w-4" />}
                            onClick={() => setEditingLocationId(undefined)}
                            type="button"
                            variant="secondary"
                          >
                            완료
                          </Button>
                        </div>
                      </div>
                    ) : null}
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

          <form className={panelClass} onSubmit={handleAddScheduleItem}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold">일정 추가</h2>
              <Button icon={<Plus className="h-4 w-4" />} type="submit">
                추가
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
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
                <span className={labelClass}>제목</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setScheduleDraft({ ...scheduleDraft, title: event.target.value })
                  }
                  value={scheduleDraft.title}
                />
              </label>
              <label>
                <span className={labelClass}>설명</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setScheduleDraft({ ...scheduleDraft, description: event.target.value })
                  }
                  value={scheduleDraft.description}
                />
              </label>
              <label>
                <span className={labelClass}>장소</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setScheduleDraft({ ...scheduleDraft, location: event.target.value })
                  }
                  value={scheduleDraft.location}
                />
              </label>
            </div>
            <label className="mt-3 block">
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
          </form>

          <div className={`${panelClass} overflow-hidden p-0`}>
            <div className="border-b border-gray-200 p-4">
              <h2 className="font-bold">일정 목록</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[64rem] text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-3">순서</th>
                    <th className="px-4 py-3">시작</th>
                    <th className="px-4 py-3">종료</th>
                    <th className="px-4 py-3">제목</th>
                    <th className="px-4 py-3">설명</th>
                    <th className="px-4 py-3">장소</th>
                    <th className="px-4 py-3">동작</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedGuide.schedule.map((scheduleItem, index) => (
                    <tr className="border-t border-gray-100" key={scheduleItem.id}>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            aria-label="위로"
                            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                            onClick={() => moveScheduleItem(selectedGuide.id, scheduleItem.id, "up")}
                            type="button"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            aria-label="아래로"
                            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                            onClick={() =>
                              moveScheduleItem(selectedGuide.id, scheduleItem.id, "down")
                            }
                            type="button"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <span className="self-center text-gray-500">{index + 1}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className={compactFieldClass}
                          onChange={(event) =>
                            updateScheduleItem(selectedGuide.id, scheduleItem.id, {
                              startAt: getIsoDateTimeValue(event.target.value),
                            })
                          }
                          type="datetime-local"
                          value={getLocalDateTimeValue(scheduleItem.startAt)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className={compactFieldClass}
                          onChange={(event) =>
                            updateScheduleItem(selectedGuide.id, scheduleItem.id, {
                              endAt: getIsoDateTimeValue(event.target.value),
                            })
                          }
                          type="datetime-local"
                          value={getLocalDateTimeValue(scheduleItem.endAt)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className={compactFieldClass}
                          onChange={(event) =>
                            updateScheduleItem(selectedGuide.id, scheduleItem.id, {
                              title: event.target.value,
                            })
                          }
                          value={scheduleItem.title}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className={compactFieldClass}
                          onChange={(event) =>
                            updateScheduleItem(selectedGuide.id, scheduleItem.id, {
                              description: event.target.value,
                            })
                          }
                          value={scheduleItem.description}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className={compactFieldClass}
                          onChange={(event) =>
                            updateScheduleItem(selectedGuide.id, scheduleItem.id, {
                              location: event.target.value,
                            })
                          }
                          value={scheduleItem.location}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
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
                            icon={<Trash2 className="h-4 w-4" />}
                            onClick={() => deleteScheduleItem(selectedGuide.id, scheduleItem.id)}
                            variant="danger"
                          >
                            삭제
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === "events" ? (
        <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className={`${panelClass} h-fit`}>
            <form className="space-y-3" onSubmit={handleAddEvent}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold">이벤트 선택</h2>
                <Button icon={<Plus className="h-4 w-4" />} type="submit">
                  추가
                </Button>
              </div>
              <input
                className={compactFieldClass}
                onChange={(event) => setEventTitle(event.target.value)}
                placeholder="이벤트명"
                value={eventTitle}
              />
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <select
                  className={compactFieldClass}
                  onChange={(event) => setEventTemplateId(event.target.value as EventTemplateId)}
                  value={eventTemplateId}
                >
                  <option value="activity">액티비티 사전 설문</option>
                  <option value="bowling">볼링 대회 레벨 테스트</option>
                </select>
                <select
                  className={compactFieldClass}
                  onChange={(event) => setEventStatus(event.target.value as EventStatus)}
                  value={eventStatus}
                >
                  {Object.entries(eventStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </form>

            <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
              {selectedGuide.events.length > 0 ? (
                selectedGuide.events.map((eventItem) => {
                  const isSelected = selectedAdminEvent?.id === eventItem.id;

                  return (
                    <button
                      className={cn(
                        "w-full rounded-lg border px-3 py-3 text-left transition",
                        isSelected
                          ? "border-brand-600 bg-brand-50"
                          : "border-gray-200 bg-white hover:bg-gray-50",
                      )}
                      key={eventItem.id}
                      onClick={() => setSelectedEventId(eventItem.id)}
                      type="button"
                    >
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-1 text-[11px] font-bold",
                          isSelected ? "bg-brand-700 text-white" : "bg-gray-100 text-gray-600",
                        )}
                      >
                        {eventStatusLabels[eventItem.status]}
                      </span>
                      <p className="mt-2 text-sm font-bold text-gray-950">{eventItem.title}</p>
                      <p className="mt-1 text-xs font-semibold text-gray-500">
                        {eventItem.requiresTeamAssignment ? "조 배정 필요" : "조 배정 없음"}
                      </p>
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500">등록된 이벤트가 없습니다.</p>
              )}
            </div>
          </aside>

          {selectedAdminEvent ? (
            (() => {
              const groupDraft = groupDrafts[selectedAdminEvent.id] ?? {
                teamName: "",
                membersText: "",
                memo: "",
              };

              return (
                <div className="space-y-4">
                  <section className={panelClass}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-bold text-brand-700">선택한 이벤트</p>
                        <h2 className="mt-1 text-xl font-bold text-gray-950">
                          {selectedAdminEvent.title}
                        </h2>
                      </div>
                      <Button
                        icon={<Trash2 className="h-4 w-4" />}
                        onClick={() => {
                          deleteEvent(selectedGuide.id, selectedAdminEvent.id);
                          setSelectedEventId(undefined);
                        }}
                        variant="danger"
                      >
                        삭제
                      </Button>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <label>
                        <span className={labelClass}>이벤트명</span>
                        <input
                          className={fieldClass}
                          onChange={(inputEvent) =>
                            updateEvent(selectedGuide.id, selectedAdminEvent.id, {
                              title: inputEvent.target.value,
                            })
                          }
                          value={selectedAdminEvent.title}
                        />
                      </label>
                      <label>
                        <span className={labelClass}>상태</span>
                        <select
                          className={fieldClass}
                          onChange={(selectEvent) =>
                            updateEvent(selectedGuide.id, selectedAdminEvent.id, {
                              status: selectEvent.target.value as EventStatus,
                            })
                          }
                          value={selectedAdminEvent.status}
                        >
                          {Object.entries(eventStatusLabels).map(([value, label]) => (
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
                          onChange={(inputEvent) =>
                            updateEvent(selectedGuide.id, selectedAdminEvent.id, {
                              description: inputEvent.target.value,
                            })
                          }
                          value={selectedAdminEvent.description}
                        />
                      </label>
                      <label>
                        <span className={labelClass}>오픈</span>
                        <input
                          className={fieldClass}
                          onChange={(inputEvent) =>
                            updateEvent(selectedGuide.id, selectedAdminEvent.id, {
                              opensAt: getIsoDateTimeValue(inputEvent.target.value),
                            })
                          }
                          type="datetime-local"
                          value={getLocalDateTimeValue(selectedAdminEvent.opensAt)}
                        />
                      </label>
                      <label>
                        <span className={labelClass}>종료</span>
                        <input
                          className={fieldClass}
                          onChange={(inputEvent) =>
                            updateEvent(selectedGuide.id, selectedAdminEvent.id, {
                              closesAt: getIsoDateTimeValue(inputEvent.target.value),
                            })
                          }
                          type="datetime-local"
                          value={getLocalDateTimeValue(selectedAdminEvent.closesAt)}
                        />
                      </label>
                      <label className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-gray-700">
                        <input
                          checked={selectedAdminEvent.requiresTeamAssignment}
                          className="h-4 w-4 accent-brand-700"
                          onChange={(inputEvent) =>
                            updateEvent(selectedGuide.id, selectedAdminEvent.id, {
                              requiresTeamAssignment: inputEvent.target.checked,
                            })
                          }
                          type="checkbox"
                        />
                        조 배정 필요
                      </label>
                      <label>
                        <span className={labelClass}>관리자 메모</span>
                        <input
                          className={fieldClass}
                          onChange={(inputEvent) =>
                            updateEvent(selectedGuide.id, selectedAdminEvent.id, {
                              resultSummary: inputEvent.target.value,
                            })
                          }
                          value={selectedAdminEvent.resultSummary ?? ""}
                        />
                      </label>
                    </div>
                  </section>

                  <section className={panelClass}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-bold">설문 문항</h3>
                      <Button
                        icon={<Plus className="h-4 w-4" />}
                        onClick={() =>
                          addSurveyQuestion(selectedGuide.id, selectedAdminEvent.id, createQuestion())
                        }
                        variant="secondary"
                      >
                        문항 추가
                      </Button>
                    </div>
                    <div className="mt-3 space-y-3">
                      {selectedAdminEvent.survey.length > 0 ? (
                        selectedAdminEvent.survey.map((question, questionIndex) => (
                          <div
                            className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                            key={question.id}
                          >
                            <div className="grid gap-3 md:grid-cols-[10rem_minmax(0,1fr)_auto]">
                              <select
                                className={compactFieldClass}
                                onChange={(selectEvent) =>
                                  updateSurveyQuestion(
                                    selectedGuide.id,
                                    selectedAdminEvent.id,
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
                              <input
                                className={compactFieldClass}
                                onChange={(inputEvent) =>
                                  updateSurveyQuestion(
                                    selectedGuide.id,
                                    selectedAdminEvent.id,
                                    question.id,
                                    { label: inputEvent.target.value },
                                  )
                                }
                                value={question.label}
                              />
                              <div className="flex gap-2">
                                <Button
                                  disabled={questionIndex === 0}
                                  icon={<ArrowUp className="h-4 w-4" />}
                                  onClick={() =>
                                    moveSurveyQuestion(
                                      selectedGuide.id,
                                      selectedAdminEvent.id,
                                      question.id,
                                      "up",
                                    )
                                  }
                                  variant="secondary"
                                >
                                  위
                                </Button>
                                <Button
                                  disabled={questionIndex === selectedAdminEvent.survey.length - 1}
                                  icon={<ArrowDown className="h-4 w-4" />}
                                  onClick={() =>
                                    moveSurveyQuestion(
                                      selectedGuide.id,
                                      selectedAdminEvent.id,
                                      question.id,
                                      "down",
                                    )
                                  }
                                  variant="secondary"
                                >
                                  아래
                                </Button>
                                <Button
                                  icon={<Trash2 className="h-4 w-4" />}
                                  onClick={() =>
                                    deleteSurveyQuestion(
                                      selectedGuide.id,
                                      selectedAdminEvent.id,
                                      question.id,
                                    )
                                  }
                                  variant="danger"
                                >
                                  삭제
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              <input
                                className={compactFieldClass}
                                onChange={(inputEvent) =>
                                  updateSurveyQuestion(
                                    selectedGuide.id,
                                    selectedAdminEvent.id,
                                    question.id,
                                    { description: inputEvent.target.value },
                                  )
                                }
                                placeholder="문항 설명"
                                value={question.description ?? ""}
                              />
                              <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <input
                                  checked={question.required ?? false}
                                  className="h-4 w-4 accent-brand-700"
                                  onChange={(inputEvent) =>
                                    updateSurveyQuestion(
                                      selectedGuide.id,
                                      selectedAdminEvent.id,
                                      question.id,
                                      { required: inputEvent.target.checked },
                                    )
                                  }
                                  type="checkbox"
                                />
                                필수
                              </label>
                            </div>
                            {question.type === "singleChoice" ||
                            question.type === "multipleChoice" ? (
                              <input
                                className={`${compactFieldClass} mt-3`}
                                onChange={(inputEvent) =>
                                  updateSurveyQuestion(
                                    selectedGuide.id,
                                    selectedAdminEvent.id,
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
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
                          등록된 문항이 없습니다.
                        </p>
                      )}
                    </div>
                  </section>

                  <section className={`${panelClass} overflow-hidden p-0`}>
                    <div className="border-b border-gray-200 p-4">
                      <h3 className="font-bold">응답 관리</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[48rem] text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500">
                          <tr>
                            <th className="px-4 py-3">응답자</th>
                            <th className="px-4 py-3">제출 시간</th>
                            <th className="px-4 py-3">답변</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedEventResponses.length > 0 ? (
                            selectedEventResponses.map((response) => (
                              <tr className="border-t border-gray-100" key={response.id}>
                                <td className="px-4 py-3 font-semibold">
                                  {response.participantName}
                                </td>
                                <td className="px-4 py-3">
                                  {new Date(response.submittedAt).toLocaleString("ko-KR")}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="space-y-1">
                                    {Object.entries(response.answers).map(([questionId, answer]) => {
                                      const question = selectedAdminEvent.survey.find(
                                        (item) => item.id === questionId,
                                      );

                                      return (
                                        <p key={questionId}>
                                          <span className="font-semibold">
                                            {question?.label ?? questionId}:
                                          </span>{" "}
                                          {formatAnswerValue(answer)}
                                        </p>
                                      );
                                    })}
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="px-4 py-8 text-center text-gray-500" colSpan={3}>
                                이 이벤트에 저장된 응답이 없습니다.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {selectedAdminEvent.requiresTeamAssignment ? (
                    <section className={panelClass}>
                      <h3 className="font-bold">조 배정 관리</h3>
                      <div className="mt-3 grid gap-2 md:grid-cols-[12rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <input
                          className={compactFieldClass}
                          onChange={(inputEvent) =>
                            setGroupDrafts({
                              ...groupDrafts,
                              [selectedAdminEvent.id]: {
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
                              [selectedAdminEvent.id]: {
                                ...groupDraft,
                                membersText: inputEvent.target.value,
                              },
                            })
                          }
                          placeholder="참가자명을 쉼표로 구분"
                          value={groupDraft.membersText}
                        />
                        <input
                          className={compactFieldClass}
                          onChange={(inputEvent) =>
                            setGroupDrafts({
                              ...groupDrafts,
                              [selectedAdminEvent.id]: {
                                ...groupDraft,
                                memo: inputEvent.target.value,
                              },
                            })
                          }
                          placeholder="메모"
                          value={groupDraft.memo}
                        />
                        <Button
                          onClick={() => {
                            if (!groupDraft.teamName.trim()) {
                              return;
                            }

                            addEventTeam(selectedGuide.id, selectedAdminEvent.id, {
                              id: createId("team"),
                              eventId: selectedAdminEvent.id,
                              name: groupDraft.teamName.trim(),
                              members: groupDraft.membersText
                                .split(",")
                                .map((member) => member.trim())
                                .filter(Boolean),
                              memo: groupDraft.memo.trim(),
                            });
                            setGroupDrafts({
                              ...groupDrafts,
                              [selectedAdminEvent.id]: {
                                teamName: "",
                                membersText: "",
                                memo: "",
                              },
                            });
                          }}
                          variant="secondary"
                        >
                          추가
                        </Button>
                      </div>

                      <div className="mt-3 space-y-2">
                        {selectedAdminEvent.teams.length > 0 ? (
                          selectedAdminEvent.teams.map((team) => (
                            <div
                              className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                              key={team.id}
                            >
                              <div className="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
                                <input
                                  className={compactFieldClass}
                                  onChange={(inputEvent) =>
                                    updateEventTeam(
                                      selectedGuide.id,
                                      selectedAdminEvent.id,
                                      team.id,
                                      { name: inputEvent.target.value },
                                    )
                                  }
                                  value={team.name}
                                />
                                <input
                                  className={compactFieldClass}
                                  onChange={(inputEvent) =>
                                    updateEventTeam(
                                      selectedGuide.id,
                                      selectedAdminEvent.id,
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
                                <input
                                  className={compactFieldClass}
                                  onChange={(inputEvent) =>
                                    updateEventTeam(
                                      selectedGuide.id,
                                      selectedAdminEvent.id,
                                      team.id,
                                      { memo: inputEvent.target.value },
                                    )
                                  }
                                  value={team.memo ?? ""}
                                />
                                <Button
                                  icon={<Trash2 className="h-4 w-4" />}
                                  onClick={() =>
                                    deleteEventTeam(
                                      selectedGuide.id,
                                      selectedAdminEvent.id,
                                      team.id,
                                    )
                                  }
                                  variant="danger"
                                >
                                  삭제
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">생성된 조가 없습니다.</p>
                        )}
                      </div>

                      <div className="mt-5 overflow-x-auto border-t border-gray-100 pt-4">
                        <table className="w-full min-w-[38rem] text-left text-sm">
                          <thead className="text-gray-500">
                            <tr>
                              <th className="px-3 py-2">응답자</th>
                              <th className="px-3 py-2">배정 조</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedEventResponses.length > 0 ? (
                              selectedEventResponses.map((response) => {
                                const assignedTeam =
                                  selectedAdminEvent.teams.find(
                                    (team) => team.id === response.assignedTeamId,
                                  ) ??
                                  selectedAdminEvent.teams.find((team) =>
                                    team.members.includes(response.participantName),
                                  );

                                return (
                                  <tr className="border-t border-gray-100" key={response.id}>
                                    <td className="px-3 py-2 font-semibold">
                                      {response.participantName}
                                    </td>
                                    <td className="px-3 py-2">
                                      <select
                                        className={compactFieldClass}
                                        onChange={(selectEvent) =>
                                          assignEventResponseTeam(
                                            selectedGuide.id,
                                            selectedAdminEvent.id,
                                            response.participantName,
                                            selectEvent.target.value || undefined,
                                          )
                                        }
                                        value={assignedTeam?.id ?? ""}
                                      >
                                        <option value="">미배정</option>
                                        {selectedAdminEvent.teams.map((team) => (
                                          <option key={team.id} value={team.id}>
                                            {team.name}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td className="px-3 py-6 text-center text-gray-500" colSpan={2}>
                                  조를 배정할 응답자가 없습니다.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ) : (
                    <section className={panelClass}>
                      <h3 className="font-bold">조 배정 관리</h3>
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        이 이벤트는 조 배정이 필요 없는 설문입니다.
                      </p>
                    </section>
                  )}
                </div>
              );
            })()
          ) : (
            <Card>
              <p className="text-sm text-gray-500">관리할 이벤트를 추가해 주세요.</p>
            </Card>
          )}
        </div>
      ) : null}

      {activeSection === "recommendations" ? (
        <div className="space-y-4">
          <form className={panelClass} onSubmit={handleAddRecommendation}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold">추천 코스 추가</h2>
              <Button icon={<Plus className="h-4 w-4" />} type="submit">
                추가
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label>
                <span className={labelClass}>제목</span>
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
                <span className={labelClass}>위치</span>
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
                <span className={labelClass}>분류</span>
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
                  rows={3}
                  value={recommendationDraft.description}
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
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
            </div>
          </form>

          <div className="grid gap-3 lg:grid-cols-2">
            {selectedGuide.recommendations.map((recommendation) => (
              <section className={panelClass} key={recommendation.id}>
                <div className="flex gap-3">
                  <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    <img
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.src = "/assets/konjiam-map-base.png";
                      }}
                      src={recommendation.imageUrl}
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      className={compactFieldClass}
                      onChange={(event) =>
                        updateRecommendation(selectedGuide.id, recommendation.id, {
                          title: event.target.value,
                        })
                      }
                      value={recommendation.title}
                    />
                    <input
                      className={compactFieldClass}
                      onChange={(event) =>
                        updateRecommendation(selectedGuide.id, recommendation.id, {
                          locationLabel: event.target.value,
                        })
                      }
                      value={recommendation.locationLabel}
                    />
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <input
                    className={compactFieldClass}
                    onChange={(event) =>
                      updateRecommendation(selectedGuide.id, recommendation.id, {
                        category: event.target.value,
                      })
                    }
                    value={recommendation.category}
                  />
                  <input
                    className={compactFieldClass}
                    onChange={(event) =>
                      updateRecommendation(selectedGuide.id, recommendation.id, {
                        imageUrl: event.target.value,
                      })
                    }
                    value={recommendation.imageUrl}
                  />
                </div>
                <textarea
                  className={`${compactFieldClass} mt-2`}
                  onChange={(event) =>
                    updateRecommendation(selectedGuide.id, recommendation.id, {
                      description: event.target.value,
                    })
                  }
                  rows={3}
                  value={recommendation.description}
                />
                <div className="mt-3 flex flex-wrap justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input
                      checked={recommendation.isVisible}
                      onChange={(event) =>
                        updateRecommendation(selectedGuide.id, recommendation.id, {
                          isVisible: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                    노출
                  </label>
                  <Button
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => deleteRecommendation(selectedGuide.id, recommendation.id)}
                    variant="danger"
                  >
                    삭제
                  </Button>
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}

      {activeSection === "announcements" ? (
        <div className="space-y-4">
          <form className={panelClass} onSubmit={handleAddAnnouncement}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold">공지 등록</h2>
              <Button icon={<Plus className="h-4 w-4" />} type="submit">
                추가
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label>
                <span className={labelClass}>제목</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setAnnouncementDraft({ ...announcementDraft, title: event.target.value })
                  }
                  value={announcementDraft.title}
                />
              </label>
              <div className="flex items-end gap-4">
                <label className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-gray-700">
                  <input
                    checked={announcementDraft.isImportant}
                    onChange={(event) =>
                      setAnnouncementDraft({
                        ...announcementDraft,
                        isImportant: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                  중요
                </label>
                <label className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-gray-700">
                  <input
                    checked={announcementDraft.showOnHomeBanner}
                    onChange={(event) =>
                      setAnnouncementDraft({
                        ...announcementDraft,
                        showOnHomeBanner: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                  배너
                </label>
              </div>
              <label className="md:col-span-2">
                <span className={labelClass}>내용</span>
                <textarea
                  className={fieldClass}
                  onChange={(event) =>
                    setAnnouncementDraft({ ...announcementDraft, body: event.target.value })
                  }
                  rows={3}
                  value={announcementDraft.body}
                />
              </label>
            </div>
          </form>

          <div className="space-y-3">
            {selectedGuide.announcements.map((announcement) => (
              <section className={panelClass} key={announcement.id}>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    className={compactFieldClass}
                    onChange={(event) =>
                      updateAnnouncement(selectedGuide.id, announcement.id, {
                        title: event.target.value,
                      })
                    }
                    value={announcement.title}
                  />
                  <Button
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => deleteAnnouncement(selectedGuide.id, announcement.id)}
                    variant="danger"
                  >
                    삭제
                  </Button>
                </div>
                <textarea
                  className={`${compactFieldClass} mt-3`}
                  onChange={(event) =>
                    updateAnnouncement(selectedGuide.id, announcement.id, {
                      body: event.target.value,
                    })
                  }
                  rows={3}
                  value={announcement.body}
                />
                <div className="mt-3 flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input
                      checked={announcement.isImportant}
                      onChange={(event) =>
                        updateAnnouncement(selectedGuide.id, announcement.id, {
                          isImportant: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                    중요 공지
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input
                      checked={announcement.showOnHomeBanner}
                      onChange={(event) =>
                        updateAnnouncement(selectedGuide.id, announcement.id, {
                          showOnHomeBanner: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                    홈 배너
                  </label>
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}

    </section>
  );
};
