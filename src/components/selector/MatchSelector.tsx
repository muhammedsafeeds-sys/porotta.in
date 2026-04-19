"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import SegmentedSelector from "../ui/SegmentedSelector";
import TagMultiSelect from "../ui/TagMultiSelect";
import OnlineCountPill from "../ui/OnlineCountPill";
import Button from "../ui/Button";
import { getSession, updateSession } from "@/lib/session";
import { getTagLabels } from "@/lib/tags";
import { trackEntry } from "@/lib/analytics";

const GENDER_OPTIONS = [
  { value: "man", label: "Man" },
  { value: "woman", label: "Woman" },
  { value: "other", label: "Other" },
];

const DESIRED_OPTIONS = [
  { value: "man", label: "Man" },
  { value: "woman", label: "Woman" },
  { value: "anyone", label: "Anyone" },
];

interface MatchSelectorProps {
  prefillTag?: string;
}

export default function MatchSelector({ prefillTag }: MatchSelectorProps) {
  const router = useRouter();
  const [selfGender, setSelfGender] = useState<string | null>(null);
  const [desiredGender, setDesiredGender] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isStarting, setIsStarting] = useState(false);

  // Prefill from session or tag param
  useEffect(() => {
    const session = getSession();
    if (session.selfGender) setSelfGender(session.selfGender);
    if (session.desiredGender) setDesiredGender(session.desiredGender);
    if (session.nickname) setNickname(session.nickname);
    if (session.selectedTags.length > 0) {
      setSelectedTags(session.selectedTags);
    } else if (prefillTag) {
      const allTags = getTagLabels();
      const match = allTags.find(
        (t) => t.toLowerCase() === prefillTag.toLowerCase()
      );
      if (match) setSelectedTags([match]);
    }
  }, [prefillTag]);

  // Fetch real online count from Supabase
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { count } = await supabase.from("waiting_pool").select('*', { count: 'exact', head: true });
        setOnlineCount(count || 0);
      } catch (err) {
        console.error(err);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const canStart = selfGender !== null && desiredGender !== null;

  const handleStart = useCallback(() => {
    if (!canStart || isStarting) return;
    setIsStarting(true);

    // Save preferences to session
    const finalNickname = nickname.trim() || `Stranger_${Math.floor(Math.random() * 1000)}`;
    updateSession({
      selfGender,
      desiredGender,
      selectedTags,
      nickname: finalNickname,
    });

    trackEntry.selectorCompleted({
      selfGender,
      desiredGender,
      tags: selectedTags,
    });
    trackEntry.startChatClicked({
      selfGender,
      desiredGender,
      tags: selectedTags,
    });

    // Navigate to queue
    router.push("/queue");
  }, [canStart, isStarting, selfGender, desiredGender, selectedTags, router]);

  return (
    <div className="w-full max-w-md mx-auto bg-surface-1 border border-border rounded-[var(--radius-lg)] p-5 sm:p-6 shadow-lg animate-fade-in-up">
      <div className="space-y-5">
        {/* Nickname */}
        <div>
          <label htmlFor="nickname" className="block text-sm font-medium text-text mb-2">
            Your Nickname (Optional)
          </label>
          <input
            type="text"
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g. CoolGuy, Stranger..."
            className="w-full bg-surface-2 border border-border text-text text-sm rounded-[var(--radius-md)] px-4 py-3 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Your gender */}
        <SegmentedSelector
          id="self-gender-selector"
          label="Your gender"
          options={GENDER_OPTIONS}
          value={selfGender}
          onChange={setSelfGender}
        />

        {/* Talk to */}
        <SegmentedSelector
          id="desired-gender-selector"
          label="Talk to"
          options={DESIRED_OPTIONS}
          value={desiredGender}
          onChange={setDesiredGender}
        />

        {/* Tags */}
        <TagMultiSelect
          id="interest-tags"
          availableTags={getTagLabels()}
          selectedTags={selectedTags}
          onChange={setSelectedTags}
          maxTags={5}
        />

        {/* Online count */}
        <div className="flex justify-center pt-1">
          <OnlineCountPill count={onlineCount} />
        </div>

        {/* Privacy line */}
        <p className="text-center text-xs text-text-muted">
          No account needed. Messages auto-clear.
        </p>

        {/* Start CTA */}
        <Button
          id="start-chat-btn"
          fullWidth
          size="lg"
          disabled={!canStart}
          loading={isStarting}
          onClick={handleStart}
        >
          Start Chat
        </Button>
      </div>
    </div>
  );
}
