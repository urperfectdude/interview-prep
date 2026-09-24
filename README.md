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
# then edit apps/server/.env: set SESSION_SECRET to the output of `openssl rand -hex 32`.
# No server OpenAI key: each user adds their own key in Settings (BYOK, stored only in their browser/app).

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
Run `npm run dev -w apps/desktop` to open the app window on that local UI (`apps/web` is the app's UI, not a website).

## How it works

1. **No sign-in** — the first API request creates an anonymous user and sets a long-lived httpOnly signed
   cookie; every session route only returns sessions owned by that user. Clearing cookies starts fresh.
1. **Intake** (`/new`) — a 3-step wizard: Welcome → Role & JD (JD file/link/free text, all optional)
   → Resume (mandatory unless one is saved in Settings). Submitting sends everything to the backend, which extracts text and
   makes one OpenAI call to build a candidate profile and a tailored question plan.
2. **Permissions** (`/session/[id]/permissions`) — requests camera/mic access with a live preview.
3. **Interview** (`/session/[id]/interview`) — connects directly from the browser to the OpenAI
   Realtime API over WebRTC using a short-lived ephemeral token minted by the backend (the real
   API key never reaches the browser). The AI asks questions from the plan, adapts follow-ups to
   your answers, and the conversation is transcribed live. A webcam frame is captured as soon as
   the interview starts, then again every 15–30s, for a soft, informational read on environment/posture — never a
   pass/fail signal.
4. **Results** (`/session/[id]/results`) — transcript plus categorized, timestamped AI feedback
   and a score breakdown, generated from the actual persisted transcript.
5. **Dashboard** (`/dashboard`) — history of past sessions with basic stats.
6. **Settings** (`/settings`) — your OpenAI API key (BYOK, kept on the device), a saved resume, default target role and
   seniority, and the interviewer voice.

## Known limitations (local MVP)

- No sign-in: the anonymous account lives in one browser/app cookie, so history doesn't follow you
  across devices and is lost if cookies are cleared.
- SQLite + local disk storage for uploads/frame captures — fine on the single VM (see "Deploying"
  below), but it can't scale past one server.
- `express@4` pulls in a moderate-severity `qs` advisory transitively; fixing it requires an
  Express 5 major upgrade, deferred for this MVP.

## Deploying

The app runs on a single free-tier Google Cloud **e2-micro** VM (us-central1, Ubuntu 24.04, 30 GB
standard disk) at `https://35-202-116-188.sslip.io`. SQLite (`apps/server/prisma/dev.db`) and
frame captures (`apps/server/uploads/`) stay on the VM disk. Caddy serves HTTPS and sends `/api/*`
to the Express server (port 4000) and everything else to Next.js (port 3000), so both share one
origin and the `SameSite=Lax` session cookie works. Both apps run as systemd services
(`interview-prep-server`, `interview-prep-web`).

- **First-time VM setup** (swap, Node 24, Caddy, clone, services):
  `gcloud compute ssh interview-prep --zone us-central1-a --command "sudo bash -s -- \$USER <site-host>" < deploy/setup-vm.sh`,
  then write `apps/server/.env` (with `CORS_ORIGIN` set to the site URL and a fresh `SESSION_SECRET`)
  and `apps/web/.env.local` (with `NEXT_PUBLIC_API_URL` set to the site URL) in `/opt/interview-prep`.
- **Redeploy** after pushing to `main`: `./deploy/deploy.sh` (pulls, installs, runs migrations, builds, restarts).
- **Logs**: `gcloud compute ssh interview-prep --zone us-central1-a --command "journalctl -u interview-prep-server -n 100"`.

## Manual verification checklist

- [ ] `npm install` at the repo root succeeds.
- [ ] `npm run dev` boots both apps without errors.
- [ ] Submitting the intake wizard with only a resume uploaded reaches the permissions screen (AC-1).
- [ ] The Start control on the permissions screen stays disabled until camera+mic are granted (AC-2).
- [ ] During an interview, the AI speaks at least one question and a transcript entry is persisted (AC-3).
- [ ] At least one frame capture lands under `apps/server/uploads/{sessionId}/` during a session (AC-4).
- [ ] The results page shows transcript + AI feedback sourced from that session's real data (AC-5).
- [ ] Signed out, session routes return 401; another user's session id returns 404 (AC-6).
- [ ] With a resume saved in Settings, the wizard completes without uploading one (AC-7).

## Desktop app (macOS / Windows)

`apps/desktop` is a Tauri v2 shell that opens the deployed site in a native window.

```bash
npm run build -w apps/desktop   # local build for this machine (.app/.dmg on macOS)
```

Release installers for both platforms: every push to `main` runs `.github/workflows/desktop.yml`, which builds a
universal `.dmg` and a Windows `-setup.exe`, versions them `0.1.<run number>`, and publishes them as the latest GitHub
Release. Stable download links always serve the newest build:
`https://github.com/urperfectdude/interview-prep/releases/latest/download/InterviewPrep-macOS.dmg` and
`.../InterviewPrep-Windows-setup.exe`.
