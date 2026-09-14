# InterviewPrep

AI-powered mock interview prep. A candidate provides a job description (file, link, or free text)
and a resume, then practices a realistic voice interview with an AI interviewer, and gets
transcript-backed feedback afterward.

## Stack

- **apps/web** — Next.js (App Router, TypeScript, Tailwind CSS v4)
- **apps/server** — Express + TypeScript, Prisma + SQLite
- **packages/shared** — types shared between web and server
- OpenAI: Chat Completions for resume/JD parsing and feedback generation, the Realtime API
  (WebRTC) for the live voice interview

## Prerequisites

- Node.js 18+
- An OpenAI API key with Realtime API access

## Setup

```bash
npm install

# Backend env
cp apps/server/.env.example apps/server/.env
# then edit apps/server/.env and set OPENAI_API_KEY to a real key

# Frontend env (defaults are already correct for local dev)
cp apps/web/.env.local.example apps/web/.env.local

# Database (SQLite, created locally)
npx --prefix apps/server prisma migrate dev
```

## Run locally

```bash
npm run dev
```

This starts the backend on `http://localhost:4000` and the frontend on `http://localhost:3000`.
Open `http://localhost:3000` to start the intake wizard.

## How it works

1. **Intake** (`/`) — a 3-step wizard: Welcome → Role & JD (JD file/link/free text, all optional)
   → Resume (mandatory). Submitting sends everything to the backend, which extracts text and
   makes one OpenAI call to build a candidate profile and a tailored question plan.
2. **Permissions** (`/session/[id]/permissions`) — requests camera/mic access with a live preview.
3. **Interview** (`/session/[id]/interview`) — connects directly from the browser to the OpenAI
   Realtime API over WebRTC using a short-lived ephemeral token minted by the backend (the real
   API key never reaches the browser). The AI asks questions from the plan, adapts follow-ups to
   your answers, and the conversation is transcribed live. A single webcam frame is captured at
   randomized ~20-45s intervals for a soft, informational read on environment/posture — never a
   pass/fail signal.
4. **Results** (`/session/[id]/results`) — transcript plus categorized, timestamped AI feedback
   and a score breakdown, generated from the actual persisted transcript.
5. **Dashboard** (`/dashboard`) — history of past sessions with basic stats.

## Known limitations (local MVP)

- No authentication — sessions aren't scoped to a user; the dashboard lists all sessions on the
  machine. Fine for solo local use, not for multi-user deployment as-is.
- SQLite + local disk storage for uploads/frame captures — works for local dev, but most hosting
  platforms wipe local disk on redeploy (see "Deploying" below).
- `express@4` pulls in a moderate-severity `qs` advisory transitively; fixing it requires an
  Express 5 major upgrade, deferred for this MVP.

## Deploying

GitHub only hosts the code — pushing this repo there doesn't run it. A realistic path:

- **apps/web** → Vercel (auto-deploys from the GitHub repo on push).
- **apps/server** → Railway / Render / Fly.io (needs a persistent Node process, not serverless
  functions, for WebRTC token minting and file uploads).
- **Database** → swap SQLite for a hosted Postgres (Railway/Render/Neon all offer one) — with
  Prisma this is a one-line `datasource` change in `apps/server/prisma/schema.prisma`, no
  application code changes.
- **File uploads / frame captures** → move from local disk to object storage (S3 or Cloudflare
  R2), since most PaaS disks are ephemeral.
- **OPENAI_API_KEY** → set as a secret on the backend host, never committed.

## Manual verification checklist

- [ ] `npm install` at the repo root succeeds.
- [ ] `npm run dev` boots both apps without errors.
- [ ] Submitting the intake wizard with only a resume uploaded reaches the permissions screen (AC-1).
- [ ] The Start control on the permissions screen stays disabled until camera+mic are granted (AC-2).
- [ ] During an interview, the AI speaks at least one question and a transcript entry is persisted (AC-3).
- [ ] At least one frame capture lands under `apps/server/uploads/{sessionId}/` during a session (AC-4).
- [ ] The results page shows transcript + AI feedback sourced from that session's real data (AC-5).
