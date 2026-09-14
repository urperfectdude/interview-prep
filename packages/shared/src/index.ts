export type SessionStatus = "intake" | "ready" | "in_progress" | "completed";

export interface CandidateProfile {
  roleTitle: string;
  seniority: string | null;
  keySkills: string[];
  summary: string;
}

export interface QuestionPlanItem {
  id: string;
  topic: string;
  question: string;
}

export interface QuestionPlan {
  openingQuestion: string;
  items: QuestionPlanItem[];
  followUpGuidance: string;
}

export interface TranscriptEntryDTO {
  id: string;
  role: "assistant" | "user";
  text: string;
  createdAt: string;
}

export interface SessionDTO {
  id: string;
  status: SessionStatus;
  roleTitle: string | null;
  createdAt: string;
  candidateProfile: CandidateProfile | null;
  questionPlan: QuestionPlan | null;
}

export interface FeedbackItem {
  category: "clarity" | "filler_words" | "structure" | "confidence" | "content";
  strength: "strong" | "weak";
  timestampSeconds: number;
  note: string;
  spokenQuote: string;
  suggestion: string;
}

export interface SessionSummary {
  overallScore: number;
  scoreBreakdown: Record<string, number>;
  headline: string;
  feedback: FeedbackItem[];
}

export interface SessionListItemDTO {
  id: string;
  roleTitle: string | null;
  status: SessionStatus;
  createdAt: string;
  overallScore: number | null;
}
