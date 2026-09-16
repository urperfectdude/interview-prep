"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Check, CircleAlert, Lightbulb } from "lucide-react";
import type { FrameCaptureDTO, SessionSummary, TranscriptEntryDTO } from "@interview-prep/shared";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Notice, ScoreRadar, Spinner } from "@/components/ui";
import { apiFetch, apiUrl } from "@/lib/api";

type HighlightFilter = "all" | "weak" | "strong";

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

const ISSUE_HINTS: Record<string, string> = {
  clarity: "Sharpen delivery",
  filler_words: "Reduce filler use",
  structure: "Tighten structure",
  confidence: "Build confidence",
  content: "Add specifics",
};

const FILTER_LABELS: Record<HighlightFilter, string> = { all: "All", weak: "Issues", strong: "Good Parts" };

type Chip = { key: string; label: string; hint: string; count: number; tone: "danger" | "success" };

function computeChips(feedback: SessionSummary["feedback"]): Chip[] {
  const issueCounts = new Map<string, number>();
  let goodCount = 0;
  for (const item of feedback) {
    if (item.strength === "strong") {
      goodCount += 1;
    } else {
      issueCounts.set(item.category, (issueCounts.get(item.category) ?? 0) + 1);
    }
  }

  const issueChips: Chip[] = [...issueCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, count]) => ({
      key: category,
      label: CATEGORY_LABELS[category] ?? category,
      hint: ISSUE_HINTS[category] ?? "Needs attention",
      count,
      tone: "danger",
    }));

  return [...issueChips, { key: "good", label: "Good Parts", hint: "Strong moments", count: goodCount, tone: "success" }];
}

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
            ? "rounded-sm bg-success/15 px-0.5 text-success"
            : "rounded-sm bg-destructive/15 px-0.5 text-destructive"
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
  const [frames, setFrames] = useState<FrameCaptureDTO[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [highlightFilter, setHighlightFilter] = useState<HighlightFilter>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const transcriptRes = await apiFetch(`/api/sessions/${id}/transcript`);
        const transcriptData = (await transcriptRes.json()) as TranscriptEntryDTO[];

        let summaryRes = await apiFetch(`/api/sessions/${id}/summary`);
        if (summaryRes.status === 404) {
          await apiFetch(`/api/sessions/${id}/complete`, { method: "POST" });
          summaryRes = await apiFetch(`/api/sessions/${id}/summary`);
        }
        const summaryData = (await summaryRes.json()) as SessionSummary;
        const framesRes = await apiFetch(`/api/sessions/${id}/frames`);
        const framesData = framesRes.ok ? ((await framesRes.json()) as FrameCaptureDTO[]) : [];

        if (!cancelled) {
          setTranscript(transcriptData);
          setSummary(summaryData);
          setFrames(framesData);
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
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-10 text-sm text-muted-foreground">
        <Spinner className="size-5 text-primary" />
        Generating your feedback…
      </main>
    );
  }

  if (status === "error" || !summary) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <Notice>We couldn&apos;t load your results. Please try again shortly.</Notice>
      </main>
    );
  }

  const chips = computeChips(summary.feedback);
  const highlightedFeedback = summary.feedback.filter(
    (item) => highlightFilter === "all" || item.strength === highlightFilter
  );

  return (
    <main className="mx-auto w-full max-w-6xl animate-enter px-4 py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Your interview feedback</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{summary.headline}</p>

      {/* On large screens both columns share one height; transcript and feedback scroll inside their cards. */}
      <div className="mt-8 grid gap-6 lg:h-[56rem] lg:grid-cols-[1.3fr_1fr]">
        <Card className="flex flex-col lg:min-h-0">
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {chips.map((chip) => (
                <div key={chip.key} className="rounded-lg border p-3">
                  <p
                    className={`text-xl font-semibold tabular-nums ${
                      chip.tone === "success" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {chip.count}
                  </p>
                  <p className="mt-1 text-xs font-medium">{chip.label}</p>
                  <p className="text-xs text-muted-foreground">{chip.hint}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-b pb-4">
              <span className="text-xs font-medium text-muted-foreground">Highlight</span>
              <div role="group" aria-label="Highlight filter" className="inline-flex rounded-lg bg-muted p-0.5">
                {(["all", "weak", "strong"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    aria-pressed={highlightFilter === filter}
                    onClick={() => setHighlightFilter(filter)}
                    className={`h-7 cursor-pointer rounded-md px-3 text-xs font-medium transition-all ${
                      highlightFilter === filter
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {FILTER_LABELS[filter]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 max-h-[28rem] snap-y snap-proximity space-y-4 overflow-y-auto pr-1 text-sm lg:max-h-none lg:min-h-0 lg:flex-1">
              {transcript.map((entry) => (
                <div key={entry.id} className="snap-start">
                  <p
                    className={`text-xs font-medium ${
                      entry.role === "assistant" ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {entry.role === "assistant" ? "Interviewer" : "You"}
                  </p>
                  <p className="mt-0.5 leading-relaxed">
                    {entry.role === "user" ? highlightSpans(entry.text, highlightedFeedback) : entry.text}
                  </p>
                </div>
              ))}
              {transcript.length === 0 && (
                <p className="text-muted-foreground">No transcript recorded for this session.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:min-h-0">
          <Card className="shrink-0">
            <CardHeader>
              <CardTitle>Overall score</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-5xl font-semibold tracking-tight tabular-nums text-primary">
                {summary.overallScore}
                <span className="text-lg font-medium text-muted-foreground">/100</span>
              </p>
              <ScoreRadar scores={summary.scoreBreakdown} />
            </CardContent>
          </Card>

          {frames.length > 0 && (
            <Card className="shrink-0">
              <CardHeader>
                <CardTitle>On-camera presence</CardTitle>
                <CardDescription>
                  Random webcam snapshots, each read by AI — informational only, never a score or pass/fail signal.
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-72 space-y-4 overflow-y-auto">
                {frames.map((frame, index) => (
                  <div key={frame.id} className="flex gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={apiUrl(frame.imageUrl)}
                      alt={`Webcam snapshot ${index + 1} from your interview`}
                      className="h-20 w-28 flex-none rounded-md object-cover ring-1 ring-border"
                    />
                    <div className="text-sm">
                      <p className="text-xs font-medium tabular-nums text-muted-foreground">
                        Snapshot {index + 1} · {new Date(frame.capturedAt).toLocaleTimeString()}
                      </p>
                      <p className="mt-0.5 text-muted-foreground">{frame.note ?? "Analysis not available yet."}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="flex flex-col lg:min-h-0 lg:flex-1">
            <CardHeader>
              <CardTitle>AI feedback</CardTitle>
            </CardHeader>
            <CardContent className="divide-y lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {summary.feedback.map((item, index) => (
                <div key={index} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <Badge variant={item.strength === "strong" ? "success" : "destructive"}>
                      {item.strength === "strong" ? <Check /> : <CircleAlert />}
                      <span className="sr-only">{item.strength === "strong" ? "Strength:" : "Issue:"}</span>
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </Badge>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {formatTimestamp(item.timestampSeconds)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm">{item.note}</p>
                  <blockquote className="mt-2 border-l-2 pl-3 text-sm italic text-muted-foreground">
                    &ldquo;{item.spokenQuote}&rdquo;
                  </blockquote>
                  <p className="mt-2 flex gap-2 text-sm">
                    <Lightbulb className="mt-0.5 size-4 flex-none text-primary" />
                    <span>{item.suggestion}</span>
                  </p>
                </div>
              ))}
              {summary.feedback.length === 0 && <p className="text-sm text-muted-foreground">No feedback generated.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
