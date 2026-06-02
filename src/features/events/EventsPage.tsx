import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, PartyPopper, Users } from "lucide-react";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { cn } from "../../lib/cn";
import { useWorkshopStore } from "../../store/workshopStore";
import type { EventItem, EventStatus, SurveyQuestion } from "../../types/workshop";

const eventStatusMeta: Record<
  EventStatus,
  {
    label: string;
    buttonLabel: string;
    className: string;
  }
> = {
  waiting: {
    label: "예정",
    buttonLabel: "대기 중",
    className: "bg-gray-100 text-gray-600",
  },
  active: {
    label: "진행 중",
    buttonLabel: "참여하기",
    className: "bg-brand-50 text-brand-700",
  },
  closed: {
    label: "종료",
    buttonLabel: "결과 확인",
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

interface SurveyFormProps {
  event: EventItem;
  participantName?: string;
  onCancel: () => void;
  onSubmit: (answers: Record<string, string | string[]>) => void;
}

const SurveyForm = ({ event, participantName, onCancel, onSubmit }: SurveyFormProps) => {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [errorMessage, setErrorMessage] = useState("");

  const updateAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: value,
    }));
  };

  const toggleCheckboxAnswer = (questionId: string, option: string) => {
    const currentValue = answers[questionId];
    const currentAnswers = Array.isArray(currentValue) ? currentValue : [];

    updateAnswer(
      questionId,
      currentAnswers.includes(option)
        ? currentAnswers.filter((answer) => answer !== option)
        : [...currentAnswers, option],
    );
  };

  const handleSubmit = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();

    if (!participantName) {
      setErrorMessage("이름 입력 후 참여할 수 있습니다.");
      return;
    }

    const missingQuestion = event.survey.find(
      (question) =>
        question.required &&
        question.type !== "description" &&
        !isAnswered(answers[question.id]),
    );

    if (missingQuestion) {
      setErrorMessage(`"${missingQuestion.label}" 문항을 입력해 주세요.`);
      return;
    }

    setErrorMessage("");
    onSubmit(answers);
  };

  const renderQuestion = (question: SurveyQuestion) => {
    if (question.type === "description") {
      return (
        <div className="rounded-lg border border-brand-100 bg-brand-50 p-3">
          <p className="text-sm font-bold text-brand-900">{question.label}</p>
          {question.description ? (
            <p className="mt-1 text-sm leading-6 text-brand-900/80">{question.description}</p>
          ) : null}
        </div>
      );
    }

    if (question.type === "singleChoice") {
      return (
        <fieldset className="space-y-2">
          <legend className="text-sm font-bold text-gray-950">
            {question.label}
            {question.required ? <span className="ml-1 text-brand-700">*</span> : null}
          </legend>
          <div className="grid gap-2">
            {question.options?.map((option) => (
              <label
                className="flex min-h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700"
                key={option}
              >
                <input
                  checked={answers[question.id] === option}
                  className="h-4 w-4 accent-brand-700"
                  name={question.id}
                  onChange={() => updateAnswer(question.id, option)}
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
      const currentValue = answers[question.id];
      const currentAnswers = Array.isArray(currentValue) ? currentValue : [];

      return (
        <fieldset className="space-y-2">
          <legend className="text-sm font-bold text-gray-950">
            {question.label}
            {question.required ? <span className="ml-1 text-brand-700">*</span> : null}
          </legend>
          <div className="grid gap-2">
            {question.options?.map((option) => (
              <label
                className="flex min-h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700"
                key={option}
              >
                <input
                  checked={currentAnswers.includes(option)}
                  className="h-4 w-4 accent-brand-700"
                  onChange={() => toggleCheckboxAnswer(question.id, option)}
                  type="checkbox"
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>
      );
    }

    return (
      <label className="block">
        <span className="text-sm font-bold text-gray-950">
          {question.label}
          {question.required ? <span className="ml-1 text-brand-700">*</span> : null}
        </span>
        <input
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          onChange={(inputEvent) => updateAnswer(question.id, inputEvent.target.value)}
          placeholder="답변을 입력해 주세요"
          value={(answers[question.id] as string | undefined) ?? ""}
        />
      </label>
    );
  };

  return (
    <form className="mt-4 space-y-4 border-t border-gray-100 pt-4" onSubmit={handleSubmit}>
      {event.survey.map((question) => (
        <div key={question.id}>{renderQuestion(question)}</div>
      ))}

      {errorMessage ? <p className="text-sm font-semibold text-red-600">{errorMessage}</p> : null}

      <div className="flex gap-2">
        <Button className="flex-1" type="submit">
          제출
        </Button>
        <Button className="flex-1" onClick={onCancel} variant="secondary">
          취소
        </Button>
      </div>
    </form>
  );
};

interface EventResultProps {
  event: EventItem;
  responseCount: number;
}

const EventResult = ({ event, responseCount }: EventResultProps) => {
  return (
    <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
      <div className="rounded-lg bg-gray-50 p-3">
        <p className="text-sm font-bold text-gray-950">결과</p>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          {event.resultSummary ?? `현재 저장된 응답은 ${responseCount}건입니다.`}
        </p>
      </div>

      {event.groupAssignments?.length ? (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-bold text-gray-950">
            <Users className="h-4 w-4 text-brand-700" />
            조 배정 결과
          </p>
          {event.groupAssignments.map((group) => (
            <div className="rounded-lg border border-gray-200 p-3" key={group.groupName}>
              <p className="text-sm font-bold text-brand-900">{group.groupName}</p>
              <p className="mt-1 text-sm text-gray-600">{group.members.join(", ")}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const EventsPage = () => {
  const {
    eventResponses,
    participantProfile,
    saveEventResponse,
    selectedGuide,
  } = useWorkshopStore();
  const [activeSurveyEventId, setActiveSurveyEventId] = useState<string>();
  const [activeResultEventId, setActiveResultEventId] = useState<string>();
  const participantName = participantProfile?.name;

  const responseByEventId = useMemo(() => {
    const responses = eventResponses.filter(
      (response) =>
        response.guideId === selectedGuide.id && response.participantName === participantName,
    );

    return new Map(responses.map((response) => [response.eventId, response]));
  }, [eventResponses, participantName, selectedGuide.id]);

  const getResponseCount = (eventId: string) =>
    eventResponses.filter(
      (response) => response.guideId === selectedGuide.id && response.eventId === eventId,
    ).length;

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
          selectedGuide.events.map((event) => (
            <Card key={event.id}>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-brand-50 p-2 text-brand-700">
                  <PartyPopper className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-[11px] font-bold",
                      eventStatusMeta[event.status].className,
                    )}
                  >
                    {eventStatusMeta[event.status].label}
                  </span>
                  <h2 className="mt-2 text-lg font-bold">{event.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{event.description}</p>

                  {responseByEventId.has(event.id) ? (
                    <p className="mt-2 flex items-center gap-1 text-xs font-bold text-brand-700">
                      <CheckCircle2 className="h-4 w-4" />
                      응답 제출 완료
                    </p>
                  ) : null}

                  {activeSurveyEventId === event.id && event.status === "active" ? (
                    <SurveyForm
                      event={event}
                      onCancel={() => setActiveSurveyEventId(undefined)}
                      onSubmit={(answers) => {
                        if (!participantName) {
                          return;
                        }

                        saveEventResponse({
                          id: createId(),
                          guideId: selectedGuide.id,
                          eventId: event.id,
                          participantName,
                          submittedAt: new Date().toISOString(),
                          answers,
                        });
                        setActiveSurveyEventId(undefined);
                      }}
                      participantName={participantName}
                    />
                  ) : null}

                  {activeResultEventId === event.id && event.status === "closed" ? (
                    <EventResult event={event} responseCount={getResponseCount(event.id)} />
                  ) : null}
                </div>

                <div className="shrink-0">
                  <Button
                    disabled={event.status === "waiting"}
                    icon={
                      event.status === "closed" ? (
                        <ClipboardList className="h-4 w-4" />
                      ) : undefined
                    }
                    onClick={() => {
                      if (event.status === "active") {
                        setActiveSurveyEventId((eventId) =>
                          eventId === event.id ? undefined : event.id,
                        );
                        setActiveResultEventId(undefined);
                      }

                      if (event.status === "closed") {
                        setActiveResultEventId((eventId) =>
                          eventId === event.id ? undefined : event.id,
                        );
                        setActiveSurveyEventId(undefined);
                      }
                    }}
                    variant={event.status === "active" ? "primary" : "secondary"}
                  >
                    {eventStatusMeta[event.status].buttonLabel}
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card>
            <p className="text-sm text-gray-500">등록된 이벤트가 없습니다.</p>
          </Card>
        )}
      </div>
    </section>
  );
};
