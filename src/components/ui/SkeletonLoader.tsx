import React from "react";

interface SkeletonLoaderProps {
  lines?: number;
  className?: string;
}

export default function SkeletonLoader({
  lines = 3,
  className = "",
}: SkeletonLoaderProps) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-[var(--radius-sm)] animate-shimmer"
          style={{ width: `${80 - i * 15}%` }}
        />
      ))}
    </div>
  );
}
