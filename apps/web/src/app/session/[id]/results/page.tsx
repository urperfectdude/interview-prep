"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { SessionSummary, TranscriptEntryDTO } from "@interview-prep/shared";
import { Card, ScoreRadar } from "@/components/ui";
import { apiUrl } from "@/lib/api";

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  clarity: "Clarity",
  filler_words: "Filler Words",
  structure: "Structure",
  confidence: "Confidence",
  content: "Content",
};

function highlightSpans(text: string, feedback: SessionSummary["feedback"]) {
  const matches = feedback
    .map((item) => ({ start: text.indexOf(item.spokenQuote), item }))
    .filter((m) => m.start !== -1 && m.item.spokenQuote.length > 0)
    .sort((a, b) => a.start - b.start)
    .filter((m, i, arr) => i === 0 || m.start >= arr[i - 1].start + arr[i - 1].item.spokenQuote.length);

  if (matches.length === 0) return text;

  const nodes: ReactNode[] = [];
  let cursor = 0;
  matches.forEach(({ start, item }, i) => {
    if (start > cursor) nodes.push(text.slice(cursor, start));
    const end = start + item.spokenQuote.length;
    nodes.push(
      <mark
        key={i}
        className={
          item.strength === "strong"
            ? "rounded bg-success/15 text-success"
            : "rounded bg-danger/15 text-danger"
        }
      >
        {text.slice(start, end)}
      </mark>
    );
    cursor = end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [transcript, setTranscript] = useState<TranscriptEntryDTO[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const transcriptRes = await fetch(apiUrl(`/api/sessions/${id}/transcript`));
        const transcriptData = (await transcriptRes.json()) as TranscriptEntryDTO[];

        let summaryRes = await fetch(apiUrl(`/api/sessions/${id}/summary`));
        if (summaryRes.status === 404) {
          await fetch(apiUrl(`/api/sessions/${id}/complete`), { method: "POST" });
          summaryRes = await fetch(apiUrl(`/api/sessions/${id}/summary`));
        }
        const summaryData = (await summaryRes.json()) as SessionSummary;

        if (!cancelled) {
          setTranscript(transcriptData);
          setSummary(summaryData);
          setStatus("ready");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10 text-sm text-muted">
        Generating your feedback...
      </div>
    );
  }

  if (status === "error" || !summary) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10 text-sm text-danger">
        We couldn&apos;t load your results. Please try again shortly.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Your interview feedback</h1>
      <p className="mt-1 text-sm text-muted">{summary.headline}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-muted">Transcript</h2>
          <div className="mt-3 max-h-[28rem] space-y-3 overflow-y-auto pr-1 text-sm">
            {transcript.map((entry) => (
              <p key={entry.id}>
                <span className={`font-semibold ${entry.role === "assistant" ? "text-accent" : "text-foreground"}`}>
                  {entry.role === "assistant" ? "Interviewer: " : "You: "}
                </span>
                {entry.role === "user" ? highlightSpans(entry.text, summary.feedback) : entry.text}
              </p>
            ))}
            {transcript.length === 0 && <p className="text-muted">No transcript recorded for this session.</p>}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 text-center">
            <h2 className="text-sm font-semibold text-muted">Overall Score</h2>
            <p className="mt-1 text-3xl font-semibold text-accent">{summary.overallScore}/100</p>
            <ScoreRadar scores={summary.scoreBreakdown} />
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-semibold text-muted">AI Feedback</h2>
            <div className="mt-3 space-y-4">
              {summary.feedback.map((item, index) => (
                <div key={index} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </span>
                    <span className="text-muted">{formatTimestamp(item.timestampSeconds)}</span>
                  </div>
                  <p className="mt-2 text-sm">{item.note}</p>
                  <p className="mt-1 text-sm italic text-muted">&ldquo;{item.spokenQuote}&rdquo;</p>
                  <p className="mt-1 text-sm text-foreground">
                    <span className="font-medium text-accent">Suggestion: </span>
                    {item.suggestion}
                  </p>
                </div>
              ))}
              {summary.feedback.length === 0 && <p className="text-sm text-muted">No feedback generated.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
