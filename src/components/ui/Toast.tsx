"use client";

import React, { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "info" | "success" | "warning" | "error";
  duration?: number;
  onClose: () => void;
}

const typeStyles: Record<string, string> = {
  info: "bg-surface-1 border-border text-text",
  success: "bg-success-muted border-success/30 text-success",
  warning: "bg-warning-muted border-warning/30 text-warning",
  error: "bg-error-muted border-error/30 text-error",
};

export default function Toast({
  message,
  type = "info",
  duration = 4000,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        px-4 py-3 rounded-[var(--radius-md)] border
        text-sm font-medium shadow-lg
        transition-all duration-300 ease-out
        ${typeStyles[type]}
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
    >
      {message}
    </div>
  );
}
