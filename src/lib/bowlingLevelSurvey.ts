import type { EventItem, SurveyQuestion } from "../types/workshop";

export const BOWLING_TARGET_SCORE_QUESTION_ID = "targetScore";

export const bowlingTargetScoreQuestion: SurveyQuestion = {
  id: BOWLING_TARGET_SCORE_QUESTION_ID,
  type: "shortText",
  label: "이번 볼링 목표 점수를 숫자로 입력해 주세요.",
  required: true,
  options: [],
};

export const isBowlingEventItem = (event: EventItem) =>
  event.type === "event" && event.eventKind === "bowling";

export const isBowlingLevelSurveyEvent = (
  event: EventItem,
  guideEvents: EventItem[] = [],
) =>
  event.type === "survey" &&
  (event.surveyKind === "bowlingLevel" ||
    guideEvents.some(
      (guideEvent) => isBowlingEventItem(guideEvent) && guideEvent.linkedSurveyId === event.id,
    ));

export const isBowlingTargetScoreQuestion = (
  event: EventItem,
  questionId: string,
  guideEvents: EventItem[] = [],
) =>
  isBowlingLevelSurveyEvent(event, guideEvents) &&
  questionId === BOWLING_TARGET_SCORE_QUESTION_ID;

export const ensureBowlingTargetScoreQuestion = (
  event: EventItem,
  guideEvents: EventItem[] = [],
): EventItem => {
  if (!isBowlingLevelSurveyEvent(event, guideEvents)) {
    return event;
  }

  const survey = event.survey ?? [];
  const targetQuestion = survey.find(
    (question) => question.id === BOWLING_TARGET_SCORE_QUESTION_ID,
  );
  const normalizedTargetQuestion: SurveyQuestion = {
    ...bowlingTargetScoreQuestion,
    ...targetQuestion,
    id: BOWLING_TARGET_SCORE_QUESTION_ID,
    type: "shortText",
    required: true,
    options: [],
  };

  if (!targetQuestion) {
    return {
      ...event,
      survey: [...survey, normalizedTargetQuestion],
    };
  }

  return {
    ...event,
    survey: survey.map((question) =>
      question.id === BOWLING_TARGET_SCORE_QUESTION_ID
        ? normalizedTargetQuestion
        : question,
    ),
  };
};

export const ensureBowlingTargetScoreQuestions = (events: EventItem[]) =>
  events.map((event) => ensureBowlingTargetScoreQuestion(event, events));
