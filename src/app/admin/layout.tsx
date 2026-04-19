"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Wordmark from "@/components/layout/Wordmark";

const NAV_ITEMS = [
  { href: "/admin/live", label: "Live Ops", icon: "🔴" },
  { href: "/admin/bot", label: "Bot Control", icon: "🤖" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh bg-bg overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-56 bg-surface-1 border-r border-border flex flex-col
        transition-transform duration-200 ease-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link href="/admin/live"><Wordmark className="h-5" /></Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-text-muted hover:text-text cursor-pointer">✕</button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                pathname === item.href
                  ? "bg-primary-muted text-primary font-medium"
                  : "text-text-secondary hover:text-text hover:bg-surface-2"
              }`}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <Link href="/" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
            ← Back to site
          </Link>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="sticky top-0 z-20 bg-bg border-b border-border px-4 h-12 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-text-muted hover:text-text cursor-pointer" aria-label="Open menu">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-medium text-text">Admin Panel</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
