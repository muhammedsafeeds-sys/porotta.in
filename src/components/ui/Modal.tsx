"use client";

import React, { useEffect, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  blocking?: boolean; // If true, no close button / backdrop click
}

export default function Modal({
  isOpen,
  onClose,
  children,
  title,
  blocking = false,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      if (blocking) {
        e.preventDefault();
      }
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [blocking]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => {
        if (!blocking && e.target === dialogRef.current) onClose();
      }}
      className="fixed inset-0 z-50 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm p-0 m-0 w-full h-full max-w-full max-h-full flex items-center justify-center open:flex"
    >
      <div
        className="bg-surface-1 border border-border rounded-[var(--radius-lg)] shadow-2xl w-full max-w-md mx-4 p-6 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text">{title}</h2>
            {!blocking && (
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </dialog>
  );
}
