import type { CandidateProfile, QuestionPlan, SessionSummary, TranscriptEntryDTO } from "@interview-prep/shared";
import { openai, TEXT_MODEL } from "./openai.js";

const MAX_INPUT_CHARS = 12_000;

function truncate(text: string | null | undefined): string {
  if (!text) return "";
  return text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text;
}

interface PlanningInput {
  resumeText: string;
  jdText: string;
  roleDescriptionRaw: string;
}

interface PlanningResult {
  candidateProfile: CandidateProfile;
  questionPlan: QuestionPlan;
}

export async function generateCandidateProfileAndPlan(input: PlanningInput): Promise<PlanningResult> {
  const systemPrompt = `You are an expert interview coach preparing a mock interview for a candidate.
Given a resume, an optional job description, and an optional free-text role description, produce:
1. A concise candidate profile (role title, seniority, key skills, one-paragraph summary).
2. A tailored interview question plan of 8-10 questions covering behavioral and role-fit topics.

Strict rules:
- Questions must be answerable conversationally, as on a voice/video call.
- Never include coding, algorithm/DSA, whiteboard, or any hands-on task-based questions.
- Base questions on the actual resume/JD/role content provided, not generic filler.
- If information is missing, make reasonable, clearly-labeled assumptions rather than leaving fields blank.

Respond with strict JSON matching this shape:
{
  "candidateProfile": { "roleTitle": string, "seniority": string | null, "keySkills": string[], "summary": string },
  "questionPlan": {
    "openingQuestion": string,
    "items": [{ "id": string, "topic": string, "question": string }],
    "followUpGuidance": string
  }
}`;

  const userPrompt = `RESUME:\n${truncate(input.resumeText) || "(not provided)"}\n\nJOB DESCRIPTION:\n${
    truncate(input.jdText) || "(not provided)"
  }\n\nROLE DESCRIPTION (free text from candidate):\n${truncate(input.roleDescriptionRaw) || "(not provided)"}`;

  const completion = await openai.chat.completions.create({
    model: TEXT_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned an empty planning response");

  const parsed = JSON.parse(raw) as PlanningResult;
  return parsed;
}

export async function generateSessionSummary(
  transcript: TranscriptEntryDTO[],
  roleTitle: string | null
): Promise<SessionSummary> {
  const systemPrompt = `You are an expert interview coach reviewing a completed mock interview transcript for the role "${
    roleTitle ?? "the target role"
  }".
Analyze the candidate's answers (role: "user") and produce structured, actionable feedback.

Respond with strict JSON matching this shape:
{
  "overallScore": number (0-100),
  "scoreBreakdown": { "clarity": number, "structure": number, "confidence": number, "content": number },
  "headline": string (one encouraging sentence summarizing the performance),
  "feedback": [
    {
      "category": "clarity" | "filler_words" | "structure" | "confidence" | "content",
      "strength": "strong" | "weak" (whether this quote is a highlight to reinforce or a weak spot to improve),
      "timestampSeconds": number (approximate position in the conversation, starting at 0),
      "note": string,
      "spokenQuote": string (an actual short quote from the candidate's answers),
      "suggestion": string (a concrete rewrite or improvement)
    }
  ]
}
Base every "spokenQuote" on text that actually appears verbatim in the transcript's "user" turns, since it is used to highlight that span in the displayed transcript. Include a mix of "strong" and "weak" items. Produce 4-8 feedback items.`;

  const transcriptText = transcript
    .map((entry) => `[${entry.role}] ${entry.text}`)
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: TEXT_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: truncate(transcriptText) || "(empty transcript)" },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned an empty summary response");

  return JSON.parse(raw) as SessionSummary;
}

export async function generateFrameInsight(imageBase64: string, mimeType: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are giving a candidate a brief, kind, informational note about their visible environment and posture " +
          "from a single still frame taken during a mock interview. This is never a score or pass/fail judgment - " +
          "just a soft, practical observation (e.g. lighting, framing, posture, background) in 1-2 short sentences. " +
          "Never comment on appearance, identity, or anything unrelated to environment/posture/presence.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Give a brief, informational note on the environment and posture in this frame." },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() || "No environment note generated.";
}
