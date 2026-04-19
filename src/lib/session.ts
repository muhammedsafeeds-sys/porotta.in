// Anonymous session management — client-side preference persistence
// Server-side session via Supabase will be added in Phase B

const STORAGE_KEY = "porotta_session";

export interface SessionPreferences {
  ageConfirmed: boolean;
  ageConfirmedAt: string | null;
  selfGender: string | null;
  desiredGender: string | null;
  selectedTags: string[];
  nickname: string | null;
  lastRoomId: string | null;
}

const defaultPreferences: SessionPreferences = {
  ageConfirmed: false,
  ageConfirmedAt: null,
  selfGender: null,
  desiredGender: null,
  selectedTags: [],
  nickname: null,
  lastRoomId: null,
};

export function getSession(): SessionPreferences {
  if (typeof window === "undefined") return defaultPreferences;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultPreferences, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return defaultPreferences;
}

export function updateSession(updates: Partial<SessionPreferences>): SessionPreferences {
  const current = getSession();
  const updated = { ...current, ...updates };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage full or unavailable
  }
  return updated;
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function isAgeConfirmed(): boolean {
  const session = getSession();
  if (!session.ageConfirmed || !session.ageConfirmedAt) return false;
  // Age confirmation valid for 30 days
  const confirmedAt = new Date(session.ageConfirmedAt);
  const now = new Date();
  const daysSince = (now.getTime() - confirmedAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince < 30;
}
