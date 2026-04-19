"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import { trackSystem } from "@/lib/analytics";

export default function ReconnectPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<"attempting" | "failed">("attempting");

  useEffect(() => {
    trackSystem.reconnectAttempted();
    const timer = setInterval(() => setElapsed((p) => p + 1), 1000);
    // Simulate reconnect attempt — 30 second window
    const failTimer = setTimeout(() => {
      setStatus("failed");
      trackSystem.reconnectFailed();
      clearInterval(timer);
      setTimeout(() => router.push(`/ended/${roomId}`), 2000);
    }, 8000 + Math.random() * 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(failTimer);
    };
  }, [roomId, router]);

  return (
    <>
      <AppHeader />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-sm animate-fade-in">
          {status === "attempting" ? (
            <>
              <div className="relative w-16 h-16 mx-auto mb-5">
                <div className="absolute inset-0 border-4 border-surface-2 rounded-full" />
                <div className="absolute inset-0 border-4 border-warning border-t-transparent rounded-full animate-spin" />
              </div>
              <h1 className="text-lg font-semibold text-text mb-2">Reconnecting…</h1>
              <p className="text-text-secondary text-sm mb-1">
                Attempting to restore your chat session.
              </p>
              <p className="text-text-muted text-xs tabular-nums">{elapsed}s</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-5 bg-surface-1 border border-border rounded-full flex items-center justify-center">
                <span className="text-2xl">😔</span>
              </div>
              <h1 className="text-lg font-semibold text-text mb-2">Connection lost</h1>
              <p className="text-text-secondary text-sm">
                We couldn&apos;t restore your session. Redirecting you now…
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
