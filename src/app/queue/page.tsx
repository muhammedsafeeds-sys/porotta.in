"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import Button from "@/components/ui/Button";
import OnlineCountPill from "@/components/ui/OnlineCountPill";
import { getSession, updateSession } from "@/lib/session";
import { trackQueue } from "@/lib/analytics";

const STATUS_COPY = [
  { maxSec: 5, text: "Finding your match…" },
  { maxSec: 15, text: "Checking the best available match…" },
  { maxSec: 30, text: "Still looking — gender match is being prioritized." },
  { maxSec: Infinity, text: "This is taking longer than usual. You can keep waiting, edit tags, or match by gender only." },
];

export default function QueuePage() {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [showBroaden, setShowBroaden] = useState(false);
  const [preferences, setPreferences] = useState({ selfGender: "", desiredGender: "", tags: [] as string[] });

  useEffect(() => {
    const session = getSession();
    if (!session.selfGender || !session.desiredGender) {
      router.replace("/");
      return;
    }
    setPreferences({
      selfGender: session.selfGender,
      desiredGender: session.desiredGender,
      tags: session.selectedTags,
    });
    trackQueue.entered();

    // Timer
    const timerInterval = setInterval(() => {
      setElapsed((p) => p + 1);
    }, 1000);

    // Fetch real online count from waiting_pool
    const fetchCount = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { count } = await supabase.from("waiting_pool").select('*', { count: 'exact', head: true });
      setOnlineCount((count || 0));
    };
    fetchCount();
    const countInterval = setInterval(fetchCount, 5000);

    let channel: any = null;
    let sessionId = sessionStorage.getItem("porotta_sid");

    const initQueue = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem("porotta_sid", sessionId);
      }

      // 1. Ensure session exists
      await supabase.from("sessions").upsert({
        id: sessionId,
        self_gender: session.selfGender,
        desired_gender: session.desiredGender,
        selected_tags: session.selectedTags,
        nickname: session.nickname,
        ip_hash: "dev-ip-hash", // Replace with real IP hash via edge function in prod
      });

      // 2. Subscribe to chat_rooms table for my matches
      channel = supabase.channel(`queue_matches_${sessionId}`);
      channel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_rooms",
            filter: `session_a=eq.${sessionId}`,
          },
          (payload: any) => {
            trackQueue.matchFound();
            updateSession({ lastRoomId: payload.new.id });
            router.push(`/room/${payload.new.id}`);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_rooms",
            filter: `session_b=eq.${sessionId}`,
          },
          (payload: any) => {
            trackQueue.matchFound();
            updateSession({ lastRoomId: payload.new.id });
            router.push(`/room/${payload.new.id}`);
          }
        )
        .subscribe();

      // 3. Enter waiting pool
      await supabase.from("waiting_pool").upsert({
        session_id: sessionId,
        self_gender: session.selfGender,
        desired_gender: session.desiredGender,
        selected_tags: session.selectedTags,
      }, { onConflict: "session_id" });

      // 4. Attempt match immediately, and then every 3 seconds
      const tryMatch = async () => {
        const { data: roomId, error } = await supabase.rpc("attempt_match", {
          p_session_id: sessionId,
        });
        
        if (roomId) {
          trackQueue.matchFound();
          updateSession({ lastRoomId: roomId });
          router.push(`/room/${roomId}`);
        }
      };

      tryMatch();
      const matchInterval = setInterval(tryMatch, 3000);

      // Save interval ID to clear it later
      (window as any).matchIntervalId = matchInterval;
    };

    initQueue();

    return () => {
      clearInterval(countInterval);
      clearInterval(timerInterval);
      if ((window as any).matchIntervalId) {
        clearInterval((window as any).matchIntervalId);
      }
      if (channel) {
        import("@/lib/supabase/client").then(({ createClient }) => {
          createClient().removeChannel(channel);
        });
      }
      
      // Remove from pool on exit
      if (sessionId) {
        import("@/lib/supabase/client").then(({ createClient }) => {
          createClient().from("waiting_pool").delete().eq("session_id", sessionId);
        });
      }
    };
  }, [router]);

  useEffect(() => {
    if (elapsed >= 30 && !showBroaden) {
      setShowBroaden(true);
    }
  }, [elapsed, showBroaden]);

  const statusText = STATUS_COPY.find((s) => elapsed <= s.maxSec)?.text || STATUS_COPY[STATUS_COPY.length - 1].text;

  const handleCancel = useCallback(() => {
    trackQueue.abandoned();
    router.push("/");
  }, [router]);

  const handleBroaden = useCallback(() => {
    trackQueue.preferenceBroadened();
    updateSession({ selectedTags: [] });
    setPreferences((p) => ({ ...p, tags: [] }));
    setShowBroaden(false);
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <AppHeader />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-sm w-full animate-fade-in">
          {/* Spinner */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-surface-2 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>

          {/* Status text */}
          <p className="text-text text-base font-medium mb-2 transition-all duration-300">
            {statusText}
          </p>

          {/* Timer */}
          <p className="text-text-muted text-sm mb-1 tabular-nums">
            Waiting: {formatTime(elapsed)}
          </p>

          {/* Preference display */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="px-2 py-1 bg-surface-1 border border-border rounded text-xs text-text-secondary capitalize">
              {preferences.selfGender}
            </span>
            <span className="text-text-muted text-xs">→</span>
            <span className="px-2 py-1 bg-surface-1 border border-border rounded text-xs text-text-secondary capitalize">
              {preferences.desiredGender}
            </span>
            {preferences.tags.length > 0 && (
              <span className="text-text-muted text-xs">
                + {preferences.tags.length} tag{preferences.tags.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Online count */}
          <div className="flex justify-center mb-6">
            <OnlineCountPill count={onlineCount} />
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            {showBroaden && preferences.tags.length > 0 && (
              <Button
                id="broaden-match-btn"
                variant="secondary"
                fullWidth
                onClick={handleBroaden}
              >
                Try without tags
              </Button>
            )}
            <Button
              id="edit-preferences-btn"
              variant="ghost"
              fullWidth
              onClick={() => router.push("/")}
            >
              Edit preferences
            </Button>
            <Button
              id="cancel-queue-btn"
              variant="ghost"
              fullWidth
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
