"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLivePage() {
  const [stats, setStats] = useState({
    queueMen: 0,
    queueWomen: 0,
    queueAnyone: 0,
    activeRooms: 0,
    totalChatsToday: 0,
    totalChatsAllTime: 0,
    disconnects: 0,
    avgDurationMin: 0,
  });
  const [reports, setReports] = useState<any[]>([]);
  const [recentRooms, setRecentRooms] = useState<any[]>([]);
  const [feedbackStats, setFeedbackStats] = useState({ good: 0, bad: 0, wait: 0 });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchLiveStats = async () => {
    try {
      const supabase = createClient();
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // 1. Queue stats
      const { data: poolData } = await supabase.from("waiting_pool").select("desired_gender");
      const queueMen = poolData?.filter(p => p.desired_gender === "man").length || 0;
      const queueWomen = poolData?.filter(p => p.desired_gender === "woman").length || 0;
      const queueAnyone = poolData?.filter(p => p.desired_gender === "anyone").length || 0;

      // 2. Active rooms
      const { count: activeRooms } = await supabase.from("chat_rooms").select("*", { count: "exact", head: true }).eq("status", "active");

      // 3. Total chats today
      const { count: todayChats } = await supabase.from("chat_rooms").select("*", { count: "exact", head: true }).gte("created_at", todayStart);

      // 4. Total chats all time
      const { count: allTimeChats } = await supabase.from("chat_rooms").select("*", { count: "exact", head: true });

      // 5. Disconnects today
      const { count: disconnectsToday } = await supabase
        .from("chat_rooms")
        .select("*", { count: "exact", head: true })
        .eq("end_reason", "disconnect")
        .gte("created_at", todayStart);

      // 6. Recent ended rooms for duration calc
      const { data: endedRooms } = await supabase
        .from("chat_rooms")
        .select("created_at, ended_at")
        .neq("status", "active")
        .not("ended_at", "is", null)
        .gte("created_at", yesterday)
        .limit(100);

      let avgDuration = 0;
      if (endedRooms && endedRooms.length > 0) {
        const totalMinutes = endedRooms.reduce((sum, r) => {
          const start = new Date(r.created_at).getTime();
          const end = new Date(r.ended_at).getTime();
          return sum + (end - start) / 60000;
        }, 0);
        avgDuration = Math.round(totalMinutes / endedRooms.length);
      }

      setStats({
        queueMen,
        queueWomen,
        queueAnyone,
        activeRooms: activeRooms || 0,
        totalChatsToday: todayChats || 0,
        totalChatsAllTime: allTimeChats || 0,
        disconnects: disconnectsToday || 0,
        avgDurationMin: avgDuration,
      });

      // 7. Pending reports
      const { data: recentReports } = await supabase
        .from("reports")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20);
      if (recentReports) setReports(recentReports);

      // 8. Recent rooms
      const { data: rooms } = await supabase
        .from("chat_rooms")
        .select("id, session_a, session_b, status, end_reason, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (rooms) setRecentRooms(rooms);

      // 9. Feedback stats (Last 24h)
      const { data: feedbackData } = await supabase
        .from("chat_rooms")
        .select("feedback_a, feedback_b")
        .gt("created_at", yesterday);
      
      if (feedbackData) {
        const allFeedback = feedbackData.flatMap(r => [r.feedback_a, r.feedback_b]).filter(Boolean);
        setFeedbackStats({
          good: allFeedback.filter((f: string) => f === "Good chat").length,
          bad: allFeedback.filter((f: string) => f === "Couldn't connect").length,
          wait: allFeedback.filter((f: string) => f === "Wait was long").length
        });
      }

      setLastRefresh(new Date());
    } catch (err) {
      console.error("Live stats fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDismissReport = async (reportId: string) => {
    const supabase = createClient();
    await supabase.from("reports").update({ status: "dismissed" }).eq("id", reportId);
    fetchLiveStats();
  };

  const handleActionReport = async (reportId: string) => {
    const supabase = createClient();
    await supabase.from("reports").update({ status: "actioned" }).eq("id", reportId);
    fetchLiveStats();
  };

  const formatTimeAgo = (isoString: string) => {
    const diff = new Date().getTime() - new Date(isoString).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "Just now";
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const totalOnline = stats.queueMen + stats.queueWomen + stats.queueAnyone + (stats.activeRooms * 2);

  const statusColor = (status: string) => {
    if (status === "active") return "text-success";
    if (status === "reported") return "text-error";
    return "text-text-muted";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text mb-1">Admin Dashboard</h1>
          <p className="text-xs text-text-muted">
            Last updated: {lastRefresh.toLocaleTimeString()} (auto-refreshes every 5s)
          </p>
        </div>
        <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl text-center">
          <p className="text-[10px] text-primary uppercase tracking-wider font-bold">Total Online</p>
          <p className="text-xl font-bold text-primary tabular-nums">{totalOnline}</p>
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Active Rooms", value: stats.activeRooms, sub: "right now", color: "text-success" },
          { label: "Chats Today", value: stats.totalChatsToday, sub: `${stats.totalChatsAllTime} all time`, color: "text-primary" },
          { label: "Avg Duration", value: `${stats.avgDurationMin}m`, sub: "last 24h", color: "text-text" },
          { label: "Disconnects", value: stats.disconnects, sub: "today", color: stats.disconnects > 10 ? "text-error" : "text-warning" },
        ].map((s) => (
          <div key={s.label} className="bg-surface-1 border border-border rounded-[var(--radius-md)] p-4">
            <p className="text-xs text-text-muted mb-1">{s.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${loading ? "opacity-50" : ""} ${s.color}`}>
              {s.value}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Queue breakdown */}
      <div className="bg-surface-1 border border-border rounded-[var(--radius-md)] p-4">
        <p className="text-sm font-medium text-text mb-3">Queue Breakdown</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Seeking Men", value: stats.queueMen },
            { label: "Seeking Women", value: stats.queueWomen },
            { label: "Seeking Anyone", value: stats.queueAnyone },
          ].map((q) => (
            <div key={q.label} className="text-center p-3 bg-surface-2 rounded-[var(--radius-sm)]">
              <p className="text-lg font-bold text-primary tabular-nums">{q.value}</p>
              <p className="text-[11px] text-text-muted">{q.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending reports */}
        <div className="bg-surface-1 border border-border rounded-[var(--radius-md)] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-text">Pending Reports</p>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${reports.length > 0 ? "bg-error-muted text-error" : "bg-success-muted text-success"}`}>
              {reports.length} pending
            </span>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {reports.length === 0 ? (
              <p className="text-sm text-text-muted py-4 text-center">No pending reports. All clear.</p>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="flex flex-col gap-2 p-3 bg-surface-2 rounded-[var(--radius-sm)] text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.severity_score >= 4 ? "bg-error" : r.severity_score >= 2 ? "bg-warning" : "bg-text-muted"}`} />
                      <span className="text-text capitalize font-medium">{r.reason}</span>
                    </div>
                    <span className="text-text-muted text-[11px]">{formatTimeAgo(r.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted font-mono truncate">Room: {r.room_id?.slice(0, 8)}</span>
                    <span className="text-[10px] text-text-muted">Severity: {r.severity_score}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                    <button 
                      onClick={() => handleActionReport(r.id)}
                      className="text-[11px] text-error hover:underline font-medium cursor-pointer"
                    >
                      Action
                    </button>
                    <span className="text-border">|</span>
                    <button 
                      onClick={() => handleDismissReport(r.id)}
                      className="text-[11px] text-text-muted hover:underline font-medium cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Feedback Statistics */}
        <div className="bg-surface-1 border border-border rounded-[var(--radius-md)] p-4">
          <p className="text-sm font-medium text-text mb-4">User Feedback (Last 24h)</p>
          <div className="space-y-4">
            {[
              { label: "Good Chat", count: feedbackStats.good, color: "bg-success" },
              { label: "Wait was long", count: feedbackStats.wait, color: "bg-warning" },
              { label: "Couldn't connect", count: feedbackStats.bad, color: "bg-error" },
            ].map((stat) => {
              const total = feedbackStats.good + feedbackStats.wait + feedbackStats.bad || 1;
              const percentage = Math.round((stat.count / total) * 100);
              return (
                <div key={stat.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">{stat.label}</span>
                    <span className="text-text font-medium">{stat.count} ({percentage}%)</span>
                  </div>
                  <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${stat.color} transition-all duration-500`} 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {feedbackStats.good + feedbackStats.wait + feedbackStats.bad === 0 && (
            <p className="text-xs text-text-muted mt-4 text-center">No feedback received yet.</p>
          )}
        </div>
      </div>

      {/* Recent rooms */}
      <div className="bg-surface-1 border border-border rounded-[var(--radius-md)] p-4">
        <p className="text-sm font-medium text-text mb-3">Recent Chat Rooms</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-muted border-b border-border">
                <th className="text-left py-2 pr-4 font-medium">Room ID</th>
                <th className="text-left py-2 pr-4 font-medium">Status</th>
                <th className="text-left py-2 pr-4 font-medium">End Reason</th>
                <th className="text-right py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentRooms.map((room) => (
                <tr key={room.id} className="border-b border-border/30">
                  <td className="py-2 pr-4 font-mono text-text-secondary">{room.id.slice(0, 12)}...</td>
                  <td className={`py-2 pr-4 capitalize font-medium ${statusColor(room.status)}`}>{room.status}</td>
                  <td className="py-2 pr-4 text-text-muted">{room.end_reason || "—"}</td>
                  <td className="py-2 text-right text-text-muted">{formatTimeAgo(room.created_at)}</td>
                </tr>
              ))}
              {recentRooms.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-text-muted">No rooms yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Platform Health */}
      <div className="bg-surface-1 border border-border rounded-[var(--radius-md)] p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-text">Platform Status</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-success text-sm font-medium">All systems operational</span>
          </div>
        </div>
      </div>
    </div>
  );
}
