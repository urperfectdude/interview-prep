# Product specification — interview-prep

> Status: draft. A coding agent must not implement product code until this specification is approved through Genesis.

## Problem

Candidates preparing for job interviews have no low-friction way to rehearse a realistic, role-specific conversation before the real thing. This product lets a candidate provide whatever prep material they have (a job description, a link to one, a plain-text description of the role, and/or their resume), then runs an AI-driven mock interview that feels like an actual voice/video call — the AI asks tailored questions, listens and responds by voice, asks natural follow-ups based on what the candidate actually said, and gives the candidate feedback afterward on both content and delivery.

## Users

- **Primary**: a job seeker preparing for an upcoming interview who wants low-stakes, repeatable practice with realistic questions and actionable feedback.
- Not addressed in this release: interviewers/recruiters using the tool to evaluate candidates, or team/enterprise admin use.

## Functional requirements

- FR-1: A guided 3-step intake wizard (Welcome → Role & JD → Resume) collects a JD file upload, a JD link, and/or a free-text role description (all optional, any combination) and a resume upload (mandatory unless the user has a saved resume in Settings, per FR-8). Submitting extracts text from the provided file(s)/link server-side and makes a single OpenAI call to produce a candidate profile and a tailored interview question plan.
- FR-2: A permissions + pre-call screen requests microphone and camera access via `getUserMedia`, shows a live camera preview so the candidate can check framing, and gates the "Start" action until both permissions are granted.
- FR-3: The interview itself runs as a real-time voice session (OpenAI Realtime API over WebRTC, using a short-lived ephemeral token minted by the backend). The AI speaks each question aloud, transcribes both sides of the conversation live, and asks natural follow-up questions driven by the candidate's actual spoken answers. Scope is strictly conversational Q&A (behavioral/role-fit style, answerable on a video call) — no live coding, DSA, or other hands-on tasks, now or planned.
- FR-4: During the interview, the app captures a webcam frame as soon as the camera has a picture, then again at randomized intervals (15–30 seconds), and uploads each one to the backend, associated with the session, for a soft/informational read on environment and posture. This is never a pass/fail gate and is not shown as a live feed to anyone else.
- FR-5: After the interview ends, a results page shows the full transcript (with clearly highlighted strong vs. weak spans), categorized and timestamped AI feedback (e.g. clarity, filler words, structure, confidence — each with the spoken quote and a suggested rewrite), and an overall score summary. This is generated from the actual persisted transcript via one OpenAI summary call, never hardcoded/sample content.
- FR-6 (should-have, lower priority than FR-1–FR-5): a dashboard/home view for returning users showing past session history and basic aggregate stats, reusing the same visual system as the rest of the app.
- FR-7: There is no sign-in. The first request creates a device-local guest and a long-lived httpOnly cookie. Every session belongs to that guest, and every session route (create, list, fetch, realtime token, transcript, frames, complete, summary) returns only that guest's sessions.
- FR-8: A Settings page stores a display name, a saved resume the intake wizard reuses when no new resume is uploaded, a default target role and seniority used when the wizard's role description is left blank, and the interviewer voice used for the Realtime session.

## Non-functional requirements

- NFR-1: The OpenAI API key is used only in server-side code; the browser only ever receives short-lived Realtime ephemeral tokens, never the underlying API key.
- NFR-2: All pages are built from one shared UI kit (button, card, input, textarea, file dropzone, step indicator, etc.) so the app reads as one consistent, minimalist design system — no per-page one-off styling. Visual language: off-white/light-neutral backgrounds, white rounded-xl cards with soft shadows, a single indigo/violet accent color used consistently, Inter-style sans-serif typography, generous spacing.
- NFR-3: The app runs fully on a local machine with no external services beyond OpenAI — a single root `npm run dev` boots both the frontend and backend, using SQLite so there is no external database to provision.

## Constraints

- Solo-developer / MVP scope: no team accounts, billing, or sign-in in this release (FR-7).
- OpenAI is the only third-party AI provider used (for text generation/parsing, the Realtime voice API, and feedback generation).
- Local file storage (disk) for uploaded resumes/JDs and captured frames is acceptable for this release; no cloud object storage required yet.

## Non-goals

- No live coding, take-home, or whiteboard-style technical assessment features.
- No interviewer/recruiter-facing views, scoring dashboards for a third party, or candidate ranking.
- No mobile native app — responsive web only.
- No sign-in, accounts, or identity providers.

## Acceptance criteria

- AC-1: Completing the wizard with only a resume uploaded (every other field left blank) successfully reaches the permissions screen.
- AC-2: The "Start" control stays disabled until both microphone and camera permissions are granted, with a clear explanation shown while waiting; once both are granted it becomes enabled.
- AC-3: During a live session, at least one AI question is audibly spoken (voice output) and at least one corresponding transcript entry is persisted to the backend in real time.
- AC-4: At least one randomized webcam frame capture is stored on the backend, associated with the session, by the time a session completes.
- AC-5: The results page renders a transcript and categorized AI feedback that are demonstrably sourced from that session's actual persisted transcript (verified by comparing displayed content against the stored transcript rows), not static/sample content.
- AC-6: A request for another device's session id returns 404.
- AC-7: After saving a resume in Settings, the user can complete the wizard without uploading a resume and still reach the permissions screen.
- AC-8: Opening the app with no cookie creates a guest, and later requests on that device stay on the same guest.

## Risks

- OpenAI Realtime API latency or connection issues could break the "feels like a real call" experience — mitigate by surfacing clear connection-state UI and a manual retry path.
- Randomized frame capture touches sensitive personal data (candidate's face/environment) — mitigate by keeping captures session-scoped, informational only, never a hard gate, and stating this plainly on the permissions screen before consent.
- Resume/JD text extraction from arbitrary PDFs/docs can fail or produce garbled text — mitigate by allowing the free-text role description as a fallback path and not hard-failing the flow if extraction is partial.

## Open questions

- None — scope, stack (Next.js + Node/Express backend, OpenAI Realtime for voice, direct OpenAI parsing, SQLite via Prisma), and visual design reference have been confirmed with the user.
