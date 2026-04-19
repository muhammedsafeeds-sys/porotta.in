import type { Metadata } from "next";
import AppHeader from "@/components/layout/AppHeader";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using porotta.in anonymous chat platform.",
};

export default function TermsPage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-10">
        <article>
          <h1 className="text-2xl font-bold text-text mb-6">Terms of Service</h1>
          <p className="text-text-secondary text-sm mb-2">Last updated: April 2026</p>

          <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-text mb-2">Eligibility</h2>
              <p>You must be at least 18 years of age to use porotta.in. By accessing or using the platform, you confirm that you are an adult. If you are under 18, you must leave this site immediately. We reserve the right to terminate access for any user suspected of being a minor.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text mb-2">Anonymous use</h2>
              <p>porotta.in does not require registration or account creation. You are assigned a temporary anonymous session. You are solely responsible for your conduct during each session.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text mb-2">Prohibited conduct</h2>
              <ul className="list-disc list-inside space-y-1.5">
                <li>Harassment, bullying, threats, or abusive language</li>
                <li>Sharing sexual, explicit, or pornographic content</li>
                <li>Hate speech, discrimination, or content promoting violence</li>
                <li>Spam, scam, phishing, or commercial solicitation</li>
                <li>Sharing personal information of others without consent</li>
                <li>Impersonating another person or misrepresenting your identity</li>
                <li>Any activity involving or targeting minors</li>
                <li>Attempting to circumvent bans, rate limits, or platform security</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text mb-2">Reporting and moderation</h2>
              <p>Users can report inappropriate behavior at any time during a chat session. Reports are reviewed by our moderation team. Violations may result in warnings, temporary bans, or permanent bans. All moderation decisions are logged and auditable.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text mb-2">Content and messages</h2>
              <p>All messages are ephemeral and auto-deleted within 24 hours. porotta.in is a plain-text-only platform — no images, files, or media can be shared. URLs sent in messages may be rendered inert for safety.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text mb-2">Disclaimers</h2>
              <p>porotta.in is provided &ldquo;as is&rdquo; without warranties of any kind. We do not guarantee the accuracy of gender declarations by users. We are not responsible for content exchanged between users. We reserve the right to modify, suspend, or discontinue the service at any time.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text mb-2">Governing law</h2>
              <p>These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in India.</p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
