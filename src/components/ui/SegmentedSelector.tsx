"use client";

import React from "react";

interface ChipOption {
  value: string;
  label: string;
}

interface SegmentedSelectorProps {
  options: ChipOption[];
  value: string | null;
  onChange: (value: string) => void;
  label?: string;
  id: string;
}

export default function SegmentedSelector({
  options,
  value,
  onChange,
  label,
  id,
}: SegmentedSelectorProps) {
  return (
    <div role="radiogroup" aria-label={label} id={id}>
      {label && (
        <span className="block text-sm text-text-secondary mb-2 font-medium">
          {label}
        </span>
      )}
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(opt.value)}
              className={`
                px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-medium
                min-h-[44px] min-w-[44px]
                transition-all duration-150 ease-out
                cursor-pointer select-none
                ${
                  isSelected
                    ? "bg-primary text-white shadow-[0_2px_8px_rgba(232,101,10,0.3)]"
                    : "bg-surface-2 text-text-secondary hover:text-text hover:bg-surface-1 border border-border"
                }
              `}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
