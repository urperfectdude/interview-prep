"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SessionListItemDTO } from "@interview-prep/shared";
import { Card } from "@/components/ui";
import { apiFetch, apiUrl } from "@/lib/api";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function longestDayStreak(isoDates: string[]): number {
  const dayTimestamps = [...new Set(isoDates.map((iso) => new Date(iso).toDateString()))]
    .map((d) => new Date(d).getTime())
    .sort((a, b) => a - b);

  let longest = dayTimestamps.length ? 1 : 0;
  let current = 1;
  for (let i = 1; i < dayTimestamps.length; i++) {
    const diffDays = Math.round((dayTimestamps[i] - dayTimestamps[i - 1]) / 86_400_000);
    if (diffDays === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else if (diffDays > 1) {
      current = 1;
    }
  }
  return longest;
}

function computeMilestones(sessions: SessionListItemDTO[]) {
  const completedScores = sessions.map((s) => s.overallScore).filter((score): score is number => score !== null);
  const streak = longestDayStreak(sessions.map((s) => s.createdAt));

  return [
    { key: "first", icon: "🎉", label: "First Session", achieved: sessions.length >= 1 },
    { key: "five", icon: "🥉", label: "5 Sessions", achieved: sessions.length >= 5 },
    { key: "ten", icon: "🥈", label: "10 Sessions", achieved: sessions.length >= 10 },
    { key: "score80", icon: "⭐", label: "Score 80+", achieved: completedScores.some((score) => score >= 80) },
    { key: "streak7", icon: "🔥", label: "7-Day Streak", achieved: streak >= 7 },
    { key: "streak30", icon: "🏆", label: "30-Day Streak", achieved: streak >= 30 },
  ];
}

const SCORE_CHIP_CATEGORIES = ["clarity", "structure", "confidence"] as const;
const SCORE_CHIP_LABELS: Record<string, string> = {
  clarity: "Clarity",
  structure: "Structure",
  confidence: "Confidence",
};

export default function DashboardPage() {
  const [sessions, setSessions] = useState<SessionListItemDTO[] | null>(null);

  useEffect(() => {
    apiFetch("/api/sessions")
      .then((res) => res.json())
      .then((data: SessionListItemDTO[]) => setSessions(data))
      .catch((err) => console.error("Failed to load sessions:", err));
  }, []);

  const milestones = computeMilestones(sessions ?? []);
  const achievedCount = milestones.filter((m) => m.achieved).length;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <Card className="mb-6 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted">
          <span>🏅 Milestones</span>
          <span className="text-xs font-normal">
            {achievedCount} / {milestones.length}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {milestones.map((milestone) => (
            <span
              key={milestone.key}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                milestone.achieved ? "bg-accent-soft text-accent" : "bg-background text-muted"
              }`}
            >
              <span>{milestone.icon}</span>
              {milestone.label}
            </span>
          ))}
        </div>
      </Card>

      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-muted">
          All Sessions {sessions ? `· ${sessions.length}` : ""}
        </h2>
      </div>

      {sessions === null && <p className="text-sm text-muted">Loading...</p>}
      {sessions?.length === 0 && (
        <Card className="p-6 text-sm text-muted">No interviews yet — start your first one above.</Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sessions?.map((session) => (
          <Link
            key={session.id}
            href={session.status === "completed" ? `/session/${session.id}/results` : `/session/${session.id}/permissions`}
          >
            <Card className="h-full overflow-hidden p-0 transition-opacity hover:opacity-90">
              <div className="flex aspect-video items-center justify-center bg-foreground/90">
                {session.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={apiUrl(session.thumbnailUrl)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-white/60">No preview</span>
                )}
              </div>
              <div className="p-4">
                <p className="text-xs text-muted">{formatDate(session.createdAt)}</p>
                <p className="mt-0.5 font-medium">{session.roleTitle ?? "Untitled role"}</p>
                <span className="mt-2 inline-block rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium capitalize text-accent">
                  {session.status.replace("_", " ")}
                </span>

                <div className="mt-3 grid grid-cols-4 gap-2 border-t border-border pt-3 text-center">
                  <div>
                    <p className="text-sm font-semibold text-accent">{session.overallScore ?? "–"}</p>
                    <p className="text-[10px] text-muted">Score</p>
                  </div>
                  {SCORE_CHIP_CATEGORIES.map((category) => (
                    <div key={category}>
                      <p className="text-sm font-semibold">{session.scoreBreakdown?.[category] ?? "–"}</p>
                      <p className="text-[10px] text-muted">{SCORE_CHIP_LABELS[category]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
