import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardList, PartyPopper, Users } from "lucide-react";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { cn } from "../../lib/cn";
import { useWorkshopStore } from "../../store/workshopStore";
import type { EventItem, EventStatus, EventSurveyResponse, SurveyQuestion } from "../../types/workshop";

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

const isAnswered = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value.length > 0 : Boolean(value?.trim());

const formatAnswerValue = (value: string | string[]) =>
  Array.isArray(value) ? value.join(", ") : value;

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
    savedResponse?.answers ?? {},
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

interface EventResultPageProps {
  event: EventItem;
  participantName?: string;
  response?: EventSurveyResponse;
  onBack: () => void;
}

const EventResultPage = ({ event, participantName, response, onBack }: EventResultPageProps) => {
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
            </Card>

            <Card className="p-3">
              <p className="text-base font-bold text-gray-950">내 설문 제출 내용</p>
              {response && Object.keys(response.answers).length > 0 ? (
                <div className="mt-3 space-y-2">
                  {Object.entries(response.answers).map(([questionId, answer]) => {
                    const question = event.survey.find((item) => item.id === questionId);

                    return (
                      <p className="text-sm leading-5 text-gray-600" key={questionId}>
                        <span className="font-semibold text-gray-950">
                          {question?.label ?? questionId}:
                        </span>{" "}
                        {formatAnswerValue(answer)}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">제출한 설문 응답이 없습니다.</p>
              )}
            </Card>
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
) =>
  event.teams.find((team) => team.id === response?.assignedTeamId) ??
  event.teams.find((team) => (participantName ? team.members.includes(participantName) : false));

const getEventButtonLabel = (
  event: EventItem,
  hasSubmitted: boolean,
  hasAssignedTeam: boolean,
) => {
  if (event.status === "waiting") {
    return "대기 중";
  }

  if (event.status === "active") {
    return hasSubmitted ? "응답 수정" : "참여하기";
  }

  if (event.requiresTeamAssignment) {
    return hasAssignedTeam ? "조 배치 확인" : "조 배정 대기 중";
  }

  return hasSubmitted ? "제출 내용 확인" : "완료";
};

export const EventsPage = () => {
  const { eventResponses, participantProfile, saveEventResponse, selectedGuide } =
    useWorkshopStore();
  const [surveyEventId, setSurveyEventId] = useState<string>();
  const [resultEventId, setResultEventId] = useState<string>();
  const participantName = participantProfile?.name;

  const responseByEventId = useMemo(() => {
    const responses = eventResponses.filter(
      (response) =>
        response.guideId === selectedGuide.id && response.participantName === participantName,
    );

    return new Map(responses.map((response) => [response.eventId, response]));
  }, [eventResponses, participantName, selectedGuide.id]);

  const surveyEvent = selectedGuide.events.find(
    (event) => event.id === surveyEventId && event.status === "active",
  );
  const resultEvent = selectedGuide.events.find(
    (event) => event.id === resultEventId && event.status === "closed",
  );

  if (surveyEvent) {
    return (
      <SurveyFlowPage
        event={surveyEvent}
        onBack={() => setSurveyEventId(undefined)}
        onSubmit={(answers) => {
          if (!participantName) {
            return;
          }

          saveEventResponse({
            id: createId(),
            guideId: selectedGuide.id,
            eventId: surveyEvent.id,
            participantName,
            submittedAt: new Date().toISOString(),
            assignedTeamId: surveyEvent.requiresTeamAssignment
              ? surveyEvent.teams.find((team) => team.members.includes(participantName))?.id
              : undefined,
            answers,
          });
          setSurveyEventId(undefined);
        }}
        participantName={participantName}
        savedResponse={responseByEventId.get(surveyEvent.id)}
      />
    );
  }

  if (resultEvent) {
    return (
      <EventResultPage
        event={resultEvent}
        onBack={() => setResultEventId(undefined)}
        participantName={participantName}
        response={responseByEventId.get(resultEvent.id)}
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
        {selectedGuide.events.length > 0 ? (
          selectedGuide.events.map((event) => {
            const response = responseByEventId.get(event.id);
            const hasSubmitted = Boolean(response);
            const assignedTeam = getAssignedTeam(event, participantName, response);
            const hasAssignedTeam = Boolean(assignedTeam);
            const isWaitingForTeam =
              event.status === "closed" && event.requiresTeamAssignment && !hasAssignedTeam;
            const buttonLabel = getEventButtonLabel(event, hasSubmitted, hasAssignedTeam);

            return (
              <Card key={event.id}>
                <div className="flex items-start gap-2">
                  <div className="rounded-full bg-brand-50 p-1.5 text-brand-700">
                    <PartyPopper className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-[11px] font-bold",
                          eventStatusMeta[event.status].className,
                        )}
                      >
                        {eventStatusMeta[event.status].label}
                      </span>
                      {event.requiresTeamAssignment ? (
                        <span className="rounded-full bg-brand-50 px-2 py-1 text-[11px] font-bold text-brand-700">
                          조 배치 사용
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600">
                          설문형
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 text-base font-bold text-gray-950">{event.title}</h2>
                    <p className="mt-1 text-sm leading-5 text-gray-600">{event.description}</p>

                    {hasSubmitted ? (
                      <p className="mt-2 flex items-center gap-1 text-xs font-bold text-brand-700">
                        <CheckCircle2 className="h-4 w-4" />
                        응답 제출 완료
                      </p>
                    ) : null}
                    {isWaitingForTeam ? (
                      <p className="mt-2 text-xs font-bold text-yellow-800">
                        조 배정 대기 중
                      </p>
                    ) : null}
                  </div>
                </div>
                <Button
                  className="mt-3 min-h-9 w-full py-1.5"
                  disabled={event.status === "waiting"}
                  icon={
                    event.status === "closed" ? (
                      <ClipboardList className="h-4 w-4" />
                    ) : undefined
                  }
                  onClick={() => {
                    if (event.status === "active") {
                      setSurveyEventId(event.id);
                    }

                    if (event.status === "closed") {
                      setResultEventId(event.id);
                    }
                  }}
                  variant={event.status === "active" ? "primary" : "secondary"}
                >
                  {buttonLabel}
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
