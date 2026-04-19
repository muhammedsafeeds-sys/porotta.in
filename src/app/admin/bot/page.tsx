"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

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
  const [schedulerActive, setSchedulerActive] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const schedulerRef = useRef<NodeJS.Timeout | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-99), `[${ts}] ${msg}`]);
  }, []);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const baseUrl = window.location.protocol + "//" + window.location.host;
      const res = await fetch(baseUrl + "/api/bot/status");
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error("Failed to fetch bot status", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Toggle bot system
  const handleToggle = async () => {
    if (!status) return;
    setToggling(true);
    try {
      const baseUrl = window.location.protocol + "//" + window.location.host;
      const res = await fetch(baseUrl + "/api/bot/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !status.enabled }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        addLog(`Bot system ${data.enabled ? "ENABLED" : "DISABLED"}`);
        if (!data.enabled && schedulerActive) {
          stopScheduler();
        }
        await fetchStatus();
      }
    } catch (err) {
      addLog(`Toggle failed: ${err}`);
    } finally {
      setToggling(false);
    }
  };

  // Scheduler — calls trigger + respond periodically
  const runCycle = useCallback(async () => {
    if (!schedulerRef.current) return; // Stop if cancelled
    
    const secret =
      (typeof window !== "undefined" && (window as any).__BOT_SECRET) ||
      "Safeed3030";

    try {
      const baseUrl = window.location.protocol + "//" + window.location.host;
      // Trigger: check for waiting users and inject bots
      const triggerRes = await fetch(baseUrl + "/api/bot/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const triggerData = await triggerRes.json();

      if (triggerData.triggered > 0) {
        addLog(
          `🤖 Triggered ${triggerData.triggered} bot(s), matched ${triggerData.matched}`
        );
      }

      // Respond: process bot rooms
      const respondRes = await fetch(baseUrl + "/api/bot/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const respondData = await respondRes.json();

      if (respondData.processed > 0) {
        const details = respondData.details || [];
        const interesting = details.filter(
          (d: any) =>
            d.action !== "waiting_for_human" &&
            d.action !== "waiting_to_respond" &&
            d.action !== "already_responded"
        );
        for (const d of interesting) {
          addLog(`💬 Room ${d.roomId.slice(0, 8)}: ${d.action}`);
        }
      }
    } catch (err) {
      addLog(`⚠️ Cycle error: ${err}`);
    }

    // Schedule next cycle ONLY if still active
    if (schedulerRef.current) {
      schedulerRef.current = setTimeout(runCycle, 4000); // 4s gap between finish and next start
    }
  }, [addLog]);

  const startScheduler = useCallback(() => {
    if (schedulerRef.current) return;
    setSchedulerActive(true);
    addLog("▶ Scheduler started (4s interval)");

    // Start recursive loop
    schedulerRef.current = setTimeout(runCycle, 100);
  }, [addLog, runCycle]);

  const stopScheduler = useCallback(() => {
    if (schedulerRef.current) {
      clearTimeout(schedulerRef.current);
      schedulerRef.current = null;
    }
    setSchedulerActive(false);
    addLog("⏸ Scheduler stopped");
  }, [addLog]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (schedulerRef.current) clearTimeout(schedulerRef.current);
    };
  }, []);

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
          Manage the AI chat bot system. Bots auto-join when real users wait
          too long.
        </p>
      </div>

      {/* ── Status Cards ────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatusCard
          label="System"
          value={status?.enabled ? "Enabled" : "Disabled"}
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

      {/* ── Controls ────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all cursor-pointer disabled:opacity-50 ${
            status?.enabled
              ? "bg-error text-white hover:brightness-90"
              : "bg-success text-white hover:brightness-90"
          }`}
        >
          {toggling
            ? "..."
            : status?.enabled
            ? "Disable Bot System"
            : "Enable Bot System"}
        </button>

        {status?.enabled && (
          <button
            onClick={schedulerActive ? stopScheduler : startScheduler}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all cursor-pointer ${
              schedulerActive
                ? "bg-warning text-black hover:brightness-90"
                : "bg-primary text-white hover:brightness-90"
            }`}
          >
            {schedulerActive ? "⏸ Stop Scheduler" : "▶ Start Scheduler"}
          </button>
        )}

        <button
          onClick={runCycle}
          disabled={!status?.enabled}
          className="px-5 py-2.5 bg-surface-2 text-text-secondary rounded-lg font-medium text-sm hover:bg-surface-3 transition-all cursor-pointer disabled:opacity-40"
        >
          Run Single Cycle
        </button>
      </div>

      {/* ── Active Bots Table ───────────────── */}
      {status?.bots && status.bots.length > 0 && (
        <div className="bg-surface-1 border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-text">
              Active Bot Sessions
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-2 text-text-muted font-medium">ID</th>
                  <th className="px-4 py-2 text-text-muted font-medium">
                    Name
                  </th>
                  <th className="px-4 py-2 text-text-muted font-medium">
                    Gender
                  </th>
                  <th className="px-4 py-2 text-text-muted font-medium">
                    Personality
                  </th>
                  <th className="px-4 py-2 text-text-muted font-medium">
                    City
                  </th>
                  <th className="px-4 py-2 text-text-muted font-medium">
                    Msgs
                  </th>
                  <th className="px-4 py-2 text-text-muted font-medium">
                    Mood
                  </th>
                  <th className="px-4 py-2 text-text-muted font-medium">
                    Phase
                  </th>
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

      {/* ── Logs ────────────────────────────── */}
      <div className="bg-surface-1 border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Activity Log</h2>
          <button
            onClick={() => setLogs([])}
            className="text-xs text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>
        <div className="h-64 overflow-y-auto px-4 py-2 font-mono text-xs space-y-0.5">
          {logs.length === 0 ? (
            <p className="text-text-muted py-4 text-center">
              No activity yet. Start the scheduler to begin.
            </p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="text-text-secondary leading-relaxed">
                {log}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* ── Setup Info ──────────────────────── */}
      <div className="bg-surface-1 border border-border rounded-xl p-4 text-sm">
        <h3 className="font-semibold text-text mb-2">⚙️ Setup Checklist</h3>
        <ul className="space-y-1 text-text-secondary">
          <li>
            1. Add <code className="text-primary">GEMINI_API_KEY</code> to{" "}
            <code>.env.local</code>
          </li>
          <li>
            2. Add <code className="text-primary">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            to <code>.env.local</code> (optional, uses anon key as fallback)
          </li>
          <li>
            3. Run migration{" "}
            <code className="text-primary">009_bot_config.sql</code> in
            Supabase SQL editor
          </li>
          <li>
            4. Enable the bot system using the toggle above
          </li>
          <li>5. Start the scheduler to begin bot operations</li>
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
