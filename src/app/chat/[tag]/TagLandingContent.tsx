"use client";

import React from "react";
import AgeGate from "@/components/selector/AgeGate";
import MatchSelector from "@/components/selector/MatchSelector";
import OnlineCountPill from "@/components/ui/OnlineCountPill";

interface TagLandingContentProps {
  slug: string;
  label: string;
}

export default function TagLandingContent({ slug, label }: TagLandingContentProps) {
  return (
    <AgeGate>
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-bold text-text mb-3 tracking-tight">
            Chat about {label}
          </h1>
          <p className="text-text-secondary text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Find someone who wants to talk about {label.toLowerCase()} — anonymously, right now.
          </p>
          <div className="flex justify-center mt-4">
            <OnlineCountPill count={85 + Math.floor(Math.random() * 60)} label={`talking about ${label.toLowerCase()}`} />
          </div>
        </div>
        <MatchSelector prefillTag={label} />
      </div>
    </AgeGate>
  );
}
