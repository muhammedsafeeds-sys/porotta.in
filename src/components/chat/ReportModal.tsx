"use client";

import React, { useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { trackModeration } from "@/lib/analytics";

const REPORT_REASONS = [
  { id: "harassment", label: "Harassment / Abuse", icon: "⚠️" },
  { id: "sexual", label: "Sexual content", icon: "🚫" },
  { id: "hate", label: "Hate / Discrimination", icon: "🛑" },
  { id: "spam", label: "Spam / Scam", icon: "📧" },
  { id: "minor", label: "Minor safety concern", icon: "👶" },
  { id: "other", label: "Other", icon: "💬" },
];

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  onSubmitted: (reason: string) => void;
}

export default function ReportModal({ isOpen, onClose, roomId, onSubmitted }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setIsSubmitting(true);
    trackModeration.reportOpened();
    trackModeration.reportSubmitted(selectedReason);
    await new Promise((r) => setTimeout(r, 800));
    setIsSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      onSubmitted(selectedReason);
      setSelectedReason(null);
      setSubmitted(false);
    }, 1500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={submitted ? undefined : "Report this user"}>
      {submitted ? (
        <div className="text-center py-4 animate-fade-in">
          <div className="w-14 h-14 mx-auto mb-3 bg-success-muted rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-text font-medium mb-1">Report submitted</p>
          <p className="text-text-secondary text-sm">Thank you. You&apos;re being safely removed from this chat.</p>
        </div>
      ) : (
        <div>
          <p className="text-text-secondary text-sm mb-4">Select the reason for your report. You&apos;ll be safely removed from this chat.</p>
          <div className="space-y-2 mb-5">
            {REPORT_REASONS.map((reason) => (
              <button key={reason.id} onClick={() => setSelectedReason(reason.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] text-left text-sm transition-all cursor-pointer min-h-[44px] ${
                  selectedReason === reason.id
                    ? "bg-error-muted border border-error/40 text-text"
                    : "bg-surface-2 border border-border text-text-secondary hover:text-text hover:bg-surface-1"
                }`}>
                <span>{reason.icon}</span>
                <span>{reason.label}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={onClose}>Cancel</Button>
            <Button variant="danger" fullWidth disabled={!selectedReason} loading={isSubmitting} onClick={handleSubmit}>Submit Report</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
