import React from "react";
import Link from "next/link";
import Wordmark from "./Wordmark";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-md border-b border-border">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" aria-label="porotta.in home">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-4 text-xs text-text-muted">
          <Link
            href="/safety"
            className="hover:text-text-secondary transition-colors"
          >
            Safety
          </Link>
          <Link
            href="/how-it-works"
            className="hover:text-text-secondary transition-colors"
          >
            How it works
          </Link>
        </nav>
      </div>
    </header>
  );
}
