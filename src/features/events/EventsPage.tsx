import { type ReactNode, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  PartyPopper,
  Users,
} from "lucide-react";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import {
  bowlingEventBoard,
  bowlingEventOverlay,
  type BowlingOverlayRect,
} from "../../config/bowlingEventOverlay";
import { cn } from "../../lib/cn";
import { useWorkshopStore } from "../../store/workshopStore";
import type {
  EventItem,
  EventKind,
  EventStatus,
  EventSurveyResponse,
  EventType,
  ParticipantProfile,
  SurveyKind,
  SurveyQuestion,
  WorkshopGuideId,
} from "../../types/workshop";

const eventStatusMeta: Record<
  EventStatus,
  {
    label: string;
    className: string;
  }
> = {
  waiting: {
    label: "예정",
    className: "bg-gray-100 text-gray-600",
  },
  active: {
    label: "진행 중",
    className: "bg-brand-50 text-brand-700",
  },
  closed: {
    label: "종료",
    className: "bg-yellow-100 text-yellow-800",
  },
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `event-response-${Date.now()}`;
};

const isAnswered = (value: string | string[] | number | undefined) =>
  Array.isArray(value) ? value.length > 0 : value !== undefined && String(value).trim() !== "";

const formatAnswerValue = (value: string | string[] | number) =>
  Array.isArray(value) ? value.join(", ") : String(value);

const getSurveyAnswerDrafts = (response: EventSurveyResponse | undefined) =>
  Object.fromEntries(
    Object.entries(response?.answers ?? {}).map(([key, value]) => [
      key,
      Array.isArray(value) ? value : String(value),
    ]),
  ) as Record<string, string | string[]>;

interface SurveyQuestionViewProps {
  answer?: string | string[];
  question: SurveyQuestion;
  onChange: (value: string | string[]) => void;
}

const SurveyQuestionView = ({ answer, question, onChange }: SurveyQuestionViewProps) => {
  if (question.type === "description") {
    return (
      <div className="rounded-lg border border-brand-100 bg-brand-50 p-3">
        <p className="text-base font-bold text-brand-950">{question.label}</p>
        {question.description ? (
          <p className="mt-2 text-sm leading-5 text-brand-900/80">{question.description}</p>
        ) : null}
      </div>
    );
  }

  if (question.type === "singleChoice") {
    return (
      <fieldset className="space-y-2">
        <legend className="text-base font-bold text-gray-950">
          {question.label}
          {question.required ? <span className="ml-1 text-brand-700">*</span> : null}
        </legend>
        {question.description ? (
          <p className="text-sm leading-5 text-gray-600">{question.description}</p>
        ) : null}
        <div className="grid gap-2">
          {question.options?.map((option) => (
            <label
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-semibold leading-5 transition",
                answer === option
                  ? "border-brand-600 bg-brand-50 text-brand-900"
                  : "border-gray-200 bg-white text-gray-700",
              )}
              key={option}
            >
              <input
                checked={answer === option}
                className="h-4 w-4 accent-brand-700"
                name={question.id}
                onChange={() => onChange(option)}
                type="radio"
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (question.type === "multipleChoice") {
    const selectedAnswers = Array.isArray(answer) ? answer : [];

    return (
      <fieldset className="space-y-2">
        <legend className="text-base font-bold text-gray-950">
          {question.label}
          {question.required ? <span className="ml-1 text-brand-700">*</span> : null}
        </legend>
        {question.description ? (
          <p className="text-sm leading-5 text-gray-600">{question.description}</p>
        ) : null}
        <div className="grid gap-2">
          {question.options?.map((option) => {
            const isSelected = selectedAnswers.includes(option);

            return (
              <label
                className={cn(
                  "flex min-h-10 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-semibold leading-5 transition",
                  isSelected
                    ? "border-brand-600 bg-brand-50 text-brand-900"
                    : "border-gray-200 bg-white text-gray-700",
                )}
                key={option}
              >
                <input
                  checked={isSelected}
                  className="h-4 w-4 accent-brand-700"
                  onChange={() =>
                    onChange(
                      isSelected
                        ? selectedAnswers.filter((selectedAnswer) => selectedAnswer !== option)
                        : [...selectedAnswers, option],
                    )
                  }
                  type="checkbox"
                />
                {option}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (question.id.toLowerCase().includes("score")) {
    return (
      <label className="block">
        <span className="text-base font-bold text-gray-950">
          {question.label}
          {question.required ? <span className="ml-1 text-brand-700">*</span> : null}
        </span>
        {question.description ? (
          <p className="mt-2 text-sm leading-5 text-gray-600">{question.description}</p>
        ) : null}
        <input
          className="mt-3 h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          inputMode="numeric"
          onChange={(inputEvent) => onChange(inputEvent.target.value.replace(/\D/g, ""))}
          pattern="[0-9]*"
          placeholder="숫자만 입력"
          value={(answer as string | undefined) ?? ""}
        />
      </label>
    );
  }

  return (
    <label className="block">
      <span className="text-base font-bold text-gray-950">
        {question.label}
        {question.required ? <span className="ml-1 text-brand-700">*</span> : null}
      </span>
      {question.description ? (
        <p className="mt-2 text-sm leading-5 text-gray-600">{question.description}</p>
      ) : null}
      <textarea
        className="mt-3 h-28 w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        onChange={(inputEvent) => onChange(inputEvent.target.value)}
        placeholder="답변을 입력해 주세요"
        value={(answer as string | undefined) ?? ""}
      />
    </label>
  );
};

interface SurveyFlowPageProps {
  event: EventItem;
  participantName?: string;
  savedResponse?: EventSurveyResponse;
  onBack: () => void;
  onSubmit: (answers: Record<string, string | string[]>) => void;
}

const SurveyFlowPage = ({
  event,
  participantName,
  savedResponse,
  onBack,
  onSubmit,
}: SurveyFlowPageProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(
    getSurveyAnswerDrafts(savedResponse),
  );
  const [errorMessage, setErrorMessage] = useState("");
  const question = event.survey[stepIndex];
  const totalStepCount = Math.max(event.survey.length, 1);
  const isLastStep = stepIndex >= event.survey.length - 1;

  const updateAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: value,
    }));
  };

  const validateQuestion = (targetQuestion?: SurveyQuestion) => {
    if (!targetQuestion || targetQuestion.type === "description" || !targetQuestion.required) {
      return true;
    }

    if (isAnswered(answers[targetQuestion.id])) {
      return true;
    }

    setErrorMessage(`"${targetQuestion.label}" 문항을 입력해 주세요.`);
    return false;
  };

  const handleNext = () => {
    if (!validateQuestion(question)) {
      return;
    }

    setErrorMessage("");
    setStepIndex((currentStepIndex) => Math.min(currentStepIndex + 1, event.survey.length - 1));
  };

  const handleSubmit = () => {
    if (!participantName) {
      setErrorMessage("이름 입력 후 참여할 수 있습니다.");
      return;
    }

    const missingQuestion = event.survey.find(
      (surveyQuestion) =>
        surveyQuestion.required &&
        surveyQuestion.type !== "description" &&
        !isAnswered(answers[surveyQuestion.id]),
    );

    if (missingQuestion) {
      setStepIndex(Math.max(event.survey.findIndex((item) => item.id === missingQuestion.id), 0));
      setErrorMessage(`"${missingQuestion.label}" 문항을 입력해 주세요.`);
      return;
    }

    setErrorMessage("");
    onSubmit(answers);
  };

  return (
    <section className="-mx-4 -mb-3 -mt-3 bg-gray-50">
      <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-2">
        <button
          className="inline-flex min-h-8 items-center gap-2 text-sm font-bold text-gray-700"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" />
          이전
        </button>
        <div className="mt-1">
          <p className="text-xs font-bold text-brand-700">설문 진행</p>
          <h1 className="mt-0.5 line-clamp-1 text-lg font-bold text-gray-950">{event.title}</h1>
          <p className="mt-0.5 line-clamp-1 text-xs text-gray-600">{event.description}</p>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand-700 transition-all"
              style={{ width: `${((stepIndex + 1) / totalStepCount) * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold text-gray-600">
            {stepIndex + 1} / {totalStepCount}
          </span>
        </div>
      </div>

      <div className="px-4 py-3">
        <Card className="p-3">
          {question ? (
            <SurveyQuestionView
              answer={answers[question.id]}
              onChange={(value) => updateAnswer(question.id, value)}
              question={question}
            />
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-base font-bold text-gray-950">등록된 문항이 없습니다.</p>
              <p className="mt-2 text-sm leading-5 text-gray-600">
                제출 버튼을 누르면 빈 응답으로 저장됩니다.
              </p>
            </div>
          )}

          {errorMessage ? (
            <p className="mt-3 shrink-0 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {errorMessage}
            </p>
          ) : null}
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-gray-200 bg-white px-4 py-3 safe-bottom">
        <Button
          className="min-h-9 py-1.5"
          disabled={stepIndex === 0}
          onClick={() => {
            setErrorMessage("");
            setStepIndex((currentStepIndex) => Math.max(currentStepIndex - 1, 0));
          }}
          variant="secondary"
        >
          이전
        </Button>
        <Button className="min-h-9 py-1.5" onClick={isLastStep ? handleSubmit : handleNext}>
          {isLastStep ? "제출" : "다음"}
        </Button>
      </div>
    </section>
  );
};

const SurveyFlowModal = ({
  event,
  participantName,
  savedResponse,
  onBack,
  onSubmit,
}: SurveyFlowPageProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(
    getSurveyAnswerDrafts(savedResponse),
  );
  const [errorMessage, setErrorMessage] = useState("");
  const question = event.survey[stepIndex];
  const totalStepCount = Math.max(event.survey.length, 1);
  const isLastStep = stepIndex >= event.survey.length - 1;

  const updateAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: value,
    }));
  };

  const validateQuestion = (targetQuestion?: SurveyQuestion) => {
    if (!targetQuestion || targetQuestion.type === "description" || !targetQuestion.required) {
      return true;
    }

    if (isAnswered(answers[targetQuestion.id])) {
      return true;
    }

    setErrorMessage(`"${targetQuestion.label}" 문항을 입력해 주세요.`);
    return false;
  };

  const handleSubmit = () => {
    if (!participantName) {
      setErrorMessage("이름 입력 후 참여할 수 있습니다.");
      return;
    }

    const missingQuestion = event.survey.find(
      (surveyQuestion) =>
        surveyQuestion.required &&
        surveyQuestion.type !== "description" &&
        !isAnswered(answers[surveyQuestion.id]),
    );

    if (missingQuestion) {
      setStepIndex(Math.max(event.survey.findIndex((item) => item.id === missingQuestion.id), 0));
      setErrorMessage(`"${missingQuestion.label}" 문항을 입력해 주세요.`);
      return;
    }

    setErrorMessage("");
    onSubmit(answers);
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/55 px-3 py-4 sm:items-center"
      role="dialog"
    >
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="shrink-0 border-b border-gray-100 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-brand-700">레벨 테스트</p>
              <h2 className="mt-0.5 truncate text-lg font-bold text-gray-950">{event.title}</h2>
            </div>
            <button
              aria-label="닫기"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
              onClick={onBack}
              type="button"
            >
              x
            </button>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-brand-700 transition-all"
                style={{ width: `${((stepIndex + 1) / totalStepCount) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-gray-600">
              {stepIndex + 1} / {totalStepCount}
            </span>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto px-4 py-4">
          {question ? (
            <SurveyQuestionView
              answer={answers[question.id]}
              onChange={(value) => updateAnswer(question.id, value)}
              question={question}
            />
          ) : (
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
              등록된 문항이 없습니다.
            </p>
          )}
          {errorMessage ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-gray-100 px-4 py-3">
          <Button
            className="min-h-10 py-2"
            disabled={stepIndex === 0}
            onClick={() => {
              setErrorMessage("");
              setStepIndex((currentStepIndex) => Math.max(currentStepIndex - 1, 0));
            }}
            variant="secondary"
          >
            이전
          </Button>
          <Button
            className="min-h-10 py-2"
            onClick={() => {
              if (!validateQuestion(question)) {
                return;
              }

              setErrorMessage("");

              if (isLastStep) {
                handleSubmit();
                return;
              }

              setStepIndex((currentStepIndex) =>
                Math.min(currentStepIndex + 1, event.survey.length - 1),
              );
            }}
          >
            {isLastStep ? "저장" : "다음"}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface EventResultPageProps {
  event: EventItem;
  participantName?: string;
  response?: EventSurveyResponse;
  onBack: () => void;
}

const EventResultPage = ({ event, participantName, response, onBack }: EventResultPageProps) => {
  const [isAllTeamsOpen, setIsAllTeamsOpen] = useState(false);
  const assignedTeam =
    event.teams.find((team) => team.id === response?.assignedTeamId) ??
    event.teams.find((team) => (participantName ? team.members.includes(participantName) : false));

  return (
    <section className="-mx-4 -mb-3 -mt-3 bg-gray-50">
      <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-2">
        <button
          className="inline-flex min-h-8 items-center gap-2 text-sm font-bold text-gray-700"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" />
          이전
        </button>

        <div className="mt-1">
          <p className="text-xs font-bold text-brand-700">이벤트 결과</p>
          <h1 className="mt-0.5 line-clamp-1 text-lg font-bold text-gray-950">{event.title}</h1>
          <p className="mt-0.5 line-clamp-1 text-xs text-gray-600">{event.description}</p>
        </div>
      </div>

      <div className="px-4 py-3">
        {!event.requiresTeamAssignment ? (
          <Card className="p-3">
            <p className="text-base font-bold text-gray-950">
              {response ? "참여 완료" : "이벤트가 완료되었습니다."}
            </p>
            <p className="mt-2 text-sm leading-5 text-gray-600">
              이 이벤트는 조 배정이 필요 없는 설문입니다.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            <Card className="p-3">
              <p className="flex items-center gap-2 text-base font-bold text-gray-950">
                <Users className="h-4 w-4 text-brand-700" />
                내 조 배정
              </p>
              {assignedTeam ? (
                <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50 p-3">
                  <p className="text-base font-bold text-brand-950">{assignedTeam.name}</p>
                  <p className="mt-1 text-sm leading-5 text-brand-900/80">
                    {assignedTeam.members.join(", ")}
                  </p>
                  {assignedTeam.memo ? (
                    <p className="mt-2 text-xs font-bold text-brand-700">{assignedTeam.memo}</p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-semibold text-gray-600">
                  조 배정 대기 중입니다.
                </p>
              )}
              <Button
                className="mt-3 min-h-9 w-full py-1.5"
                onClick={() => setIsAllTeamsOpen((isOpen) => !isOpen)}
                variant="secondary"
              >
                {isAllTeamsOpen ? "전체 조 접기" : "전체 조 보기"}
              </Button>
            </Card>

            {isAllTeamsOpen ? (
              <Card className="p-3">
                <p className="text-base font-bold text-gray-950">전체 조</p>
                <div className="mt-3 space-y-2">
                  {event.teams.length > 0 ? (
                    event.teams.map((team) => {
                      const isMyTeam = assignedTeam?.id === team.id;

                      return (
                        <section
                          className={cn(
                            "rounded-lg border p-3",
                            isMyTeam
                              ? "border-brand-200 bg-brand-50"
                              : "border-gray-200 bg-white",
                          )}
                          key={team.id}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={cn(
                                "font-bold",
                                isMyTeam ? "text-brand-950" : "text-gray-950",
                              )}
                            >
                              {team.name}
                            </p>
                            {isMyTeam ? (
                              <span className="rounded-full bg-brand-700 px-2 py-0.5 text-[11px] font-bold text-white">
                                내 조
                              </span>
                            ) : null}
                          </div>
                          {team.members.length > 0 ? (
                            <p className="mt-2 break-words text-sm leading-5 text-gray-600">
                              {team.members.join(", ")}
                            </p>
                          ) : (
                            <p className="mt-2 text-sm leading-5 text-gray-500">
                              아직 배정된 인원이 없습니다.
                            </p>
                          )}
                          {team.memo ? (
                            <p className="mt-2 break-words text-xs font-bold text-brand-700">
                              {team.memo}
                            </p>
                          ) : null}
                        </section>
                      );
                    })
                  ) : (
                    <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
                      등록된 조가 없습니다.
                    </p>
                  )}
                </div>
              </Card>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
};

const getAssignedTeam = (
  event: EventItem,
  participantName?: string,
  response?: EventSurveyResponse,
) => {
  const normalizedParticipantName = participantName?.trim();

  return (
    event.teams.find((team) => team.id === response?.assignedTeamId) ??
    event.teams.find((team) =>
      normalizedParticipantName
        ? team.members.some((member) => member.trim() === normalizedParticipantName)
        : false,
    )
  );
};

const getEventType = (event: EventItem): EventType => {
  const rawType = (event as { type?: unknown }).type;

  if (rawType === "survey" || rawType === "event") {
    return rawType;
  }

  if (rawType === "bowling") {
    return "event";
  }

  const searchableText = `${event.id} ${event.title}`.toLowerCase();

  if (searchableText.includes("대회")) {
    return "event";
  }

  return "survey";
};

const eventTypeLabels: Record<EventType, string> = {
  survey: "설문형",
  event: "이벤트형",
};

const surveyKindLabels: Record<SurveyKind, string> = {
  general: "일반설문",
  activity: "액티비티",
  transport: "차량/이동",
  bowlingLevel: "볼링 레벨",
};

const eventKindLabels: Record<EventKind, string> = {
  general: "일반이벤트",
  bowling: "볼링대회",
  preGuide: "사전페이지",
};

const getSurveyKind = (event: EventItem): SurveyKind =>
  event.surveyKind ??
  (event.id.toLowerCase().includes("activity") || event.title.includes("액티비티")
    ? "activity"
    : event.id.toLowerCase().includes("bowling") || event.title.includes("레벨")
      ? "bowlingLevel"
      : "general");

const getEventKind = (event: EventItem): EventKind =>
  event.eventKind ??
  (event.id.toLowerCase().includes("bowling") || event.title.includes("볼링")
    ? "bowling"
    : "general");

const isBowlingEvent = (event: EventItem) => {
  const rawType = (event as { type?: unknown }).type;

  return (
    rawType === "bowling" ||
    event.eventKind === "bowling" ||
    (getEventType(event) === "event" &&
      (getEventKind(event) === "bowling" ||
        event.id.toLowerCase().includes("bowling") ||
        event.title.includes("볼링")))
  );
};

const getKindLabel = (event: EventItem) =>
  getEventType(event) === "survey"
    ? surveyKindLabels[getSurveyKind(event)]
    : eventKindLabels[getEventKind(event)];

const findLinkedSurveyEvent = (events: EventItem[], event: EventItem) => {
  if (event.linkedSurveyId) {
    const linkedEvent = events.find((item) => item.id === event.linkedSurveyId);

    if (linkedEvent) {
      return linkedEvent;
    }
  }

  return events.find((item) => item.type === "survey" && item.surveyKind === "bowlingLevel");
};

const getTextAnswer = (response: EventSurveyResponse | undefined, key: string) => {
  const value = response?.answers[key];
  return Array.isArray(value) ? value.join(", ") : value !== undefined ? String(value) : "";
};

const getNumericAnswer = (response: EventSurveyResponse | undefined, key: string) => {
  const value = getTextAnswer(response, key);
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && value !== "" ? numberValue : undefined;
};

const getTextAnswerByKeyOrLabel = (
  event: EventItem | undefined,
  response: EventSurveyResponse | undefined,
  key: string,
  labelKeyword: string,
) => {
  const directValue = getTextAnswer(response, key);

  if (directValue) {
    return directValue;
  }

  const matchedQuestion = event?.survey.find((question) => question.label.includes(labelKeyword));

  return matchedQuestion ? getTextAnswer(response, matchedQuestion.id) : "";
};

const getNumericAnswerByKeyOrLabel = (
  event: EventItem | undefined,
  response: EventSurveyResponse | undefined,
  key: string,
  labelKeyword: string,
) => {
  const value = getTextAnswerByKeyOrLabel(event, response, key, labelKeyword);
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && value !== "" ? numberValue : undefined;
};

const getParticipantTotalScore = (response: EventSurveyResponse | undefined) =>
  (getNumericAnswer(response, "game1Score") ?? 0) + (getNumericAnswer(response, "game2Score") ?? 0);

const getTargetDiffMeta = (score: number | undefined, targetScore: number | undefined) => {
  if (score === undefined || targetScore === undefined) {
    return undefined;
  }

  const diff = score - targetScore;

  return {
    label: diff > 0 ? `+${diff}` : String(diff),
    tone: diff > 0 ? "positive" : diff < 0 ? "negative" : "same",
  };
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
          (sum, response) => sum + getParticipantTotalScore(response),
          0,
        ),
        submittedCount: teamScoreResponses.filter(
          (response) =>
            getNumericAnswer(response, "game1Score") !== undefined ||
            getNumericAnswer(response, "game2Score") !== undefined,
        ).length,
      };
    })
    .sort((left, right) => right.totalScore - left.totalScore || left.index - right.index);

const getPositionStyle = (rect: BowlingOverlayRect) => ({
  left: rect.left,
  top: rect.top,
  width: rect.width,
  height: rect.height,
  fontSize: rect.fontSize,
});

interface EventPageShellProps {
  event: EventItem;
  children: ReactNode;
  onBack: () => void;
  tone?: "bowling" | "activity" | "default";
}

const EventPageShell = ({ event, children, onBack, tone = "default" }: EventPageShellProps) => (
  getEventType(event) === "event" || isBowlingEvent(event) ? (
    <section
      className="fixed inset-0 z-50 min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-black"
      style={
        event.pageBackgroundImage
          ? { backgroundImage: `url(${event.pageBackgroundImage})`, backgroundSize: "cover" }
          : undefined
      }
    >
      <button
        aria-label="이벤트 목록으로 돌아가기"
        className="fixed left-3 top-3 z-[60] flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white shadow-2xl ring-1 ring-white/20 backdrop-blur transition hover:bg-black/70"
        onClick={onBack}
        type="button"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="mx-auto w-full max-w-[724px]">{children}</div>
    </section>
  ) : (
    <section
      className={cn(
        "-mx-4 -mb-3 -mt-3 min-h-[calc(100dvh-7rem)] overflow-x-hidden bg-gray-50 px-4 pb-28 pt-3 safe-bottom",
        tone === "activity" ? "bg-emerald-50/60" : undefined,
      )}
      style={
        event.pageBackgroundImage
          ? { backgroundImage: `url(${event.pageBackgroundImage})`, backgroundSize: "cover" }
          : undefined
      }
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        <button
          className="inline-flex min-h-9 w-fit items-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-gray-700 ring-1 ring-gray-200"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" />
          이벤트 목록
        </button>
        {children}
      </div>
    </section>
  )
);

interface OnePageSectionProps {
  children: ReactNode;
  className?: string;
}

const OnePageSection = ({ children, className }: OnePageSectionProps) => (
  <section className={cn("rounded-lg border border-gray-200 bg-white p-4 shadow-soft", className)}>
    {children}
  </section>
);

interface ScoreInputModalProps {
  assignedTeam?: EventItem["teams"][number];
  event: EventItem;
  guideId: WorkshopGuideId;
  participantProfile?: ParticipantProfile;
  response?: EventSurveyResponse;
  onClose: () => void;
  onSave: (response: EventSurveyResponse) => void;
}

const ScoreInputModal = ({
  assignedTeam,
  event,
  guideId,
  participantProfile,
  response,
  onClose,
  onSave,
}: ScoreInputModalProps) => {
  const [game1Score, setGame1Score] = useState(getTextAnswer(response, "game1Score"));
  const [game2Score, setGame2Score] = useState(getTextAnswer(response, "game2Score"));
  const [errorMessage, setErrorMessage] = useState("");

  const updateNumericText = (value: string, setter: (nextValue: string) => void) => {
    setter(value.replace(/\D/g, ""));
  };

  const validateScore = (value: string) => {
    if (value === "") {
      return true;
    }

    const score = Number(value);

    return Number.isInteger(score) && score >= 0 && score <= 300;
  };

  const handleSave = () => {
    if (!participantProfile?.name) {
      setErrorMessage("이름 입력 후 점수를 저장할 수 있습니다.");
      return;
    }

    if (!validateScore(game1Score) || !validateScore(game2Score)) {
      setErrorMessage("점수는 비워두거나 0~300 사이 숫자로 입력해 주세요.");
      return;
    }

    onSave({
      id: response?.id ?? createId(),
      guideId,
      eventId: event.id,
      participantId: participantProfile.id,
      participantName: participantProfile.name,
      submittedAt: new Date().toISOString(),
      assignedTeamId:
        assignedTeam?.id ?? response?.assignedTeamId ?? getAssignedTeam(event, participantProfile.name)?.id,
      answers: {
        ...(response?.answers ?? {}),
        game1Score: game1Score === "" ? "" : Number(game1Score),
        game2Score: game2Score === "" ? "" : Number(game2Score),
      },
    });
    onClose();
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/45 px-3 py-4"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-950">점수 입력</h2>
            <p className="mt-1 text-sm text-gray-500">본인의 1게임, 2게임 점수를 입력합니다.</p>
          </div>
          <button
            aria-label="닫기"
            className="h-9 w-9 rounded-full text-gray-500 hover:bg-gray-100"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          <label>
            <span className="text-sm font-bold text-gray-700">1게임 실제 점수</span>
            <input
              className="mt-2 h-12 w-full rounded-lg border border-gray-300 px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              inputMode="numeric"
              onChange={(event) => updateNumericText(event.target.value, setGame1Score)}
              pattern="[0-9]*"
              value={game1Score}
            />
          </label>
          <label>
            <span className="text-sm font-bold text-gray-700">2게임 실제 점수</span>
            <input
              className="mt-2 h-12 w-full rounded-lg border border-gray-300 px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              inputMode="numeric"
              onChange={(event) => updateNumericText(event.target.value, setGame2Score)}
              pattern="[0-9]*"
              value={game2Score}
            />
          </label>
        </div>
        {errorMessage ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {errorMessage}
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={onClose} variant="secondary">
            취소
          </Button>
          <Button onClick={handleSave}>저장</Button>
        </div>
      </div>
    </div>
  );
};

interface BowlingEventBoardPageProps {
  assignedTeam?: EventItem["teams"][number];
  canEditScores: boolean;
  canOpenLevelTest: boolean;
  event: EventItem;
  game1Score?: number;
  game2Score?: number;
  hasAnyScore: boolean;
  hasSubmittedPreSurvey: boolean;
  myTeamRank: number;
  onLevelTestOpen: () => void;
  onScoreInputOpen: () => void;
  phase: string;
  rankings: ReturnType<typeof getBowlingTeamRankings>;
  targetScore?: number;
}

const BowlingEventBoardPage = ({
  assignedTeam,
  canEditScores,
  canOpenLevelTest,
  event,
  game1Score,
  game2Score,
  hasAnyScore,
  hasSubmittedPreSurvey,
  myTeamRank,
  onLevelTestOpen,
  onScoreInputOpen,
  phase,
  rankings,
  targetScore,
}: BowlingEventBoardPageProps) => {
  const boardImageUrl = event.pageBackgroundImage || bowlingEventBoard.imageUrl;
  const isPreSurvey = phase === "preSurvey";
  const visibleRankings = isPreSurvey
    ? []
    : rankings.filter((ranking) => ranking.submittedCount > 0 || ranking.totalScore > 0);
  const teamMemberText = assignedTeam
    ? `${assignedTeam.name} : ${
        assignedTeam.members.length > 0 ? assignedTeam.members.join(", ") : "조원 등록 대기"
      }`
    : "조 배정은 곧 공개됩니다";
  const rankMessage = myTeamRank > 0 ? `현재 우리 팀은 ${myTeamRank}위입니다.` : "";
  const game1Diff = getTargetDiffMeta(game1Score, targetScore);
  const game2Diff = getTargetDiffMeta(game2Score, targetScore);
  const renderTargetDiff = (diff: ReturnType<typeof getTargetDiffMeta>) =>
    diff ? (
      <span className="inline-flex items-baseline justify-center gap-1 whitespace-nowrap">
        <span className="text-black"></span>
        <span
          className={cn(
            "font-black",
            diff.tone === "positive"
              ? "text-[#e11d48]"
              : diff.tone === "negative"
                ? "text-[#2563eb]"
                : "text-gray-700",
          )}
        >
          {diff.label}
        </span>
      </span>
    ) : null;

  const renderPrivacyOverlay = (rect: BowlingOverlayRect) => (
    <div
      className="absolute z-30 flex items-center justify-center overflow-hidden rounded-lg bg-white/45 px-4 text-center shadow-[0_0_28px_rgba(255,255,255,0.45)] backdrop-blur-[7px]"
      style={getPositionStyle(rect)}
    >
      <div className="rounded-lg bg-black/70 px-5 py-4 text-white shadow-2xl">
        <p className="font-proUp text-[clamp(28px,8vw,46px)] font-black leading-none text-[#f7ff2b]">
          D-00
        </p>
        <p className="mt-2 text-[clamp(15px,4vw,22px)] font-black leading-tight">
          당일 공개 예정!
        </p>
      </div>
    </div>
  );

  return (
    <div
      className="relative mx-auto w-full max-w-[724px] overflow-hidden bg-black"
      style={{ aspectRatio: `${bowlingEventBoard.width} / ${bowlingEventBoard.height}` }}
    >
      <img
        alt=""
        className="absolute inset-0 h-full w-full select-none object-cover"
        draggable={false}
        src={boardImageUrl}
      />

      <div
        className="font-proUp absolute z-10 flex items-center justify-center text-center text-[clamp(42px,12vw,90px)] font-black leading-none text-[#fff252] drop-shadow-[0_0_10px_rgba(255,44,226,0.95)]"
        style={getPositionStyle(bowlingEventOverlay.targetScore)}
      >
        {targetScore ?? "?"}
      </div>

      <button
        aria-label={hasSubmittedPreSurvey ? "레벨 테스트 수정하기" : "레벨 테스트하기"}
        className="absolute z-20 rounded-full bg-transparent outline-none transition focus-visible:ring-4 focus-visible:ring-fuchsia-300/70 disabled:pointer-events-none"
        disabled={!canOpenLevelTest}
        onClick={onLevelTestOpen}
        style={getPositionStyle(bowlingEventOverlay.levelTestButton)}
        type="button"
      />

      <div
        className="absolute z-10 flex items-center justify-center px-4 text-center text-[clamp(25px,3.2vw,17px)] font-black leading-snug text-[#14102a]"
        style={getPositionStyle(bowlingEventOverlay.teamMembers)}
      >
        <span className="line-clamp-3 break-keep">{teamMemberText}</span>
      </div>

      <button
        aria-label={hasAnyScore ? "점수 수정하기" : "점수 입력하기"}
        className="absolute z-20 rounded-full bg-transparent outline-none transition focus-visible:ring-4 focus-visible:ring-violet-300/70 disabled:pointer-events-none"
        disabled={!canEditScores}
        onClick={onScoreInputOpen}
        style={getPositionStyle(bowlingEventOverlay.scoreInputButton)}
        type="button"
      />

      <div
        className="font-proUp absolute z-10 flex items-center justify-center text-center font-black leading-none text-[#5b21ff] drop-shadow-[0_2px_0_rgba(255,255,255,0.85)] [text-shadow:0_0_8px_rgba(91,33,255,0.28)]"
        style={getPositionStyle(bowlingEventOverlay.game1Score)}
      >
        {game1Score ?? ""}
      </div>
      <div
        className="font-proUp absolute z-10 flex items-center justify-center text-center font-black leading-none text-[#5b21ff] drop-shadow-[0_2px_0_rgba(255,255,255,0.85)] [text-shadow:0_0_8px_rgba(91,33,255,0.28)]"
        style={getPositionStyle(bowlingEventOverlay.game2Score)}
      >
        {game2Score ?? ""}
      </div>
      <div
        className="absolute z-10 flex items-center justify-center text-center font-black leading-none"
        style={getPositionStyle(bowlingEventOverlay.game1Diff)}
      >
        {renderTargetDiff(game1Diff)}
      </div>
      <div
        className="absolute z-10 flex items-center justify-center text-center font-black leading-none"
        style={getPositionStyle(bowlingEventOverlay.game2Diff)}
      >
        {renderTargetDiff(game2Diff)}
      </div>

      <div
        className="absolute z-10 flex items-center justify-center bg-black px-3 text-center font-black leading-tight text-[#f6ff29]"
        style={getPositionStyle(bowlingEventOverlay.teamRankMessage)}
      >
        {isPreSurvey ? "" : rankMessage}
      </div>

      <div
        className="absolute z-10 overflow-hidden rounded-sm border border-gray-300 bg-white/96 text-gray-950 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
        style={getPositionStyle(bowlingEventOverlay.rankingTable)}
      >
        <table className="h-full w-full table-fixed border-collapse text-center font-bold leading-tight text-gray-950">
          <colgroup>
            <col className="w-[15%]" />
            <col className="w-[18%]" />
            <col className="w-[20%]" />
            <col className="w-[47%]" />
          </colgroup>
          <thead className="bg-[#eadcff]">
            <tr>
              {["순위", "조", "점수", "조원"].map((header) => (
                <th
                  className="border-b border-r border-gray-300 px-1 py-1 last:border-r-0"
                  key={header}
                  scope="col"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRankings.length > 0 ? (
              visibleRankings.map((ranking, index) => (
                <tr className="border-b border-gray-300 last:border-b-0" key={ranking.team.id}>
                  <td className="border-r border-gray-300 px-1 py-1 align-middle font-black">
                    {index + 1}위
                  </td>
                  <td className="border-r border-gray-300 px-1 py-1 align-middle font-black">
                    <span className="block truncate">{ranking.team.name || "-"}</span>
                  </td>
                  <td className="border-r border-gray-300 px-1 py-1 align-middle font-black">
                    {ranking.totalScore > 0 ? `${ranking.totalScore}점` : "-"}
                  </td>
                  <td className="px-1.5 py-1 text-left align-middle font-bold">
                    <span className="block whitespace-normal break-keep leading-tight">
                      {ranking.team.members.length > 0 ? ranking.team.members.join(", ") : "-"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-2 py-3 text-center font-bold text-gray-700" colSpan={4}>
                  -
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isPreSurvey ? renderPrivacyOverlay(bowlingEventOverlay.scoreBlur) : null}
      {isPreSurvey ? renderPrivacyOverlay(bowlingEventOverlay.rankingBlur) : null}
    </div>
  );
};

interface EventOnePageProps {
  event: EventItem;
  guideId: WorkshopGuideId;
  guideEvents: EventItem[];
  eventResponses: EventSurveyResponse[];
  participantProfile?: ParticipantProfile;
  response?: EventSurveyResponse;
  responseByEventId: Map<string, EventSurveyResponse>;
  onBack: () => void;
  onOpenSurvey: () => void;
  onSaveResponse: (response: EventSurveyResponse) => void;
}

const EventOnePage = ({
  event,
  guideId,
  guideEvents,
  eventResponses,
  participantProfile,
  response,
  responseByEventId,
  onBack,
  onOpenSurvey,
  onSaveResponse,
}: EventOnePageProps) => {
  const [isAllTeamsOpen, setIsAllTeamsOpen] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isLevelTestModalOpen, setIsLevelTestModalOpen] = useState(false);
  const eventType = getEventType(event);
  const shouldRenderBowlingBoard = isBowlingEvent(event);
  const levelSurveyEvent = shouldRenderBowlingBoard
    ? findLinkedSurveyEvent(guideEvents, event)
    : undefined;
  const levelSurveyResponse = levelSurveyEvent
    ? responseByEventId.get(levelSurveyEvent.id)
    : undefined;
  const bowlingScoreResponses = eventResponses.filter((eventResponse) => eventResponse.eventId === event.id);
  const levelSurveyResponses = levelSurveyEvent
    ? eventResponses.filter((eventResponse) => eventResponse.eventId === levelSurveyEvent.id)
    : [];
  const bowlingTeamSourceEvent = levelSurveyEvent ?? event;
  const participantName = participantProfile?.name;
  const assignedTeam = getAssignedTeam(bowlingTeamSourceEvent, participantName, levelSurveyResponse);
  const phase = event.phase ?? "preSurvey";
  const canOpenLevelTest = shouldRenderBowlingBoard && phase !== "result";
  const canEditScores = shouldRenderBowlingBoard && phase === "scoreInput";
  const targetScore = getNumericAnswerByKeyOrLabel(
    levelSurveyEvent ?? event,
    levelSurveyResponse ?? response,
    "targetScore",
    "목표",
  );
  const game1Score = getNumericAnswer(response, "game1Score");
  const game2Score = getNumericAnswer(response, "game2Score");
  const rankings = getBowlingTeamRankings(
    bowlingTeamSourceEvent,
    bowlingScoreResponses,
    levelSurveyEvent ? levelSurveyResponses : bowlingScoreResponses,
  );
  const visibleRankings =
    phase === "preSurvey"
      ? []
      : rankings.filter((ranking) => ranking.submittedCount > 0 || ranking.totalScore > 0);
  const myTeamRank = assignedTeam
    ? visibleRankings.findIndex((ranking) => ranking.team.id === assignedTeam.id) + 1
    : 0;
  const hasAnyScore = game1Score !== undefined || game2Score !== undefined;
  const hasSubmittedPreSurvey = Boolean(levelSurveyResponse ?? response);
  const saveLevelTestAnswers = (answers: Record<string, string | string[]>) => {
    if (!participantProfile?.name) {
      return;
    }

    const savedLevelResponse = levelSurveyEvent ? levelSurveyResponse : response;

    onSaveResponse({
      id: savedLevelResponse?.id ?? createId(),
      guideId,
      eventId: (levelSurveyEvent ?? event).id,
      participantId: participantProfile.id,
      participantName: participantProfile.name,
      submittedAt: new Date().toISOString(),
      assignedTeamId: bowlingTeamSourceEvent.requiresTeamAssignment
        ? getAssignedTeam(bowlingTeamSourceEvent, participantProfile.name, levelSurveyResponse)?.id
        : levelSurveyResponse?.assignedTeamId,
      answers: {
        ...(levelSurveyResponse?.answers ?? {}),
        ...answers,
      },
    });
    setIsLevelTestModalOpen(false);
  };

  return (
    <EventPageShell
      event={event}
      onBack={onBack}
      tone={shouldRenderBowlingBoard ? "bowling" : getSurveyKind(event) === "activity" ? "activity" : "default"}
    >
      {shouldRenderBowlingBoard ? (
        <BowlingEventBoardPage
          assignedTeam={assignedTeam}
          canEditScores={canEditScores}
          canOpenLevelTest={canOpenLevelTest}
          event={event}
          game1Score={game1Score}
          game2Score={game2Score}
          hasAnyScore={hasAnyScore}
          hasSubmittedPreSurvey={hasSubmittedPreSurvey}
          myTeamRank={myTeamRank}
          onLevelTestOpen={() => setIsLevelTestModalOpen(true)}
          onScoreInputOpen={() => setIsScoreModalOpen(true)}
          phase={phase}
          rankings={rankings}
          targetScore={targetScore}
        />
      ) : null}

      {eventType === "survey" && getSurveyKind(event) === "activity" ? (
        <div className="space-y-3">
          <OnePageSection>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
              {eventTypeLabels[eventType]}
            </span>
            <h1 className="mt-3 text-2xl font-bold leading-tight text-gray-950">{event.title}</h1>
            <p className="mt-2 text-sm font-semibold leading-5 text-gray-600">
              {participantName ? `${participantName}님의 액티비티 선택 페이지입니다.` : "참가자 이름 입력 후 선택할 수 있습니다."}
            </p>
          </OnePageSection>
          <div className="space-y-3">
            <OnePageSection>
              <h2 className="text-lg font-black text-gray-950">액티비티 선택하기</h2>
              <p className="mt-2 text-sm leading-5 text-gray-600">
                기존 설문 선택지를 사용해 참여 액티비티를 저장합니다.
              </p>
              <Button
                className="mt-3 min-h-10 w-full rounded-full py-2"
                disabled={event.status !== "active"}
                onClick={onOpenSurvey}
                variant={response ? "secondary" : "primary"}
              >
                {response ? "선택 수정하기" : "선택하기"}
              </Button>
            </OnePageSection>

            <OnePageSection>
              <h2 className="text-lg font-black text-gray-950">내가 선택한 액티비티</h2>
              <div className="mt-3 space-y-2 text-sm leading-5 text-gray-600">
                {response ? (
                  event.survey
                    .filter((question) => question.type !== "description")
                    .map((question) => (
                      <p className="rounded-lg bg-gray-50 p-3" key={question.id}>
                        <span className="font-bold text-gray-950">{question.label}: </span>
                        {formatAnswerValue(response.answers[question.id] ?? "") || "-"}
                      </p>
                    ))
                ) : (
                  <p className="rounded-lg bg-gray-50 p-3 text-gray-500">아직 선택 전입니다.</p>
                )}
              </div>
            </OnePageSection>

            <OnePageSection>
              <h2 className="text-lg font-black text-gray-950">내 조 정보</h2>
              {assignedTeam ? (
                <p className="mt-2 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
                  {assignedTeam.name}: {assignedTeam.members.join(", ")}
                </p>
              ) : (
                <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
                  조 배정 대기 중입니다.
                </p>
              )}
            </OnePageSection>

            <OnePageSection>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-gray-950">전체 조 보기</h2>
                <Button
                  className="min-h-9 shrink-0 rounded-full px-3 py-1.5"
                  onClick={() => setIsAllTeamsOpen((isOpen) => !isOpen)}
                  variant="secondary"
                >
                  {isAllTeamsOpen ? "접기" : "보기"}
                </Button>
              </div>
              {isAllTeamsOpen ? (
                <div className="mt-3 space-y-2">
                  {event.teams.length > 0 ? (
                    event.teams.map((team) => (
                      <div className="rounded-lg border border-gray-200 p-3" key={team.id}>
                        <p className="text-sm font-black text-gray-950">{team.name}</p>
                        <p className="mt-1 break-words text-xs leading-5 text-gray-600">
                          {team.members.length > 0 ? team.members.join(", ") : "배정된 인원이 없습니다."}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
                      등록된 조가 없습니다.
                    </p>
                  )}
                </div>
              ) : null}
            </OnePageSection>
          </div>
        </div>
      ) : null}

      {eventType === "survey" && getSurveyKind(event) !== "activity" ? (
        <OnePageSection>
          <p className="text-xs font-bold text-brand-700">{eventTypeLabels[eventType]}</p>
          <h1 className="mt-1 text-xl font-black text-gray-950">{event.title}</h1>
          <p className="mt-2 text-sm leading-5 text-gray-600">
            {event.status === "closed"
              ? (event.resultSummary ?? "이벤트가 종료되었습니다.")
              : "기존 설문 흐름을 사용해 응답을 저장합니다."}
          </p>
          {event.status === "active" ? (
            <Button className="mt-4 min-h-10 w-full py-2" onClick={onOpenSurvey}>
              {response ? "응답 수정하기" : "참여하기"}
            </Button>
          ) : null}
        </OnePageSection>
      ) : null}

      {isScoreModalOpen ? (
        <ScoreInputModal
          assignedTeam={assignedTeam}
          event={event}
          guideId={guideId}
          onClose={() => setIsScoreModalOpen(false)}
          onSave={onSaveResponse}
          participantProfile={participantProfile}
          response={response}
        />
      ) : null}
      {isLevelTestModalOpen ? (
        <SurveyFlowModal
          event={levelSurveyEvent ?? event}
          onBack={() => setIsLevelTestModalOpen(false)}
          onSubmit={saveLevelTestAnswers}
          participantName={participantName}
          savedResponse={levelSurveyResponse ?? response}
        />
      ) : null}
    </EventPageShell>
  );
};

export const EventsPage = () => {
  const { eventResponses, participantProfile, saveEventResponse, selectedGuide } =
    useWorkshopStore();
  const [detailEventId, setDetailEventId] = useState<string>();
  const [surveyEventId, setSurveyEventId] = useState<string>();
  const participantName = participantProfile?.name;

  const responseByEventId = useMemo(() => {
    const responses = eventResponses.filter(
      (response) =>
        response.guideId === selectedGuide.id &&
        (participantProfile?.id
          ? response.participantId === participantProfile.id ||
            response.participantName === participantName
          : response.participantName === participantName),
    );

    return new Map(responses.map((response) => [response.eventId, response]));
  }, [eventResponses, participantName, participantProfile?.id, selectedGuide.id]);

  const surveyEvent = selectedGuide.events.find(
    (event) => event.id === surveyEventId && event.status === "active",
  );
  const detailEvent = selectedGuide.events.find((event) => event.id === detailEventId);
  const saveResponseForEvent = (
    event: EventItem,
    answers: Record<string, string | string[]>,
  ) => {
    if (!participantProfile?.name) {
      return;
    }

    const savedResponse = responseByEventId.get(event.id);

    saveEventResponse({
      id: savedResponse?.id ?? createId(),
      guideId: selectedGuide.id,
      eventId: event.id,
      participantId: participantProfile.id,
      participantName: participantProfile.name,
      submittedAt: new Date().toISOString(),
      assignedTeamId: event.requiresTeamAssignment
        ? getAssignedTeam(event, participantProfile.name, savedResponse)?.id
        : savedResponse?.assignedTeamId,
      answers,
    });
  };

  if (surveyEvent) {
    return (
      <SurveyFlowPage
        event={surveyEvent}
        onBack={() => setSurveyEventId(undefined)}
        onSubmit={(answers) => {
          if (!participantProfile?.name) {
            return;
          }

          saveResponseForEvent(surveyEvent, answers);
          setSurveyEventId(undefined);
        }}
        participantName={participantName}
        savedResponse={responseByEventId.get(surveyEvent.id)}
      />
    );
  }

  if (detailEvent) {
    const selectedGuideEventResponses = eventResponses.filter(
      (response) => response.guideId === selectedGuide.id,
    );
    const detailEventResponses = selectedGuideEventResponses.filter(
      (response) => response.eventId === detailEvent.id,
    );

    return (
      <EventOnePage
        event={detailEvent}
        eventResponses={isBowlingEvent(detailEvent) ? selectedGuideEventResponses : detailEventResponses}
        guideEvents={selectedGuide.events}
        guideId={selectedGuide.id}
        onBack={() => setDetailEventId(undefined)}
        onOpenSurvey={() => setSurveyEventId(detailEvent.id)}
        onSaveResponse={saveEventResponse}
        participantProfile={participantProfile}
        response={responseByEventId.get(detailEvent.id)}
        responseByEventId={responseByEventId}
      />
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">이벤트</h1>
        <p className="mt-1 text-sm text-gray-600">
          {participantProfile?.name
            ? `${participantProfile.name}님의 응답으로 저장됩니다.`
            : "참가자 이름 입력 후 응답과 연결됩니다."}
        </p>
      </div>

      <div className="space-y-3">
        {selectedGuide.events.filter((event) => event.showInEventList !== false).length > 0 ? (
          selectedGuide.events.filter((event) => event.showInEventList !== false).map((event) => {
            const response = responseByEventId.get(event.id);
            const hasSubmitted = Boolean(response);
            const assignedTeam = getAssignedTeam(event, participantName, response);
            const hasAssignedTeam = Boolean(assignedTeam);
            const isWaitingForTeam =
              event.status === "closed" && event.requiresTeamAssignment && !hasAssignedTeam;

            return (
              <Card key={event.id}>
                <div className="flex items-start gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <div className="shrink-0 rounded-full bg-brand-50 p-1.5 text-brand-700">
                      <PartyPopper className="h-4 w-4" />
                    </div>
                    <h2 className="min-w-0 break-words pt-0.5 text-base font-bold leading-5 text-gray-950">
                      {event.title}
                    </h2>
                  </div>
                  <div className="ml-auto shrink-0">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-1 text-[11px] font-bold",
                        eventStatusMeta[event.status].className,
                      )}
                    >
                      {eventStatusMeta[event.status].label}
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm leading-5 text-gray-600">{event.description}</p>
                    {isWaitingForTeam ? (
                      <p className="mt-2 text-xs font-bold text-yellow-800">
                        조 배정 대기 중
                      </p>
                    ) : null}
                  </div>

                  {hasSubmitted ? (
                    <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5 text-center text-xs font-bold leading-tight text-brand-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="w-12 break-keep">응답 완료</span>
                    </div>
                  ) : null}
                </div>

                <Button
                  className="mt-3 min-h-9 w-full py-1.5"
                  icon={
                    event.status === "closed" ? (
                      <ClipboardList className="h-4 w-4" />
                    ) : undefined
                  }
                  onClick={() => {
                    setDetailEventId(event.id);
                  }}
                  variant="secondary"
                >
                  상세 페이지 보기
                </Button>
              </Card>
            );
          })
        ) : (
          <Card>
            <p className="text-sm text-gray-500">등록된 이벤트가 없습니다.</p>
          </Card>
        )}
      </div>
    </section>
  );
};
