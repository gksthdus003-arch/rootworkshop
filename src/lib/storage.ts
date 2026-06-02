export const storage = {
  getName(): string | null {
    return localStorage.getItem('wg_name')
  },
  setName(name: string) {
    localStorage.setItem('wg_name', name)
  },
  saveSurveyResponse(id: string, data: any) {
    const key = `survey_${id}`
    localStorage.setItem(key, JSON.stringify(data))
  },
  getSurveyResponse(id: string) {
    const key = `survey_${id}`
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : null
  }
}
export const storageKeys = {
  participantProfile: "workshop-guide:participant-profile",
  selectedGuideId: "workshop-guide:selected-guide-id",
  adminUnlocked: "workshop-guide:admin-unlocked",
  adminPassword: "workshop-guide:admin-password",
  guideOverrides: "workshop-guide:guide-overrides-v2",
  participants: "workshop-guide:participants",
  eventResponses: "workshop-guide:event-responses",
  eventOverrides: "workshop-guide:event-overrides",
} as const;

export const readFromStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const writeToStorage = <T>(key: string, value: T) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};
