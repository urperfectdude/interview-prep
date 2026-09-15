"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { FrameCaptureDTO, SessionSummary, TranscriptEntryDTO } from "@interview-prep/shared";
import { Card, ScoreRadar } from "@/components/ui";
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

  const chips = computeChips(summary.feedback);
  const highlightedFeedback = summary.feedback.filter(
    (item) => highlightFilter === "all" || item.strength === highlightFilter
  );
  const latestFrame = frames.length > 0 ? frames[frames.length - 1] : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Your interview feedback</h1>
      <p className="mt-1 text-sm text-muted">{summary.headline}</p>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-muted">Transcript</h2>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {chips.map((chip) => (
              <div
                key={chip.key}
                className={`rounded-xl p-3 ${chip.tone === "success" ? "bg-success/10" : "bg-danger/10"}`}
              >
                <p className={`text-lg font-semibold ${chip.tone === "success" ? "text-success" : "text-danger"}`}>
                  {chip.count}
                </p>
                <p className="text-xs font-medium">{chip.label}</p>
                <p className="text-xs text-muted">{chip.hint}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-b border-border pb-3">
            <span className="text-xs font-medium text-muted">Highlight:</span>
            <div className="flex gap-1">
              {(["all", "weak", "strong"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setHighlightFilter(filter)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    highlightFilter === filter ? "bg-accent text-white" : "bg-accent-soft text-muted"
                  }`}
                >
                  {filter === "all" ? "All" : filter === "weak" ? "Issues" : "Good Parts"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 max-h-[28rem] snap-y snap-proximity space-y-3 overflow-y-auto pr-1 text-sm">
            {transcript.map((entry) => (
              <p key={entry.id} className="snap-start">
                <span className={`font-semibold ${entry.role === "assistant" ? "text-accent" : "text-foreground"}`}>
                  {entry.role === "assistant" ? "Interviewer: " : "You: "}
                </span>
                {entry.role === "user" ? highlightSpans(entry.text, highlightedFeedback) : entry.text}
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

          {latestFrame && (
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-muted">Environment &amp; Presence</h2>
              <div className="mt-3 flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={apiUrl(latestFrame.imageUrl)}
                  alt="A still frame captured during your interview"
                  className="h-20 w-28 flex-none rounded-lg object-cover"
                />
                <p className="text-sm text-muted">
                  {latestFrame.note ?? "No environment note generated for this session."}
                </p>
              </div>
              <p className="mt-3 text-xs text-muted">
                A soft, informational read from a single still frame — never a score or pass/fail signal.
              </p>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-sm font-semibold text-muted">AI Feedback</h2>
            <div className="mt-3 space-y-4">
              {summary.feedback.map((item, index) => (
                <div key={index} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.strength === "strong" ? "bg-success" : "bg-danger"
                        }`}
                      />
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
