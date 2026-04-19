"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLivePage() {
  const [queueMen, setQueueMen] = useState(0);
  const [queueWomen, setQueueWomen] = useState(0);
  const [queueAnyone, setQueueAnyone] = useState(0);
  const [activeRooms, setActiveRooms] = useState(0);
  const [reports, setReports] = useState<any[]>([]);
  const [feedbackStats, setFeedbackStats] = useState({ good: 0, bad: 0, wait: 0 });
  const [loading, setLoading] = useState(true);

  const fetchLiveStats = async () => {
    try {
      const supabase = createClient();
      
      // 1. Queue stats
      const { data: poolData } = await supabase.from("waiting_pool").select("desired_gender");
      if (poolData) {
        setQueueMen(poolData.filter(p => p.desired_gender === "man").length);
        setQueueWomen(poolData.filter(p => p.desired_gender === "woman").length);
        setQueueAnyone(poolData.filter(p => p.desired_gender === "anyone").length);
      }

      // 2. Active rooms
      const { count: roomsCount } = await supabase.from("chat_rooms").select("*", { count: "exact", head: true }).eq("status", "active");
      if (roomsCount !== null) setActiveRooms(roomsCount);

      // 3. Pending reports
      const { data: recentReports } = await supabase
        .from("reports")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);
      if (recentReports) setReports(recentReports);

      // 4. Feedback stats (Last 24h)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: feedbackData } = await supabase
        .from("chat_rooms")
        .select("feedback_a, feedback_b")
        .gt("created_at", yesterday);
      
      if (feedbackData) {
        const allFeedback = feedbackData.flatMap(r => [r.feedback_a, r.feedback_b]).filter(Boolean);
        setFeedbackStats({
          good: allFeedback.filter(f => f === "Good chat").length,
          bad: allFeedback.filter(f => f === "Couldn't connect").length,
          wait: allFeedback.filter(f => f === "Wait was long").length
        });
      }
      
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

  const formatTimeAgo = (isoString: string) => {
    const min = Math.floor((new Date().getTime() - new Date(isoString).getTime()) / 60000);
    return min === 0 ? "Just now" : `${min} min ago`;
  };

  const totalOnline = queueMen + queueWomen + queueAnyone + (activeRooms * 2);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text mb-1">Live Operations</h1>
          <p className="text-sm text-text-muted">Real-time platform status (updates every 5s)</p>
        </div>
        <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl">
          <p className="text-[10px] text-primary uppercase tracking-wider font-bold">Total Online</p>
          <p className="text-xl font-bold text-primary tabular-nums">{totalOnline}</p>
        </div>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Waiting for Men", value: queueMen, color: "text-primary" },
          { label: "Waiting for Women", value: queueWomen, color: "text-primary" },
          { label: "Waiting for Anyone", value: queueAnyone, color: "text-primary" },
          { label: "Active Rooms", value: activeRooms, color: "text-success" },
        ].map((s) => (
          <div key={s.label} className="bg-surface-1 border border-border rounded-[var(--radius-md)] p-4">
            <p className="text-xs text-text-muted mb-1">{s.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${loading ? "opacity-50" : ""} ${s.color}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending reports */}
        <div className="bg-surface-1 border border-border rounded-[var(--radius-md)] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-text">Pending Reports</p>
            <span className="px-2 py-0.5 bg-error-muted text-error text-xs font-medium rounded-full">
              {reports.length} pending
            </span>
          </div>
          <div className="space-y-2">
            {reports.length === 0 ? (
              <p className="text-sm text-text-muted py-2">No pending reports.</p>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="flex flex-col gap-2 p-3 bg-surface-2 rounded-[var(--radius-sm)] text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-text-muted text-xs font-mono">{r.id.split("-")[0]}</span>
                      <span className="text-text capitalize font-medium">{r.reason}</span>
                    </div>
                    <span className="text-text-muted text-[11px]">{formatTimeAgo(r.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${r.severity_score >= 4 ? "bg-error" : r.severity_score >= 2 ? "bg-warning" : "bg-text-muted"}`} />
                      <span className="text-[11px] text-text-secondary">Severity: {r.severity_score}</span>
                    </div>
                    <button 
                      onClick={() => handleDismissReport(r.id)}
                      className="text-[11px] text-primary hover:underline font-medium"
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
