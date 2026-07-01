// Thin async API client. All data shaping/normalization happens on the server.
import { readFromStorage, storageKeys, writeToStorage } from "../lib/storage";
import type {
  EventItem,
  EventSurveyResponse,
  ParticipantProfile,
  WorkshopGuide,
  ScheduleItem,
} from "../types/workshop";

const API_BASE = "/api";
const EVENT_RESPONSES_PATH = "/event-responses";
const EVENT_RESPONSES_ENDPOINT = `${API_BASE}${EVENT_RESPONSES_PATH}`;

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    ...init,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`API ${path} failed (${response.status}): ${message}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

// ---------------------------------------------------------------------------
// Shared data — backed by the MySQL server.
// ---------------------------------------------------------------------------
export const workshopApi = {
  listGuides: () => request<WorkshopGuide[]>("/guides"),
  saveGuides: (guides: WorkshopGuide[]) =>
    request<WorkshopGuide[]>("/guides", {
      method: "PUT",
      body: JSON.stringify(guides),
    }),
  updateScheduleItem: (
    guideId: string,
    scheduleItemId: string,
    updates: Partial<ScheduleItem>,
  ) =>
    request<WorkshopGuide>(
      `/guides/${encodeURIComponent(guideId)}/schedule/${encodeURIComponent(scheduleItemId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(updates),
      },
    ),

  listParticipants: () => request<ParticipantProfile[]>("/participants"),
  // Server is the source of truth for membership: a non-member returns 403 and
  // is reported back as { ok: false } instead of throwing.
  registerParticipant: async (
    profile: ParticipantProfile,
  ): Promise<
    | { ok: true; participants: ParticipantProfile[] }
    | { ok: false; error: string }
  > => {
    const response = await fetch(`${API_BASE}/participants`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(profile),
    });

    if (response.status === 403) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      return { ok: false, error: data.error ?? "접근이 불가합니다." };
    }

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText);
      throw new Error(`API /participants failed (${response.status}): ${message}`);
    }

    return { ok: true, participants: (await response.json()) as ParticipantProfile[] };
  },

  listEventResponses: () => request<EventSurveyResponse[]>("/event-responses"),
  saveEventResponses: (responses: EventSurveyResponse[]) =>
    request<EventSurveyResponse[]>("/event-responses", {
      method: "PUT",
      body: JSON.stringify(responses),
    }),
  saveEventResponse: async (response: EventSurveyResponse) => {
    const payload = response;
    const body = JSON.stringify(payload);

    const apiResponse = await fetch(EVENT_RESPONSES_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    }).catch((error) => {
      console.error("[workshopApi] saveEventResponse network failure", {
        endpoint: EVENT_RESPONSES_ENDPOINT,
        payload,
        status: "network-error",
        error,
        hint: "로컬 API 서버 또는 SQL DB 연결이 준비되지 않았을 수 있습니다.",
      });
      throw error;
    });

    const responseBody = await apiResponse.text().catch((error) => {
      console.error("[workshopApi] saveEventResponse response read failure", {
        endpoint: EVENT_RESPONSES_ENDPOINT,
        payload,
        status: apiResponse.status,
        error,
      });
      return "";
    });

    if (!apiResponse.ok) {
      console.error("[workshopApi] saveEventResponse failed", {
        endpoint: EVENT_RESPONSES_ENDPOINT,
        payload,
        status: apiResponse.status,
        responseBody,
        hint:
          apiResponse.status >= 500
            ? "서버 내부 오류입니다. 로컬 환경이면 SQL DB 연결 상태를 확인하세요."
            : "요청 payload 또는 API 응답을 확인하세요.",
      });
      throw new Error(
        `API ${EVENT_RESPONSES_PATH} failed (${apiResponse.status}): ${
          responseBody || apiResponse.statusText
        }`,
      );
    }

    try {
      return JSON.parse(responseBody) as EventSurveyResponse;
    } catch (error) {
      console.error("[workshopApi] saveEventResponse invalid JSON response", {
        endpoint: EVENT_RESPONSES_ENDPOINT,
        payload,
        status: apiResponse.status,
        responseBody,
        error,
      });
      throw error;
    }
  },

  getEventOverrides: () =>
    request<Record<string, EventItem[]>>("/event-overrides"),
  saveEventOverrides: (eventOverrides: Record<string, EventItem[]>) =>
    request<Record<string, EventItem[]>>("/event-overrides", {
      method: "PUT",
      body: JSON.stringify(eventOverrides),
    }),

  verifyAdminPassword: async (password: string) => {
    const { ok } = await request<{ ok: boolean }>("/admin/verify", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    return ok;
  },
  setAdminPassword: (password: string) =>
    request<{ ok: boolean }>("/admin/password", {
      method: "PUT",
      body: JSON.stringify({ password }),
    }),
};

// ---------------------------------------------------------------------------
// Client-only state — stays in this browser's localStorage.
// ---------------------------------------------------------------------------
export const clientState = {
  getParticipantProfile: () =>
    readFromStorage<ParticipantProfile | undefined>(
      storageKeys.participantProfile,
      undefined,
    ),
  saveParticipantProfile: (profile: ParticipantProfile) => {
    writeToStorage(storageKeys.participantProfile, profile);
  },

  getSelectedGuideId: (fallbackGuideId: string) =>
    readFromStorage(storageKeys.selectedGuideId, fallbackGuideId),
  saveSelectedGuideId: (guideId: string) => {
    writeToStorage(storageKeys.selectedGuideId, guideId);
  },

  isAdminUnlocked: () => readFromStorage(storageKeys.adminUnlocked, false),
  setAdminUnlocked: (isUnlocked: boolean) => {
    writeToStorage(storageKeys.adminUnlocked, isUnlocked);
  },
};
