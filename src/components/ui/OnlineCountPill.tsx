"use client";

import React from "react";

interface OnlineCountPillProps {
  count: number;
  label?: string;
}

export default function OnlineCountPill({
  count,
  label = "online now",
}: OnlineCountPillProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-2 border border-border rounded-full text-sm">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-pulse-subtle" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
      </span>
      <span className="text-text font-medium tabular-nums">{count.toLocaleString()}</span>
      <span className="text-text-secondary">{label}</span>
    </div>
  );
}
