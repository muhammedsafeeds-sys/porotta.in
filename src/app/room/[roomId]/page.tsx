"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import { useRouter, useParams } from "next/navigation";
import Wordmark from "@/components/layout/Wordmark";
import AdsterraAd from "@/components/ads/AdsterraAd";
import { getSession } from "@/lib/session";
import { trackRoom } from "@/lib/analytics";
import ReportModal from "@/components/chat/ReportModal";
import { createClient } from "@/lib/supabase/client";

interface ChatMessage {
  id: string;
  room_id?: string;
  sender_session: string;
  content: string;
  sent_at: string;
}

const STARTER_PROMPTS = [
  "Hey, what's up? 👋",
  "What are you into?",
  "How's your day going?",
  "Tell me something interesting about yourself",
];

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerNickname, setPartnerNickname] = useState<string>("Stranger");
  const [partnerGender, setPartnerGender] = useState<string>("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [showStarterPrompts, setShowStarterPrompts] = useState(true);
  const [charCount, setCharCount] = useState(0);
  const [cooldown, setCooldown] = useState(false);
  const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
  const [roomValid, setRoomValid] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingStateRef = useRef<boolean>(false);
  const trackQueueRef = useRef<{ isTracking: boolean, pending: boolean | null }>({ isTracking: false, pending: null });
  const channelRef = useRef<any>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingFallbackRef = useRef<NodeJS.Timeout | null>(null);
  const partnerLeaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_CHARS = 500;
  const session = getSession();
  const sessionId = typeof window !== "undefined" ? (sessionStorage.getItem("porotta_sid") || "") : "";

  useEffect(() => {
    if (!sessionId) {
      router.replace("/");
      return;
    }

    trackRoom.joined(roomId);
    const supabase = createClient();
    let isMounted = true;

    const initRoom = async () => {
      // 1. Validate room exists and is active, and we belong to it
      const { data: room, error: roomError } = await supabase
        .from("chat_rooms")
        .select("session_a, session_b, status")
        .eq("id", roomId)
        .single();
      
      if (!room || roomError || (room.session_a !== sessionId && room.session_b !== sessionId)) {
        if (isMounted) {
          setRoomValid(false);
          router.replace("/");
        }
        return;
      }

      if (room.status !== "active") {
        if (isMounted) router.replace(`/ended/${roomId}`);
        return;
      }

      // 2. Fetch partner info
      const partnerSessionId = room.session_a === sessionId ? room.session_b : room.session_a;
      const { data: partner } = await supabase
        .from("sessions")
        .select("nickname, self_gender")
        .eq("id", partnerSessionId)
        .single();
      
      if (partner && isMounted) {
        if (partner.nickname) setPartnerNickname(partner.nickname);
        if (partner.self_gender) setPartnerGender(partner.self_gender);
      }

      // 3. Fetch initial messages
      const { data: initialMsgs } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", roomId)
        .order("sent_at", { ascending: true });
      
      if (initialMsgs && isMounted) {
        setMessages(initialMsgs);
        if (initialMsgs.length > 0) setShowStarterPrompts(false);
      }

      // 4. Setup Realtime Channel
      const channel = supabase.channel(`room:${roomId}`, {
        config: { presence: { key: sessionId } }
      });
      channelRef.current = channel;

      channel
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload: any) => {
            if (!isMounted) return;
            if (payload.new.room_id === roomId) {
              setMessages((prev) => {
                // Prevent duplicate messages from optimistic UI
                if (prev.some(m => m.id === payload.new.id)) return prev;
                
                return [...prev, payload.new as ChatMessage].sort(
                  (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
                );
              });
              if (payload.new.sender_session !== sessionId) {
                trackRoom.replyReceived(roomId);
              }
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "chat_rooms", filter: `id=eq.${roomId}` },
          (payload: any) => {
            if (!isMounted) return;
            if (payload.new.status !== "active") {
              if (payload.new.end_reason === "report") {
                router.push(`/ended/${roomId}?reported=true`);
              } else {
                trackRoom.endedByPartner(roomId);
                router.push(`/ended/${roomId}`);
              }
            }
          }
        )
        .on("presence", { event: "sync" }, () => {
          if (!isMounted) return;
          const state = channel.presenceState();
          let isPartnerTyping = false;
          let partnerPresent = false;
          for (const key in state) {
            if (key !== sessionId) {
              partnerPresent = true;
              const presenceEntries = state[key] as any[];
              if (presenceEntries?.some((p) => p.isTyping === true)) {
                isPartnerTyping = true;
              }
            }
          }
          setPartnerTyping(isPartnerTyping);

          // Auto-clear typing after 1.5 seconds of no update
          if (isPartnerTyping) {
            if (typingFallbackRef.current) clearTimeout(typingFallbackRef.current);
            typingFallbackRef.current = setTimeout(() => {
              if (isMounted) setPartnerTyping(false);
            }, 1500);
          } else {
            if (typingFallbackRef.current) clearTimeout(typingFallbackRef.current);
          }
        })
        .on("presence", { event: "leave" }, ({ key }: any) => {
          if (!isMounted) return;
          if (key !== sessionId) {
            setPartnerTyping(false);
          }
        })
        .on("presence", { event: "join" }, ({ key }: any) => {
          if (!isMounted) return;
        })
        .subscribe(async (status: any) => {
          if (status === "SUBSCRIBED") {
            await channel.track({ isTyping: false });
          }
        });

      // 5. Polling fallback (every 5 seconds)
      pollIntervalRef.current = setInterval(async () => {
        if (!isMounted) return;
        const { data: latestMsgs } = await supabase
          .from("messages")
          .select("*")
          .eq("room_id", roomId)
          .order("sent_at", { ascending: true });
        
        if (latestMsgs && isMounted) {
          setMessages((prev) => {
            // Replace entire list if lengths differ (handles all edge cases)
            if (latestMsgs.length !== prev.length) return latestMsgs;
            // Check if any new messages
            const hasNew = latestMsgs.some(lm => !prev.some(pm => pm.id === lm.id));
            return hasNew ? latestMsgs : prev;
          });
        }

        // Also check if room is still active
        const { data: roomCheck } = await supabase
          .from("chat_rooms")
          .select("status, end_reason")
          .eq("id", roomId)
          .single();
        
        if (roomCheck && roomCheck.status !== "active" && isMounted) {
          if (roomCheck.end_reason === "report") {
            router.push(`/ended/${roomId}?reported=true`);
          } else {
            router.push(`/ended/${roomId}`);
          }
        }

        // Poor man's cron: ping the bot engine to keep it alive
        fetch("/api/bot/cycle", { method: "POST" }).catch(() => {});
        fetch("/api/bot/respond", { method: "POST" }).catch(() => {});
      }, 5000);
    };

    initRoom();

    return () => {
      isMounted = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (typingFallbackRef.current) clearTimeout(typingFallbackRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId, router, sessionId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages, partnerTyping]);

  // Play subtle connection sound on mount
  useEffect(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (err) {
      // Ignore audio errors
    }
  }, []);

  // Background tab notification — flash title when new message arrives
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.sender_session === sessionId) return;

    if (document.hidden) {
      const originalTitle = document.title;
      document.title = "New message — porotta.in";
      const onFocus = () => {
        document.title = originalTitle;
        window.removeEventListener("focus", onFocus);
      };
      window.addEventListener("focus", onFocus);
      return () => window.removeEventListener("focus", onFocus);
    }
  }, [messages, sessionId]);

  const processTrackQueue = async () => {
    const queue = trackQueueRef.current;
    if (queue.isTracking || queue.pending === null || !channelRef.current) return;
    
    queue.isTracking = true;
    const typing = queue.pending;
    queue.pending = null;
    
    try {
      typingStateRef.current = typing;
      await channelRef.current.track({ isTyping: typing });
    } catch (err) {
      console.error("Presence track error", err);
    } finally {
      queue.isTracking = false;
      if (queue.pending !== null) {
        processTrackQueue();
      }
    }
  };

  const updateTypingStatus = (isTyping: boolean) => {
    if (typingStateRef.current === isTyping) return;
    trackQueueRef.current.pending = isTyping;
    processTrackQueue();
  };

  const handleInputChange = (val: string) => {
    setInputValue(val);
    setCharCount(val.length);
    
    // Typing indicator logic
    if (val.length > 0) {
      updateTypingStatus(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        updateTypingStatus(false);
      }, 800);
    } else {
      updateTypingStatus(false);
    }
  };

  const sendMessage = (content: string) => {
    if (!content.trim() || content.length > MAX_CHARS || cooldown) return;
    const finalContent = content.trim();

    const newId = crypto.randomUUID();
    const optimisticMsg: ChatMessage = {
      id: newId,
      room_id: roomId as string,
      sender_session: sessionId,
      content: finalContent,
      sent_at: new Date().toISOString()
    };
    
    // Force immediate DOM update for zero perceived delay
    flushSync(() => {
      setInputValue("");
      setCharCount(0);
      setShowStarterPrompts(false);
      updateTypingStatus(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setCooldown(true);
      setMessages(prev => [...prev, optimisticMsg]);
    });
    
    if (messages.length === 0) trackRoom.firstMessageSent(roomId as string);
    setTimeout(() => setCooldown(false), 500);

    // Fire and forget network request (non-blocking)
    const supabase = createClient();
    supabase.from("messages").insert({
      id: newId,
      room_id: roomId,
      sender_session: sessionId,
      content: finalContent,
    }).then(({error}) => {
      if (error) console.error("Message send failed:", error);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleEndChat = useCallback(async () => {
    trackRoom.endedByUser(roomId);
    const supabase = createClient();
    await supabase.from("chat_rooms").update({
      status: "ended",
      end_reason: "user_end",
      ended_by: sessionId,
      ended_at: new Date().toISOString()
    }).eq("id", roomId);
    router.push(`/ended/${roomId}`);
  }, [roomId, router, sessionId]);

  // ESC to confirm/end chat
  useEffect(() => {
    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsConfirmingEnd((prev) => {
          if (prev) {
            handleEndChat();
            return false;
          }
          return true;
        });
      }
    };

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [handleEndChat]);

  // Reset confirmation after 3 seconds
  useEffect(() => {
    if (isConfirmingEnd) {
      const timer = setTimeout(() => setIsConfirmingEnd(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmingEnd]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Group consecutive messages from same sender
  const groupedMessages = messages.reduce<{ messages: ChatMessage[]; sender_session: string }[]>(
    (groups, msg) => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.sender_session === msg.sender_session) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({ sender_session: msg.sender_session, messages: [msg] });
      }
      return groups;
    },
    []
  );

  if (!roomValid) return null;

  return (
    <div className="flex flex-col h-dvh bg-bg w-full max-w-4xl mx-auto border-x border-border/30 relative shadow-sm">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface-1 border-b border-border px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Wordmark className="h-4 sm:h-5 w-auto flex-shrink-0 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-xs text-text-muted overflow-hidden">
            <span className="px-2 py-0.5 bg-surface-2 border border-border rounded text-[11px] truncate font-medium text-text max-w-[120px] sm:max-w-xs">
              {partnerNickname} {partnerGender && <span className="text-text-muted capitalize font-normal">({partnerGender})</span>}
            </span>
            <span className="hidden sm:inline">·</span>
            {partnerTyping ? (
              <span className="text-primary font-medium truncate">Typing...</span>
            ) : (
              <span className="truncate text-success">Online</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            id="report-btn"
            onClick={() => setShowReportModal(true)}
            className="px-2.5 sm:px-3 py-1.5 bg-error text-white text-[11px] sm:text-xs font-medium rounded-[var(--radius-sm)] hover:brightness-90 transition-all min-h-[36px] cursor-pointer"
            aria-label="Report user"
          >
            Report
          </button>
        </div>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 flex flex-col">
        {/* Spacer pushes content to bottom when few messages */}
        <div className="flex-1" />

        <div className="text-center py-4 mb-2 animate-fade-in">
          <p className="text-sm text-text-secondary">
            You&apos;re connected with <span className="font-medium text-text">{partnerNickname}</span>
          </p>
          <p className="text-xs text-text-muted mt-1">
            Messages auto-clear in 24 hours
          </p>
        </div>

        {/* Starter prompts */}
        {showStarterPrompts && messages.length === 0 && (
          <div className="flex flex-wrap justify-center gap-2 py-3 animate-fade-in">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="px-3 py-2 bg-surface-1 border border-border rounded-full text-sm text-text-secondary hover:text-text hover:border-primary/40 transition-all cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Message groups */}
        {groupedMessages.map((group, gi) => {
          const isSelf = group.sender_session === sessionId;
          return (
            <div key={gi} className={`flex flex-col ${isSelf ? "items-end" : "items-start"} gap-0.5 mb-2`}>
              {group.messages.map((msg, mi) => (
                <div
                  key={msg.id}
                  className={`group max-w-[80%] sm:max-w-[70%] px-3.5 py-2 text-sm leading-relaxed break-words animate-fade-in ${
                    isSelf
                      ? "bg-primary text-white rounded-2xl rounded-br-md"
                      : "bg-surface-1 text-text border border-border rounded-2xl rounded-bl-md"
                  } ${mi === 0 ? "" : isSelf ? "rounded-tr-md" : "rounded-tl-md"}`}
                  title={formatTime(msg.sent_at)}
                >
                  {msg.content}
                </div>
              ))}
            </div>
          );
        })}

        {/* Typing indicator */}
        {partnerTyping && (
          <div className="flex items-start mb-1">
            <div className="bg-surface-1 border border-border rounded-2xl rounded-bl-md px-3 py-2">
              <div className="flex gap-[3px] items-center h-4">
                <span className="w-[5px] h-[5px] bg-text-muted/60 rounded-full" style={{ animation: "dot-pulse 1.2s infinite ease-in-out", animationDelay: "0ms" }} />
                <span className="w-[5px] h-[5px] bg-text-muted/60 rounded-full" style={{ animation: "dot-pulse 1.2s infinite ease-in-out", animationDelay: "160ms" }} />
                <span className="w-[5px] h-[5px] bg-text-muted/60 rounded-full" style={{ animation: "dot-pulse 1.2s infinite ease-in-out", animationDelay: "320ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 bg-surface-1 border-t border-border px-3 py-2.5 safe-area-bottom">
        {cooldown && (
          <p className="text-xs text-warning mb-1.5 animate-fade-in">
            Slow down — you can send another message in a moment.
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (isConfirmingEnd) {
                handleEndChat();
              } else {
                setIsConfirmingEnd(true);
              }
            }}
            className={`px-4 h-11 flex items-center justify-center rounded-full font-medium transition-all cursor-pointer flex-shrink-0 text-sm ${
              isConfirmingEnd 
                ? "bg-error text-white hover:bg-red-600" 
                : "bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text"
            }`}
            title="End Chat (Esc)"
          >
            {isConfirmingEnd ? "Confirm?" : "End"}
          </button>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              className="w-full px-4 py-2.5 bg-surface-2 border border-border rounded-full text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none transition-colors min-h-[44px] pr-14"
              autoComplete="off"
              autoFocus
            />
            {charCount > MAX_CHARS * 0.8 && (
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums ${charCount >= MAX_CHARS ? "text-error" : "text-text-muted"}`}>
                {MAX_CHARS - charCount}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || cooldown}
            className="w-11 h-11 flex items-center justify-center bg-primary text-white rounded-full hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>
        {/* Chat Banner Ad */}
        <div className="mt-2 flex justify-center border-t border-border/40 pt-2">
          <AdsterraAd type="banner-320x50" />
        </div>
      </div>

      {/* Report modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        roomId={roomId}
        onSubmitted={async (reason) => {
          setShowReportModal(false);
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
            end_reason: "report",
            ended_by: sessionId,
            ended_at: new Date().toISOString()
          }).eq("id", roomId);
          router.push(`/ended/${roomId}?reported=true`);
        }}
      />
    </div>
  );
}
