import { FormEvent, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Lock,
  LogOut,
  MapPin,
  Megaphone,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { cn } from "../../lib/cn";
import { useWorkshopStore } from "../../store/workshopStore";
import type {
  AnnouncementItem,
  EventItem,
  EventStatus,
  RecommendationItem,
  ScheduleCategory,
  ScheduleItem,
  SurveyQuestion,
  SurveyQuestionType,
  WorkshopGuide,
} from "../../types/workshop";

interface AdminPageProps {
  onBack: () => void;
}

type AdminSectionId =
  | "guides"
  | "map"
  | "schedule"
  | "events"
  | "recommendations"
  | "announcements"
  | "participants"
  | "settings";

type EventTemplateId = "activity" | "bowling";

const adminSections: Array<{
  id: AdminSectionId;
  label: string;
  icon: typeof ClipboardList;
}> = [
  { id: "guides", label: "회차", icon: ClipboardList },
  { id: "map", label: "장소", icon: MapPin },
  { id: "schedule", label: "일정", icon: CalendarClock },
  { id: "events", label: "이벤트", icon: CheckCircle2 },
  { id: "recommendations", label: "추천", icon: Sparkles },
  { id: "announcements", label: "공지", icon: Megaphone },
  { id: "participants", label: "참가자", icon: Users },
  { id: "settings", label: "설정", icon: Settings },
];

const eventStatusLabels: Record<EventStatus, string> = {
  waiting: "대기",
  active: "진행중",
  closed: "완료",
};

const scheduleCategoryLabels: Record<ScheduleCategory, string> = {
  orientation: "오리엔테이션",
  session: "세션",
  break: "휴식",
  meal: "식사",
  activity: "액티비티",
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

const formatAnswerValue = (value: string | string[]) =>
  Array.isArray(value) ? value.join(", ") : value;

const createEventFromTemplate = (
  templateId: EventTemplateId,
  title: string,
  status: EventStatus,
): EventItem => {
  const now = new Date();
  const closesAt = new Date(now.getTime() + 60 * 60 * 1000);

  if (templateId === "bowling") {
    return {
      id: createId("event"),
      title: title || "볼링 대회 레벨 테스트",
      description: "공정한 조 편성을 위해 볼링 경험을 확인합니다.",
      status,
      opensAt: now.toISOString(),
      closesAt: closesAt.toISOString(),
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
      groupAssignments: [],
    };
  }

  return {
    id: createId("event"),
    title: title || "액티비티 사전 설문",
    description: "유료 액티비티 참여 의사와 선호 종목을 확인합니다.",
    status,
    opensAt: now.toISOString(),
    closesAt: closesAt.toISOString(),
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
    groupAssignments: [],
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
    locationLabel: draft.locationLabel || selectedGuide.locationLabel,
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
    addGroupAssignment,
    addRecommendation,
    addScheduleItem,
    addSurveyQuestion,
    changeAdminPassword,
    createGuide,
    defaultGuide,
    deleteAnnouncement,
    deleteEvent,
    deleteGroupAssignment,
    deleteGuide,
    deleteRecommendation,
    deleteScheduleItem,
    deleteSurveyQuestion,
    eventResponses,
    guides,
    isAdminUnlocked,
    lockAdmin,
    moveScheduleItem,
    participantProfile,
    participants,
    selectGuide,
    selectedGuide,
    setDefaultGuide,
    unlockAdmin,
    updateAnnouncement,
    updateEvent,
    updateGuide,
    updateMapLocation,
    updateRecommendation,
    updateScheduleControl,
    updateScheduleItem,
    updateSurveyQuestion,
  } = useWorkshopStore();
  const [activeSection, setActiveSection] = useState<AdminSectionId>("guides");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [guideDraft, setGuideDraft] = useState({
    title: "",
    year: String(new Date().getFullYear()),
    round: "",
    periodLabel: "",
    locationLabel: "",
  });
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
    Record<string, { groupName: string; membersText: string }>
  >({});
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");

  const selectedGuideResponses = eventResponses.filter(
    (response) => response.guideId === selectedGuide.id,
  );
  const participantNames = useMemo(
    () =>
      Array.from(
        new Set(
          [
            participantProfile?.name,
            ...participants.map((participant) => participant.name),
            ...eventResponses.map((response) => response.participantName),
          ].filter(Boolean) as string[],
        ),
      ),
    [eventResponses, participantProfile?.name, participants],
  );

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
      locationLabel: "",
    });
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
    addEvent(
      selectedGuide.id,
      createEventFromTemplate(eventTemplateId, eventTitle.trim(), eventStatus),
    );
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
      <section className="mx-auto max-w-sm space-y-4">
        <Button icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack} variant="ghost">
          돌아가기
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
    <section className="space-y-4 pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">관리자</p>
          <h1 className="text-2xl font-bold">가이드 관리</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack} variant="ghost">
            돌아가기
          </Button>
          <Button icon={<LogOut className="h-4 w-4" />} onClick={lockAdmin} variant="secondary">
            로그아웃
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <p className="text-sm text-gray-500">기본 회차</p>
          <p className="mt-1 text-lg font-bold">{defaultGuide.title}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">선택 회차</p>
          <p className="mt-1 text-lg font-bold">{selectedGuide.title}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">참가자</p>
          <p className="mt-1 text-lg font-bold">{participantNames.length}명</p>
        </Card>
      </div>

      <nav className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 shadow-soft">
        <div className="flex min-w-max gap-1">
          {adminSections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            return (
              <button
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold transition",
                  isActive
                    ? "bg-brand-700 text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                )}
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </button>
            );
          })}
        </div>
      </nav>

      {activeSection === "guides" ? (
        <div className="space-y-4">
          <form className={panelClass} onSubmit={handleCreateGuide}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold">회차 생성</h2>
              <Button icon={<Plus className="h-4 w-4" />} type="submit">
                추가
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-5">
              <label>
                <span className={labelClass}>가이드명</span>
                <input
                  className={fieldClass}
                  onChange={(event) => setGuideDraft({ ...guideDraft, title: event.target.value })}
                  placeholder="2027 워크숍 가이드"
                  value={guideDraft.title}
                />
              </label>
              <label>
                <span className={labelClass}>연도</span>
                <input
                  className={fieldClass}
                  onChange={(event) => setGuideDraft({ ...guideDraft, year: event.target.value })}
                  type="number"
                  value={guideDraft.year}
                />
              </label>
              <label>
                <span className={labelClass}>회차</span>
                <input
                  className={fieldClass}
                  onChange={(event) => setGuideDraft({ ...guideDraft, round: event.target.value })}
                  type="number"
                  value={guideDraft.round}
                />
              </label>
              <label>
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
          </form>

          <div className={panelClass}>
            <h2 className="font-bold">선택 회차 수정</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
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
            <div className="mt-4 flex flex-wrap gap-2">
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
                삭제
              </Button>
            </div>
          </div>

          <div className={`${panelClass} overflow-hidden p-0`}>
            <div className="border-b border-gray-200 p-4">
              <h2 className="font-bold">회차 목록</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-3">회차</th>
                    <th className="px-4 py-3">가이드</th>
                    <th className="px-4 py-3">장소</th>
                    <th className="px-4 py-3">노출</th>
                    <th className="px-4 py-3">동작</th>
                  </tr>
                </thead>
                <tbody>
                  {guides.map((guide) => (
                    <tr className="border-t border-gray-100" key={guide.id}>
                      <td className="px-4 py-3">{guide.round}회차</td>
                      <td className="px-4 py-3 font-semibold">{guide.title}</td>
                      <td className="px-4 py-3">{guide.locationLabel}</td>
                      <td className="px-4 py-3">
                        {guide.isDefault ? "기본" : guide.isPublished ? "공개" : "비공개"}
                      </td>
                      <td className="px-4 py-3">
                        <Button onClick={() => selectGuide(guide.id)} variant="secondary">
                          확인
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

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
              <h2 className="font-bold">장소 관리</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-3">장소명</th>
                    <th className="px-4 py-3">X</th>
                    <th className="px-4 py-3">Y</th>
                    <th className="px-4 py-3">워크숍 사용</th>
                    <th className="px-4 py-3">흡연구역</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedGuide.map.locations.map((location) => (
                    <tr className="border-t border-gray-100" key={location.id}>
                      <td className="px-4 py-3">
                        <input
                          className={compactFieldClass}
                          onChange={(event) =>
                            updateMapLocation(selectedGuide.id, location.id, {
                              name: event.target.value,
                            })
                          }
                          value={location.name}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className={compactFieldClass}
                          onChange={(event) =>
                            updateMapLocation(selectedGuide.id, location.id, {
                              xPercent: Number(event.target.value),
                            })
                          }
                          type="number"
                          value={location.xPercent}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className={compactFieldClass}
                          onChange={(event) =>
                            updateMapLocation(selectedGuide.id, location.id, {
                              yPercent: Number(event.target.value),
                            })
                          }
                          type="number"
                          value={location.yPercent}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          checked={location.isWorkshopLocation}
                          onChange={(event) =>
                            updateMapLocation(selectedGuide.id, location.id, {
                              isWorkshopLocation: event.target.checked,
                            })
                          }
                          type="checkbox"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          checked={location.isSmokingArea}
                          onChange={(event) =>
                            updateMapLocation(selectedGuide.id, location.id, {
                              isSmokingArea: event.target.checked,
                            })
                          }
                          type="checkbox"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
        <div className="space-y-4">
          <form className={panelClass} onSubmit={handleAddEvent}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold">이벤트 추가</h2>
              <Button icon={<Plus className="h-4 w-4" />} type="submit">
                추가
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label>
                <span className={labelClass}>이벤트명</span>
                <input
                  className={fieldClass}
                  onChange={(event) => setEventTitle(event.target.value)}
                  placeholder="비워두면 템플릿 이름 사용"
                  value={eventTitle}
                />
              </label>
              <label>
                <span className={labelClass}>템플릿</span>
                <select
                  className={fieldClass}
                  onChange={(event) => setEventTemplateId(event.target.value as EventTemplateId)}
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
          </form>

          {selectedGuide.events.map((eventItem) => {
            const groupDraft = groupDrafts[eventItem.id] ?? { groupName: "", membersText: "" };

            return (
              <section className={panelClass} key={eventItem.id}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="grid flex-1 gap-3 md:grid-cols-2">
                    <label>
                      <span className={labelClass}>이벤트명</span>
                      <input
                        className={fieldClass}
                        onChange={(inputEvent) =>
                          updateEvent(selectedGuide.id, eventItem.id, {
                            title: inputEvent.target.value,
                          })
                        }
                        value={eventItem.title}
                      />
                    </label>
                    <label>
                      <span className={labelClass}>상태</span>
                      <select
                        className={fieldClass}
                        onChange={(selectEvent) =>
                          updateEvent(selectedGuide.id, eventItem.id, {
                            status: selectEvent.target.value as EventStatus,
                          })
                        }
                        value={eventItem.status}
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
                          updateEvent(selectedGuide.id, eventItem.id, {
                            description: inputEvent.target.value,
                          })
                        }
                        value={eventItem.description}
                      />
                    </label>
                  </div>
                  <Button
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => deleteEvent(selectedGuide.id, eventItem.id)}
                    variant="danger"
                  >
                    삭제
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label>
                    <span className={labelClass}>오픈</span>
                    <input
                      className={fieldClass}
                      onChange={(inputEvent) =>
                        updateEvent(selectedGuide.id, eventItem.id, {
                          opensAt: getIsoDateTimeValue(inputEvent.target.value),
                        })
                      }
                      type="datetime-local"
                      value={getLocalDateTimeValue(eventItem.opensAt)}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>종료</span>
                    <input
                      className={fieldClass}
                      onChange={(inputEvent) =>
                        updateEvent(selectedGuide.id, eventItem.id, {
                          closesAt: getIsoDateTimeValue(inputEvent.target.value),
                        })
                      }
                      type="datetime-local"
                      value={getLocalDateTimeValue(eventItem.closesAt)}
                    />
                  </label>
                  <label className="md:col-span-2">
                    <span className={labelClass}>결과 요약</span>
                    <input
                      className={fieldClass}
                      onChange={(inputEvent) =>
                        updateEvent(selectedGuide.id, eventItem.id, {
                          resultSummary: inputEvent.target.value,
                        })
                      }
                      value={eventItem.resultSummary ?? ""}
                    />
                  </label>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                  <h3 className="font-bold">설문 문항</h3>
                  <Button
                    icon={<Plus className="h-4 w-4" />}
                    onClick={() => addSurveyQuestion(selectedGuide.id, eventItem.id, createQuestion())}
                    variant="secondary"
                  >
                    문항 추가
                  </Button>
                </div>
                <div className="mt-3 space-y-3">
                  {eventItem.survey.map((question) => (
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3" key={question.id}>
                      <div className="grid gap-3 md:grid-cols-[10rem_minmax(0,1fr)_auto]">
                        <select
                          className={compactFieldClass}
                          onChange={(selectEvent) =>
                            updateSurveyQuestion(selectedGuide.id, eventItem.id, question.id, {
                              type: selectEvent.target.value as SurveyQuestionType,
                            })
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
                            updateSurveyQuestion(selectedGuide.id, eventItem.id, question.id, {
                              label: inputEvent.target.value,
                            })
                          }
                          value={question.label}
                        />
                        <Button
                          icon={<Trash2 className="h-4 w-4" />}
                          onClick={() =>
                            deleteSurveyQuestion(selectedGuide.id, eventItem.id, question.id)
                          }
                          variant="danger"
                        >
                          삭제
                        </Button>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <input
                          className={compactFieldClass}
                          onChange={(inputEvent) =>
                            updateSurveyQuestion(selectedGuide.id, eventItem.id, question.id, {
                              description: inputEvent.target.value,
                            })
                          }
                          placeholder="문항 설명"
                          value={question.description ?? ""}
                        />
                        <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <input
                            checked={question.required ?? false}
                            onChange={(inputEvent) =>
                              updateSurveyQuestion(selectedGuide.id, eventItem.id, question.id, {
                                required: inputEvent.target.checked,
                              })
                            }
                            type="checkbox"
                          />
                          필수
                        </label>
                      </div>
                      {question.type === "singleChoice" || question.type === "multipleChoice" ? (
                        <input
                          className={`${compactFieldClass} mt-3`}
                          onChange={(inputEvent) =>
                            updateSurveyQuestion(selectedGuide.id, eventItem.id, question.id, {
                              options: inputEvent.target.value
                                .split(",")
                                .map((option) => option.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="옵션을 쉼표로 구분"
                          value={question.options?.join(", ") ?? ""}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="mt-5 border-t border-gray-100 pt-4">
                  <h3 className="font-bold">조 구성</h3>
                  <div className="mt-3 grid gap-2 md:grid-cols-[12rem_minmax(0,1fr)_auto]">
                    <input
                      className={compactFieldClass}
                      onChange={(inputEvent) =>
                        setGroupDrafts({
                          ...groupDrafts,
                          [eventItem.id]: {
                            ...groupDraft,
                            groupName: inputEvent.target.value,
                          },
                        })
                      }
                      placeholder="조 이름"
                      value={groupDraft.groupName}
                    />
                    <input
                      className={compactFieldClass}
                      onChange={(inputEvent) =>
                        setGroupDrafts({
                          ...groupDrafts,
                          [eventItem.id]: {
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
                        if (!groupDraft.groupName.trim()) {
                          return;
                        }

                        addGroupAssignment(selectedGuide.id, eventItem.id, {
                          groupName: groupDraft.groupName.trim(),
                          members: groupDraft.membersText
                            .split(",")
                            .map((member) => member.trim())
                            .filter(Boolean),
                        });
                        setGroupDrafts({
                          ...groupDrafts,
                          [eventItem.id]: { groupName: "", membersText: "" },
                        });
                      }}
                      variant="secondary"
                    >
                      배정
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(eventItem.groupAssignments ?? []).map((groupAssignment) => (
                      <span
                        className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm"
                        key={groupAssignment.groupName}
                      >
                        <strong>{groupAssignment.groupName}</strong>
                        {groupAssignment.members.join(", ")}
                        <button
                          aria-label="조 삭제"
                          className="rounded-full p-1 text-red-600 hover:bg-red-50"
                          onClick={() =>
                            deleteGroupAssignment(
                              selectedGuide.id,
                              eventItem.id,
                              groupAssignment.groupName,
                            )
                          }
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}

          <div className={`${panelClass} overflow-hidden p-0`}>
            <div className="border-b border-gray-200 p-4">
              <h2 className="font-bold">설문 응답</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-3">이벤트</th>
                    <th className="px-4 py-3">참가자</th>
                    <th className="px-4 py-3">제출 시간</th>
                    <th className="px-4 py-3">답변</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedGuideResponses.length > 0 ? (
                    selectedGuideResponses.map((response) => {
                      const eventItem = selectedGuide.events.find(
                        (item) => item.id === response.eventId,
                      );

                      return (
                        <tr className="border-t border-gray-100" key={response.id}>
                          <td className="px-4 py-3 font-semibold">
                            {eventItem?.title ?? response.eventId}
                          </td>
                          <td className="px-4 py-3">{response.participantName}</td>
                          <td className="px-4 py-3">
                            {new Date(response.submittedAt).toLocaleString("ko-KR")}
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {Object.entries(response.answers).map(([questionId, answer]) => {
                                const question = eventItem?.survey.find(
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
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-4 py-8 text-center text-gray-500" colSpan={4}>
                        저장된 설문 응답이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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

      {activeSection === "participants" ? (
        <div className="space-y-4">
          <div className={`${panelClass} overflow-hidden p-0`}>
            <div className="border-b border-gray-200 p-4">
              <h2 className="font-bold">참가자 목록</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-3">이름</th>
                    <th className="px-4 py-3">응답 수</th>
                    <th className="px-4 py-3">최근 응답</th>
                  </tr>
                </thead>
                <tbody>
                  {participantNames.map((participantName) => {
                    const responses = eventResponses.filter(
                      (response) => response.participantName === participantName,
                    );
                    const latestResponse = responses
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
                      )[0];

                    return (
                      <tr className="border-t border-gray-100" key={participantName}>
                        <td className="px-4 py-3 font-semibold">{participantName}</td>
                        <td className="px-4 py-3">{responses.length}건</td>
                        <td className="px-4 py-3">
                          {latestResponse
                            ? new Date(latestResponse.submittedAt).toLocaleString("ko-KR")
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                  {participantNames.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-gray-500" colSpan={3}>
                        등록된 참가자가 없습니다.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`${panelClass} overflow-hidden p-0`}>
            <div className="border-b border-gray-200 p-4">
              <h2 className="font-bold">참가자별 설문</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-3">참가자</th>
                    <th className="px-4 py-3">이벤트</th>
                    <th className="px-4 py-3">답변</th>
                  </tr>
                </thead>
                <tbody>
                  {eventResponses.map((response) => {
                    const guide = guides.find((item) => item.id === response.guideId);
                    const eventItem = guide?.events.find((item) => item.id === response.eventId);

                    return (
                      <tr className="border-t border-gray-100" key={response.id}>
                        <td className="px-4 py-3 font-semibold">{response.participantName}</td>
                        <td className="px-4 py-3">{eventItem?.title ?? response.eventId}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {Object.entries(response.answers).map(([questionId, answer]) => {
                              const question = eventItem?.survey.find(
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
                    );
                  })}
                  {eventResponses.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-gray-500" colSpan={3}>
                        저장된 설문 응답이 없습니다.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className={panelClass}>
            <h2 className="font-bold">이벤트별 조 구성</h2>
            <div className="mt-3 space-y-3">
              {selectedGuide.events.map((eventItem) => (
                <div className="rounded-lg border border-gray-100 p-3" key={eventItem.id}>
                  <p className="font-semibold">{eventItem.title}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(eventItem.groupAssignments ?? []).length > 0 ? (
                      eventItem.groupAssignments?.map((groupAssignment) => (
                        <span
                          className="rounded-lg bg-gray-100 px-3 py-2 text-sm"
                          key={groupAssignment.groupName}
                        >
                          <strong>{groupAssignment.groupName}</strong> ·{" "}
                          {groupAssignment.members.join(", ")}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">배정된 조가 없습니다.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === "settings" ? (
        <form className={`${panelClass} max-w-lg`} onSubmit={handlePasswordChange}>
          <h2 className="font-bold">관리자 설정</h2>
          <label className="mt-4 block">
            <span className={labelClass}>새 비밀번호</span>
            <input
              className={fieldClass}
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              value={newPassword}
            />
          </label>
          <label className="mt-3 block">
            <span className={labelClass}>새 비밀번호 확인</span>
            <input
              className={fieldClass}
              onChange={(event) => setNewPasswordConfirm(event.target.value)}
              type="password"
              value={newPasswordConfirm}
            />
          </label>
          {settingsMessage ? (
            <p className="mt-3 text-sm font-semibold text-brand-700">{settingsMessage}</p>
          ) : null}
          <Button className="mt-4" type="submit">
            확인
          </Button>
        </form>
      ) : null}
    </section>
  );
};
