"use client";

import React from "react";
import AgeGate from "@/components/selector/AgeGate";
import MatchSelector from "@/components/selector/MatchSelector";

export default function HomeContent() {
  return (
    <AgeGate>
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Hero zone */}
        <div className="text-center mb-8 sm:mb-10 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-bold text-text mb-3 tracking-tight">
            Talk to real people. Anonymously.
          </h1>
          <p className="text-text-secondary text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Choose who you want to talk to. No account needed.
            <br className="hidden sm:block" />
            Fast, private, safe — every session.
          </p>
        </div>

        {/* Selector card */}
        <MatchSelector />

        {/* Trust row */}
        <div className="flex flex-wrap justify-center gap-2 mt-8 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          {[
            { icon: "🔞", text: "Adults only" },
            { icon: "🔒", text: "Private sessions" },
            { icon: "🚩", text: "Visible reporting" },
            { icon: "🕐", text: "Messages auto-cleared" },
          ].map((chip) => (
            <span
              key={chip.text}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-1 border border-border rounded-full text-xs text-text-secondary"
            >
              <span>{chip.icon}</span>
              {chip.text}
            </span>
          ))}
        </div>

        {/* Popular topics */}
        <div className="mt-10 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <h2 className="text-sm font-medium text-text-muted text-center mb-3">
            Popular topics now
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {["Late Night Talks", "Cricket", "Bollywood", "Relationships", "Memes", "College Life", "Gaming", "Deep Talk"].map(
              (tag) => (
                <a
                  key={tag}
                  href={`/chat/${tag.toLowerCase().replace(/\s+/g, "-")}`}
                  className="px-3 py-1.5 bg-surface-2 border border-border rounded-full text-xs text-text-secondary hover:text-text hover:border-primary/40 transition-all"
                >
                  {tag}
                </a>
              )
            )}
          </div>
        </div>
      </div>
    </AgeGate>
  );
}
