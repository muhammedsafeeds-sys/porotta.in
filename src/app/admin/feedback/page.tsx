import React from "react";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 0; // Disable caching

export default async function FeedbackAdminPage() {
  const supabase = createAdminClient();

  // Fetch feedback from the last 24 hours
  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 24);

  const { data: feedbacks, error } = await supabase
    .from("feedback")
    .select("*")
    .gte("created_at", yesterday.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching feedback:", error);
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text">User Feedback</h1>
          <p className="text-text-muted mt-1">
            Recent feedback submitted in the last 24 hours (auto-deleted from view).
          </p>
        </div>
      </div>

      {!feedbacks || feedbacks.length === 0 ? (
        <div className="p-8 text-center bg-surface-1 border border-border rounded-xl">
          <p className="text-text-secondary">No feedback submitted in the last 24 hours.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {feedbacks.map((fb) => (
            <div key={fb.id} className="p-5 bg-surface-1 border border-border rounded-xl flex flex-col gap-3">
              <div className="flex justify-between items-start gap-4">
                <p className="text-text whitespace-pre-wrap flex-1">{fb.message}</p>
                <span className="text-xs text-text-muted whitespace-nowrap bg-surface-2 px-2 py-1 rounded">
                  {new Date(fb.created_at).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-text-muted font-mono bg-bg p-2 rounded truncate">
                Session: {fb.session_id} • Room: {fb.room_id || "Unknown"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
