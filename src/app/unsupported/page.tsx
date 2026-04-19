import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browser Not Supported",
  description: "Your browser doesn't support the features needed for porotta.in.",
  robots: { index: false, follow: false },
};

export default function UnsupportedPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg px-4">
      <div className="text-center max-w-sm animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-5 bg-warning-muted rounded-full flex items-center justify-center">
          <span className="text-3xl">🌐</span>
        </div>
        <h1 className="text-xl font-semibold text-text mb-3">Browser not supported</h1>
        <p className="text-text-secondary text-sm leading-relaxed mb-6">
          porotta.in requires a modern browser with WebSocket support to deliver real-time chat. Your current browser doesn&apos;t meet these requirements.
        </p>
        <div className="space-y-3 text-sm">
          <p className="text-text font-medium">Try one of these browsers:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {["Chrome 90+", "Firefox 90+", "Safari 15+", "Edge 90+"].map((browser) => (
              <span
                key={browser}
                className="px-3 py-1.5 bg-surface-1 border border-border rounded-full text-text-secondary text-xs"
              >
                {browser}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
