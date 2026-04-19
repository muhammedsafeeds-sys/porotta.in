"use client";

import React, { useState, useRef, useEffect } from "react";

interface TagMultiSelectProps {
  availableTags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  id: string;
}

export default function TagMultiSelect({
  availableTags,
  selectedTags,
  onChange,
  maxTags = 5,
  id,
}: TagMultiSelectProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = availableTags.filter(
    (t) =>
      !selectedTags.includes(t) &&
      t.toLowerCase().includes(query.toLowerCase())
  );

  const addTag = (tag: string) => {
    if (selectedTags.length < maxTags && !selectedTags.includes(tag)) {
      onChange([...selectedTags, tag]);
    }
    setQuery("");
  };

  const removeTag = (tag: string) => {
    onChange(selectedTags.filter((t) => t !== tag));
  };

  return (
    <div ref={wrapperRef} className="relative" id={id}>
      <label className="block text-sm text-text-secondary mb-2 font-medium">
        Interest tags{" "}
        <span className="text-text-muted font-normal">(optional)</span>
      </label>

      {/* Selected chips */}
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[8px]">
        {selectedTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1 bg-primary-muted text-primary text-sm rounded-full font-medium"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
              className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full hover:bg-primary/20 text-primary cursor-pointer"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Search input */}
      {selectedTags.length < maxTags && (
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={
            selectedTags.length === 0
              ? "Search topics like music, movies, cricket…"
              : "Add more…"
          }
          className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-[var(--radius-md)] text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none transition-colors min-h-[44px]"
          aria-label="Search interest tags"
        />
      )}

      {/* Dropdown */}
      {isOpen && (filtered.length > 0 || query.trim().length > 0) && (
        <div className="absolute z-20 w-full mt-1 bg-surface-1 border border-border rounded-[var(--radius-md)] shadow-lg max-h-48 overflow-y-auto animate-fade-in">
          {filtered.slice(0, 12).map((tag) => (
            <button
              key={tag}
              onClick={() => addTag(tag)}
              className="w-full text-left px-3 py-2.5 text-sm text-text-secondary hover:text-text hover:bg-surface-2 transition-colors cursor-pointer min-h-[44px]"
            >
              {tag}
            </button>
          ))}
          {query.trim().length > 0 &&
           !availableTags.some((t) => t.toLowerCase() === query.trim().toLowerCase()) &&
           !selectedTags.some((t) => t.toLowerCase() === query.trim().toLowerCase()) && (
            <button
              onClick={() => addTag(query.trim())}
              className="w-full text-left px-3 py-2.5 text-sm text-primary hover:bg-surface-2 transition-colors cursor-pointer min-h-[44px] font-medium border-t border-border"
            >
              + Add "{query.trim()}"
            </button>
          )}
        </div>
      )}

      {selectedTags.length > 0 && (
        <p className="text-xs text-text-muted mt-1">
          {selectedTags.length}/{maxTags} tags selected
        </p>
      )}
    </div>
  );
}
