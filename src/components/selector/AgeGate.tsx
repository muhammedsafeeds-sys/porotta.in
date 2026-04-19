"use client";

import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { updateSession, isAgeConfirmed } from "@/lib/session";
import { trackEntry } from "@/lib/analytics";

interface AgeGateProps {
  children: React.ReactNode;
}

export default function AgeGate({ children }: AgeGateProps) {
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    setConfirmed(isAgeConfirmed());
    if (!isAgeConfirmed()) {
      trackEntry.ageGateViewed();
    }
  }, []);

  // Still loading
  if (confirmed === null) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // User declined
  if (declined) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg px-4">
        <div className="text-center max-w-sm animate-fade-in">
          <h1 className="text-xl font-semibold text-text mb-3">
            You must be 18+ to use porotta.in
          </h1>
          <p className="text-text-secondary text-sm mb-6">
            This platform is for adults only. Please close this tab.
          </p>
          <p className="text-text-muted text-xs">
            If you believe this is an error, please revisit the site and confirm your age.
          </p>
        </div>
      </div>
    );
  }

  // Already confirmed
  if (confirmed) {
    return <>{children}</>;
  }

  // Show gate
  return (
    <>
      <Modal isOpen={true} onClose={() => {}} blocking={true}>
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 bg-primary-muted rounded-full flex items-center justify-center">
            <span className="text-2xl">🔞</span>
          </div>
          <h2 className="text-xl font-semibold text-text mb-2">
            Adults only
          </h2>
          <p className="text-text-secondary text-sm mb-6 leading-relaxed">
            porotta.in is an anonymous chat platform for adults aged 18 and
            above. By continuing, you confirm that you are at least 18 years
            old and agree to our{" "}
            <a href="/terms" className="text-primary hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </a>
            .
          </p>
          <div className="flex flex-col gap-3">
            <Button
              id="age-gate-confirm"
              fullWidth
              onClick={() => {
                updateSession({
                  ageConfirmed: true,
                  ageConfirmedAt: new Date().toISOString(),
                });
                setConfirmed(true);
                trackEntry.ageGateAccepted();
              }}
            >
              I am 18 or older — Enter
            </Button>
            <Button
              id="age-gate-decline"
              variant="ghost"
              fullWidth
              onClick={() => {
                setDeclined(true);
                trackEntry.ageGateRejected();
              }}
            >
              Leave
            </Button>
          </div>
        </div>
      </Modal>
      {/* Blurred background hint */}
      <div className="min-h-dvh bg-bg flex items-center justify-center blur-sm pointer-events-none select-none opacity-30">
        <p className="text-text text-lg">porotta.in</p>
      </div>
    </>
  );
}
