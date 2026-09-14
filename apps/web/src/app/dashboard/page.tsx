"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SessionListItemDTO } from "@interview-prep/shared";
import { Button, Card } from "@/components/ui";
import { apiUrl } from "@/lib/api";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<SessionListItemDTO[] | null>(null);

  useEffect(() => {
    fetch(apiUrl("/api/sessions"))
      .then((res) => res.json())
      .then((data: SessionListItemDTO[]) => setSessions(data))
      .catch((err) => console.error("Failed to load sessions:", err));
  }, []);

  const completedScores = (sessions ?? [])
    .map((s) => s.overallScore)
    .filter((score): score is number => score !== null);
  const averageScore = completedScores.length
    ? Math.round(completedScores.reduce((a, b) => a + b, 0) / completedScores.length)
    : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight">
          Interview<span className="text-accent">Prep</span>
        </span>
        <Link href="/">
          <Button>+ New Interview</Button>
        </Link>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-muted">Total Sessions</p>
          <p className="mt-1 text-2xl font-semibold">{sessions?.length ?? "–"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-muted">Average Score</p>
          <p className="mt-1 text-2xl font-semibold">{averageScore ?? "–"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-muted">Completed</p>
          <p className="mt-1 text-2xl font-semibold">{completedScores.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-muted">In Progress</p>
          <p className="mt-1 text-2xl font-semibold">
            {(sessions ?? []).filter((s) => s.status !== "completed").length}
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-muted">Recent Sessions</h2>
        <div className="mt-4 divide-y divide-border">
          {sessions === null && <p className="py-4 text-sm text-muted">Loading...</p>}
          {sessions?.length === 0 && (
            <p className="py-4 text-sm text-muted">No interviews yet — start your first one above.</p>
          )}
          {sessions?.map((session) => (
            <Link
              key={session.id}
              href={session.status === "completed" ? `/session/${session.id}/results` : `/session/${session.id}/permissions`}
              className="flex items-center justify-between py-3 text-sm hover:opacity-80"
            >
              <div>
                <p className="font-medium">{session.roleTitle ?? "Untitled role"}</p>
                <p className="text-xs text-muted">{formatDate(session.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium capitalize text-accent">
                  {session.status.replace("_", " ")}
                </span>
                {session.overallScore !== null && (
                  <span className="text-sm font-semibold text-accent">{session.overallScore}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
