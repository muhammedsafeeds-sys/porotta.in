import type { Metadata } from "next";
import AppHeader from "@/components/layout/AppHeader";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How porotta.in handles your data. No accounts, no tracking, messages auto-delete.",
};

export default function PrivacyPage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-10 md:py-16">
        <article>
          <h1 className="text-2xl font-bold text-text mb-6">Privacy Policy</h1>
          <p className="text-text-secondary text-sm mb-2">Last updated: April 2026</p>

          <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-text mb-2">What we collect</h2>
              <ul className="list-disc list-inside space-y-1.5">
                <li>Anonymous session identifier (random, not tied to any account)</li>
                <li>Gender selection and interest tags (for matching only)</li>
                <li>IP address hash (for abuse prevention — raw IP is never stored)</li>
                <li>Chat messages (auto-deleted after 24 hours)</li>
                <li>Age confirmation status</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text mb-2">What we do NOT collect</h2>
              <ul className="list-disc list-inside space-y-1.5">
                <li>Your name, email, phone number, or any personal identity</li>
                <li>Location data beyond country-level inference</li>
                <li>Cross-session profile or browsing history</li>
                <li>Device fingerprints for tracking</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text mb-2">Message retention</h2>
              <p>All chat messages are automatically deleted within 24 hours of being sent. If a report is filed during a session, a compliance-safe evidence snapshot is preserved within the moderation record only. This snapshot is reviewed by authorized moderators and is never made public.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text mb-2">Cookies and storage</h2>
              <p>We use a single session cookie (httpOnly, SameSite=Strict) to maintain your anonymous session state. Browser session storage is used to remember your gender and tag preferences within a single browsing session for convenience. No third-party tracking cookies are used by the platform itself.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text mb-2">Advertising</h2>
              <p>porotta.in displays non-intrusive banner advertisements. Our ad partners may use their own cookies as permitted by their policies. We do not share any user data with ad partners beyond what is standard in programmatic advertising.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text mb-2">Data security</h2>
              <p>All data is transmitted over encrypted connections (TLS). IP addresses are hashed with a server-side salt before storage. Database access is restricted through row-level security policies. Admin access requires multi-factor authentication.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text mb-2">Your rights</h2>
              <p>Since we do not collect personal information or maintain user accounts, there is no profile data to request or delete. Your session data expires automatically. If you have concerns, contact us at <a href="mailto:privacy@porotta.in" className="text-primary hover:underline">privacy@porotta.in</a>.</p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
