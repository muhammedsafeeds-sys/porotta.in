import type { Metadata } from "next";
import AppHeader from "@/components/layout/AppHeader";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "How It Works",
  description: "Learn how porotta.in anonymous chat works. Choose, match, chat — in under 30 seconds.",
};

export default function HowItWorksPage() {
  const steps = [
    {
      number: "1",
      title: "Choose who you want to talk to",
      description: "Select your gender and who you'd like to chat with. Add optional interest tags like cricket, movies, or late-night talks to find a better match.",
    },
    {
      number: "2",
      title: "Get matched instantly",
      description: "Our matching engine prioritizes gender-directed matches first, then finds the best tag overlap. Most matches happen in under 30 seconds.",
    },
    {
      number: "3",
      title: "Chat anonymously",
      description: "You're connected to a real person in a private, one-to-one text chat. No names, no profiles, no history. Just a conversation.",
    },
    {
      number: "4",
      title: "End anytime, start fresh",
      description: "When you're done, end the chat and start a new one immediately. Your messages auto-clear within 24 hours. Every session is a fresh start.",
    },
  ];

  return (
    <>
      <AppHeader />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-text mb-3">How porotta.in works</h1>
        <p className="text-text-secondary text-sm mb-10 leading-relaxed">
          Anonymous one-to-one text chat, built for real conversations. No account, no downloads, no hassle.
        </p>

        <div className="space-y-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex gap-4 p-5 bg-surface-1 border border-border rounded-[var(--radius-md)]"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-primary-muted text-primary rounded-full flex items-center justify-center font-bold text-lg">
                {step.number}
              </div>
              <div>
                <h2 className="text-base font-semibold text-text mb-1">{step.title}</h2>
                <p className="text-sm text-text-secondary leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 p-5 bg-surface-1 border border-border rounded-[var(--radius-md)]">
          <h2 className="text-base font-semibold text-text mb-3">What makes porotta.in different</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              { label: "Gender-directed matching", desc: "Not random chaos — intentional connections" },
              { label: "No account needed", desc: "Start chatting in seconds, not minutes" },
              { label: "Messages auto-clear", desc: "Nothing lingers — every session is private" },
              { label: "Always-visible reporting", desc: "Safety isn't hidden behind menus" },
              { label: "Mobile-first design", desc: "Built for how Indians actually use the web" },
              { label: "Adults only", desc: "Age-gated for responsible use" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <div>
                  <span className="text-text font-medium">{item.label}</span>
                  <span className="text-text-muted block text-xs">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
