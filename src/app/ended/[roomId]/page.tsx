"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import Button from "@/components/ui/Button";
import ReportModal from "@/components/chat/ReportModal";
import { getSession } from "@/lib/session";
import { trackReengagement } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";

export default function EndedPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const wasReported = searchParams.get("reported") === "true";
  const wasPartnerLeft = searchParams.get("left") === "true";
  const [isReported, setIsReported] = useState(wasReported);
  const [feedbackGiven, setFeedbackGiven] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const sessionId = typeof window !== "undefined" ? sessionStorage.getItem("porotta_sid") || "" : "";

  useEffect(() => {
    trackReengagement.endedScreenViewed();
  }, []);

  const session = getSession();

  const handleReusePreferences = useCallback(() => {
    trackReengagement.preferencesReused();
    router.push("/queue");
  }, [router]);

  // Enter to Next Chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && session.selfGender && session.desiredGender) {
        handleReusePreferences();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [session, handleReusePreferences]);

  const handleNewChat = () => {
    trackReengagement.newChatStarted();
    router.push("/");
  };


  const headline = isReported
    ? "Chat closed after report"
    : wasPartnerLeft
    ? "Partner left the chat"
    : "Chat ended";

  const supportCopy = isReported
    ? "Thank you for helping keep porotta.in safe. You can try again whenever you're ready."
    : wasPartnerLeft
    ? "Your chat partner disconnected."
    : null;

  return (
    <>
      <AppHeader />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-sm w-full animate-fade-in pb-12">
          <div className="w-16 h-16 mx-auto mb-5 bg-surface-1 border border-border rounded-full flex items-center justify-center">
            {isReported ? (
              <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            )}
          </div>

          <h1 className="text-xl font-semibold text-text mb-2">{headline}</h1>

          {supportCopy && (
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">{supportCopy}</p>
          )}

          {!supportCopy && (
            <p className="text-text-secondary text-sm mb-6">Start a new conversation.</p>
          )}

          {/* Feedback chips */}
          {!feedbackGiven && (
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {["Good chat", "Couldn't connect", "Wait was long"].map((fb) => (
                <button
                  key={fb}
                  onClick={async () => {
                    setFeedbackGiven(fb);
                    const supabase = createClient();
                    
                    // Identify if we are session_a or session_b
                    const { data: room } = await supabase.from("chat_rooms").select("session_a, session_b").eq("id", roomId).single();
                    if (room) {
                      const isSessionA = room.session_a === sessionId;
                      await supabase.from("chat_rooms")
                        .update(isSessionA ? { feedback_a: fb } : { feedback_b: fb })
                        .eq("id", roomId);
                    }
                  }}
                  className="px-3 py-1.5 bg-surface-1 border border-border rounded-full text-xs text-text-secondary hover:text-text hover:border-primary/40 transition-all cursor-pointer"
                >
                  {fb}
                </button>
              ))}
            </div>
          )}
          {feedbackGiven && (
            <p className="text-xs text-text-muted mb-6 animate-fade-in">
              Thanks for the feedback ✓
            </p>
          )}

          {/* CTAs */}
          <div className="space-y-3">
            {session.selfGender && session.desiredGender && (
              <Button id="reuse-prefs-btn" fullWidth size="lg" onClick={handleReusePreferences}>
                Find next chat
              </Button>
            )}
            <Button id="new-chat-btn" variant={session.selfGender ? "secondary" : "primary"} fullWidth size={session.selfGender ? "md" : "lg"} onClick={handleNewChat}>
              Change preferences
            </Button>
            
            {!isReported && (
              <div className="pt-4 mt-4 border-t border-border">
                <button 
                  onClick={() => setShowReportModal(true)}
                  className="text-xs text-text-muted hover:text-error transition-colors underline underline-offset-2"
                >
                  Report this user
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        roomId={roomId}
        onSubmitted={async (reason) => {
          setShowReportModal(false);
          setIsReported(true);
          const supabase = createClient();

          const { data: room } = await supabase.from("chat_rooms").select("session_a, session_b").eq("id", roomId).single();
          if (room) {
            const reportedSession = room.session_a === sessionId ? room.session_b : room.session_a;
            await supabase.from("reports").insert({
              room_id: roomId,
              reporter_session: sessionId,
              reported_session: reportedSession,
              reason: reason,
              severity_score: reason === 'minor' ? 1 : reason === 'other' ? 2 : 5
            });
          }

          await supabase.from("chat_rooms").update({
            status: "reported",
            end_reason: "report_after_end",
            ended_by: sessionId
          }).eq("id", roomId);
        }}
      />
    </>
  );
}
