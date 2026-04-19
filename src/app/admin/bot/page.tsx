"use client";

import React, { useState, useEffect, useCallback } from "react";

interface BotInfo {
  id: string;
  name: string;
  gender: string;
  personality: string;
  city: string;
  messageCount: number;
  mood: string;
  exitPhase: string;
  lastActive: string;
}

interface BotStatus {
  enabled: boolean;
  activeBots: number;
  activeRooms: number;
  queueCount: number;
  bots: BotInfo[];
}

export default function AdminBotPage() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/bot/status?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) {
        setError(`Status API returned ${res.status}`);
        return;
      }
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setStatus(data);
        setError(null);
      }
    } catch (err) {
      setError(`Failed to fetch: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Toggle bot system — THE ONLY BUTTON NEEDED
  const handleToggle = async () => {
    if (!status) return;
    setToggling(true);
    setError(null);
    try {
      const newState = !status.enabled;
      const res = await fetch("/api/bot/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newState }),
      });
      const data = await res.json();
      if (data.error) {
        setError(`Toggle failed: ${data.error}`);
      } else {
        // Immediately update UI
        setStatus((prev) => prev ? { ...prev, enabled: newState } : prev);
        // Then refresh from server
        await fetchStatus();
      }
    } catch (err) {
      setError(`Toggle request failed: ${err}`);
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-text mb-1">🤖 Bot Control</h1>
        <p className="text-sm text-text-muted">
          Enable/disable the AI bot system. When enabled, bots automatically
          join when users wait 5+ seconds. No scheduler needed — it runs itself.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-sm text-error">
          ⚠️ {error}
        </div>
      )}

      {/* ── Status Cards ────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatusCard
          label="System"
          value={status?.enabled ? "ON" : "OFF"}
          color={status?.enabled ? "text-success" : "text-error"}
        />
        <StatusCard
          label="Active Bots"
          value={String(status?.activeBots || 0)}
          color="text-primary"
        />
        <StatusCard
          label="Bot Rooms"
          value={String(status?.activeRooms || 0)}
          color="text-warning"
        />
        <StatusCard
          label="Queue"
          value={String(status?.queueCount || 0)}
          color="text-text-secondary"
        />
      </div>

      {/* ── Toggle Button ────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer disabled:opacity-50 ${
            status?.enabled
              ? "bg-error text-white hover:brightness-90"
              : "bg-success text-white hover:brightness-90"
          }`}
        >
          {toggling
            ? "Updating..."
            : status?.enabled
            ? "🔴 Disable Bot System"
            : "🟢 Enable Bot System"}
        </button>
      </div>

      {/* How it works */}
      <div className="bg-surface-1 border border-border rounded-xl p-4 text-sm">
        <h3 className="font-semibold text-text mb-2">How it works</h3>
        <ul className="space-y-1 text-text-secondary list-disc pl-4">
          <li>When <strong className="text-success">Enabled</strong>, bots auto-join users who wait 5+ seconds</li>
          <li>~10% of users get matched with a bot instantly for a natural mix</li>
          <li>Max 15 concurrent bots to protect your free tier</li>
          <li>Bot sessions auto-cleanup after 2 minutes of inactivity</li>
          <li>Online count is inflated by 100-150 when bots are on</li>
          <li>Inappropriate messages trigger instant disconnect</li>
          <li>When <strong className="text-error">Disabled</strong>, all active bots are killed immediately</li>
        </ul>
      </div>

      {/* ── Active Bots Table ───────────────── */}
      {status?.bots && status.bots.length > 0 && (
        <div className="bg-surface-1 border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-text">
              Active Bot Sessions ({status.bots.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-2 text-text-muted font-medium">ID</th>
                  <th className="px-4 py-2 text-text-muted font-medium">Name</th>
                  <th className="px-4 py-2 text-text-muted font-medium">Gender</th>
                  <th className="px-4 py-2 text-text-muted font-medium">Personality</th>
                  <th className="px-4 py-2 text-text-muted font-medium">City</th>
                  <th className="px-4 py-2 text-text-muted font-medium">Msgs</th>
                  <th className="px-4 py-2 text-text-muted font-medium">Mood</th>
                  <th className="px-4 py-2 text-text-muted font-medium">Phase</th>
                </tr>
              </thead>
              <tbody>
                {status.bots.map((bot) => (
                  <tr
                    key={bot.id}
                    className="border-b border-border/50 hover:bg-surface-2/50 transition-colors"
                  >
                    <td className="px-4 py-2 text-text-muted font-mono text-xs">
                      {bot.id}
                    </td>
                    <td className="px-4 py-2 text-text font-medium">
                      {bot.name}
                    </td>
                    <td className="px-4 py-2 text-text-secondary capitalize">
                      {bot.gender}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          bot.personality === "sarcastic"
                            ? "bg-purple-500/20 text-purple-300"
                            : bot.personality === "curious"
                            ? "bg-blue-500/20 text-blue-300"
                            : bot.personality === "talkative"
                            ? "bg-green-500/20 text-green-300"
                            : "bg-yellow-500/20 text-yellow-300"
                        }`}
                      >
                        {bot.personality}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-text-secondary">
                      {bot.city}
                    </td>
                    <td className="px-4 py-2 text-text tabular-nums">
                      {bot.messageCount}
                    </td>
                    <td className="px-4 py-2 text-text-secondary capitalize">
                      {bot.mood}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs ${
                          bot.exitPhase === "ended"
                            ? "text-error"
                            : bot.exitPhase === "farewell"
                            ? "text-warning"
                            : bot.exitPhase === "hinting"
                            ? "text-yellow-400"
                            : "text-success"
                        }`}
                      >
                        {bot.exitPhase}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Setup Info ──────────────────────── */}
      <div className="bg-surface-1 border border-border rounded-xl p-4 text-sm">
        <h3 className="font-semibold text-text mb-2">⚙️ Setup Checklist</h3>
        <ul className="space-y-1 text-text-secondary">
          <li>
            1. Add <code className="text-primary">GEMINI_API_KEY</code> to Vercel Environment Variables
          </li>
          <li>
            2. Add <code className="text-primary">SUPABASE_SERVICE_ROLE_KEY</code> to Vercel Environment Variables
          </li>
          <li>
            3. Run migration{" "}
            <code className="text-primary">011_fix_system_config_rls.sql</code> in
            Supabase SQL editor
          </li>
          <li>
            4. Click the Enable button above — that&apos;s it!
          </li>
        </ul>
      </div>
    </div>
  );
}

function StatusCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-surface-1 border border-border rounded-xl px-4 py-3">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
