"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Award, Flame, Medal, Mic, Plus, Sparkles, Star, Trophy, Video } from "lucide-react";
import type { SessionListItemDTO } from "@interview-prep/shared";
import { Badge, Card, CardContent, CardHeader, CardTitle, buttonVariants } from "@/components/ui";
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
    { key: "first", icon: Sparkles, label: "First Session", achieved: sessions.length >= 1 },
    { key: "five", icon: Medal, label: "5 Sessions", achieved: sessions.length >= 5 },
    { key: "ten", icon: Award, label: "10 Sessions", achieved: sessions.length >= 10 },
    { key: "score80", icon: Star, label: "Score 80+", achieved: completedScores.some((score) => score >= 80) },
    { key: "streak7", icon: Flame, label: "7-Day Streak", achieved: streak >= 7 },
    { key: "streak30", icon: Trophy, label: "30-Day Streak", achieved: streak >= 30 },
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
    <main className="mx-auto w-full max-w-6xl animate-enter px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Track your practice and revisit past feedback.</p>

      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-4 text-primary" /> Milestones
            </CardTitle>
            <span className="text-sm tabular-nums text-muted-foreground">
              {achievedCount} / {milestones.length}
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700"
              style={{ width: `${(achievedCount / milestones.length) * 100}%` }}
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {milestones.map(({ key, icon: Icon, label, achieved }) => (
            <Badge key={key} variant={achieved ? "default" : "outline"} className={achieved ? "" : "opacity-60"}>
              <Icon />
              {label}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <div className="mb-4 mt-10 flex items-baseline gap-2">
        <h2 className="font-semibold">Sessions</h2>
        {sessions && <span className="text-sm tabular-nums text-muted-foreground">{sessions.length}</span>}
      </div>

      {sessions === null && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {sessions?.length === 0 && (
        <Card className="flex flex-col items-center px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Mic className="size-5" />
          </span>
          <p className="mt-4 font-medium">No interviews yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Run your first mock interview to see feedback here.</p>
          <Link href="/new" className={`${buttonVariants()} mt-6`}>
            <Plus /> Start an interview
          </Link>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sessions?.map((session) => (
          <Link
            key={session.id}
            href={session.status === "completed" ? `/session/${session.id}/results` : `/session/${session.id}/permissions`}
            className="group rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <Card className="h-full overflow-hidden transition-[box-shadow,transform] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
              <div className="flex aspect-video items-center justify-center bg-muted">
                {session.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={apiUrl(session.thumbnailUrl)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Video className="size-6 text-muted-foreground/60" />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-medium">{session.roleTitle ?? "Untitled role"}</p>
                  <Badge variant={session.status === "completed" ? "success" : "secondary"} className="capitalize">
                    {session.status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(session.createdAt)}</p>

                <div className="mt-4 grid grid-cols-4 gap-2 border-t pt-4 text-center">
                  <div>
                    <p className="text-sm font-semibold tabular-nums text-primary">{session.overallScore ?? "–"}</p>
                    <p className="text-[11px] text-muted-foreground">Score</p>
                  </div>
                  {SCORE_CHIP_CATEGORIES.map((category) => (
                    <div key={category}>
                      <p className="text-sm font-semibold tabular-nums">{session.scoreBreakdown?.[category] ?? "–"}</p>
                      <p className="text-[11px] text-muted-foreground">{SCORE_CHIP_LABELS[category]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
