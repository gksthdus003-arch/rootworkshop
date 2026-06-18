// Thin async API client. All data shaping/normalization happens on the server.
import { readFromStorage, storageKeys, writeToStorage } from "../lib/storage";
import type {
  EventItem,
  EventSurveyResponse,
  ParticipantProfile,
  WorkshopGuide,
} from "../types/workshop";

const API_BASE = "/api";

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
  saveEventResponse: (response: EventSurveyResponse) =>
    request<EventSurveyResponse>("/event-responses", {
      method: "POST",
      body: JSON.stringify(response),
    }),

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
