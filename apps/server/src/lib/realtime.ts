import type { CandidateProfile, QuestionPlan } from "@interview-prep/shared";
import { env } from "./env.js";
import { REALTIME_MODEL } from "./openai.js";

export function buildInterviewerInstructions(profile: CandidateProfile, plan: QuestionPlan): string {
  const questionList = plan.items.map((item, i) => `${i + 1}. [${item.topic}] ${item.question}`).join("\n");

  return `You are a warm, professional interviewer conducting a mock job interview over voice, like a real video call.

Candidate profile:
- Target role: ${profile.roleTitle}${profile.seniority ? ` (${profile.seniority})` : ""}
- Key skills: ${profile.keySkills.join(", ") || "not specified"}
- Summary: ${profile.summary}

Opening question: ${plan.openingQuestion}

Question plan (use as a guide, not a rigid script):
${questionList}

Follow-up guidance: ${plan.followUpGuidance}

Rules:
- Speak naturally and conversationally, one question or follow-up at a time. Never dump multiple questions at once.
- Ask genuine follow-up questions based on what the candidate actually says before moving to the next planned topic.
- Never ask the candidate to write, run, or solve code, algorithms, or any hands-on/live task. This is a conversational interview only.
- Keep your own turns concise, like a real interviewer would.
- After covering the question plan, thank the candidate and let them know the interview is complete.`;
}

interface RealtimeClientSecretResponse {
  value: string;
  expires_at: number;
  [key: string]: unknown;
}

export async function createRealtimeEphemeralSession(instructions: string): Promise<RealtimeClientSecretResponse> {
  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: REALTIME_MODEL,
        instructions,
        audio: {
          input: {
            transcription: { model: "whisper-1" },
            turn_detection: { type: "server_vad" },
          },
          output: { voice: "alloy" },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Realtime client secret: ${response.status} ${errorText}`);
  }

  return (await response.json()) as RealtimeClientSecretResponse;
}
