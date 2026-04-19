import type { Metadata } from "next";
import AppHeader from "@/components/layout/AppHeader";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Safety",
  description: "How porotta.in keeps you safe. Reporting, moderation, data practices, and what to expect.",
};

export default function SafetyPage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-10">
        <article>
          <h1 className="text-2xl font-bold text-text mb-3">Your safety matters</h1>
          <p className="text-text-secondary text-sm mb-8 leading-relaxed">
            porotta.in is built with safety as a core principle. Here&apos;s how we protect you and what you should know.
          </p>

          <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-text mb-2">How reporting works</h2>
              <p className="mb-3">The report button is always visible during every chat — it&apos;s never hidden behind a menu. If someone makes you uncomfortable:</p>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>Tap the red <strong className="text-error">Report</strong> button in the chat header</li>
                <li>Select the reason that best describes the issue</li>
                <li>Tap Submit — you&apos;ll be safely removed from the chat immediately</li>
              </ol>
              <p className="mt-3">You can also end any chat instantly by tapping <strong className="text-text">End Chat</strong>.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text mb-2">What happens after a report</h2>
              <ul className="list-disc list-inside space-y-1.5">
                <li>Your report is logged with relevant session evidence</li>
                <li>Our moderation team reviews the case</li>
                <li>If a violation is confirmed, the reported user receives a warning, temporary ban, or permanent ban</li>
                <li>Repeat offenders face escalating consequences</li>
                <li>All moderation actions are tracked in an audit log</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text mb-2">What data is stored</h2>
              <ul className="list-disc list-inside space-y-1.5">
                <li>Chat messages are auto-deleted within 24 hours</li>
                <li>If a report is filed, an evidence snapshot is preserved for moderation review only</li>
                <li>We never store your real name, email, phone number, or identity</li>
                <li>IP addresses are hashed — we never store raw IPs</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text mb-2">What content is prohibited</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                {[
                  "Harassment or abuse",
                  "Sexual or explicit content",
                  "Hate speech or discrimination",
                  "Spam or scam messages",
                  "Content involving minors",
                  "Threats or violent content",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 px-3 py-2 bg-error-muted rounded-[var(--radius-sm)]">
                    <span className="text-error">✕</span>
                    <span className="text-text text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text mb-2">How bans work</h2>
              <p>Bans are applied based on the severity and frequency of violations. They range from short cooldowns (30 minutes) to permanent bans. Ban checks happen before every chat session — banned users cannot enter the matching queue.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text mb-2">For parents and guardians</h2>
              <p>porotta.in is strictly for adults aged 18 and above. An age gate is presented to every new visitor. If you believe a minor is using this platform, please contact us at safety@porotta.in and we will take immediate action.</p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
