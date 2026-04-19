import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-bg">
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-text-muted">
          © {new Date().getFullYear()} porotta.in — For adults only
        </p>
        <nav className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
          <Link href="/terms" className="hover:text-text-secondary transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-text-secondary transition-colors">
            Privacy
          </Link>
          <Link href="/safety" className="hover:text-text-secondary transition-colors">
            Safety
          </Link>
          <Link href="/how-it-works" className="hover:text-text-secondary transition-colors">
            How it works
          </Link>
        </nav>
      </div>
    </footer>
  );
}
