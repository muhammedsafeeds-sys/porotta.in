import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Access Restricted",
  description: "Your access to porotta.in has been restricted.",
  robots: { index: false, follow: false },
};

export default function BannedPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg px-4">
      <div className="text-center max-w-sm animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-5 bg-error-muted rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-text mb-3">Access restricted</h1>
        <p className="text-text-secondary text-sm leading-relaxed mb-6">
          Your access to porotta.in has been temporarily or permanently restricted due to a violation of our community guidelines.
        </p>
        <p className="text-text-muted text-xs leading-relaxed">
          If you believe this is a mistake, you can reach out to us at support@porotta.in. Please include the approximate date and time you were using the platform.
        </p>
      </div>
    </div>
  );
}
