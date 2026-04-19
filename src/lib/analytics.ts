// Analytics event emission layer
// Events are structured per blueprint §12.1

export type EventCategory = "entry" | "queue" | "room" | "moderation" | "re-engagement" | "system";

export interface AnalyticsEvent {
  event_type: string;
  category: EventCategory;
  session_id: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

// Event buffer for batch sending
let eventBuffer: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = sessionStorage.getItem("porotta_sid");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("porotta_sid", id);
  }
  return id;
}

export function emitEvent(
  eventType: string,
  category: EventCategory,
  metadata: Record<string, unknown> = {}
): void {
  const event: AnalyticsEvent = {
    event_type: eventType,
    category,
    session_id: getSessionId(),
    metadata,
    timestamp: new Date().toISOString(),
  };

  eventBuffer.push(event);

  // Batch flush every 5 seconds or at 20 events
  if (eventBuffer.length >= 20) {
    flushEvents();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, 5000);
  }
}

async function flushEvents(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (eventBuffer.length === 0) return;

  const batch = [...eventBuffer];
  eventBuffer = [];

  // TODO: Send to Supabase analytics_events table
  // For now, log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log("[Analytics]", batch);
  }
}

// Flush on page unload
if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushEvents();
    }
  });
}

// Convenience emitters for all blueprint events
export const trackEntry = {
  ageGateViewed: () => emitEvent("age_gate_viewed", "entry"),
  ageGateAccepted: () => emitEvent("age_gate_accepted", "entry"),
  ageGateRejected: () => emitEvent("age_gate_rejected", "entry"),
  selectorCompleted: (m: Record<string, unknown>) => emitEvent("selector_completed", "entry", m),
  startChatClicked: (m: Record<string, unknown>) => emitEvent("start_chat_clicked", "entry", m),
};

export const trackQueue = {
  entered: () => emitEvent("queue_entered", "queue"),
  matchFound: () => emitEvent("match_found", "queue"),
  abandoned: () => emitEvent("queue_abandoned", "queue"),
  timeout: () => emitEvent("queue_timeout", "queue"),
  preferenceBroadened: () => emitEvent("preference_broadened", "queue"),
};

export const trackRoom = {
  joined: (roomId: string) => emitEvent("room_joined", "room", { roomId }),
  firstMessageSent: (roomId: string) => emitEvent("first_message_sent", "room", { roomId }),
  replyReceived: (roomId: string) => emitEvent("reply_received", "room", { roomId }),
  typingStarted: (roomId: string) => emitEvent("typing_started", "room", { roomId }),
  endedByUser: (roomId: string) => emitEvent("room_ended_by_user", "room", { roomId }),
  endedByPartner: (roomId: string) => emitEvent("room_ended_by_partner", "room", { roomId }),
};

export const trackModeration = {
  reportOpened: () => emitEvent("report_opened", "moderation"),
  reportSubmitted: (reason: string) => emitEvent("report_submitted", "moderation", { reason }),
  skipUsed: () => emitEvent("skip_used", "moderation"),
  banApplied: (tier: number) => emitEvent("ban_applied", "moderation", { tier }),
  banLifted: () => emitEvent("ban_lifted", "moderation"),
};

export const trackReengagement = {
  endedScreenViewed: () => emitEvent("ended_screen_viewed", "re-engagement"),
  newChatStarted: () => emitEvent("new_chat_started", "re-engagement"),
  preferencesReused: () => emitEvent("preferences_reused", "re-engagement"),
  tagChanged: () => emitEvent("tag_changed", "re-engagement"),
};

export const trackSystem = {
  reconnectAttempted: () => emitEvent("reconnect_attempted", "system"),
  reconnectSuccess: () => emitEvent("reconnect_success", "system"),
  reconnectFailed: () => emitEvent("reconnect_failed", "system"),
  adImpression: (slot: string) => emitEvent("ad_impression", "system", { slot }),
  adError: (slot: string) => emitEvent("ad_error", "system", { slot }),
};
