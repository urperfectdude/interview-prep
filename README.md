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
- Optional: a Google OAuth Client ID for "Continue with Google" (email + password sign-in works without it)

## Setup

```bash
npm install

# Backend env
cp apps/server/.env.example apps/server/.env
# then edit apps/server/.env: set OPENAI_API_KEY to a real key and
# SESSION_SECRET to the output of `openssl rand -hex 32`

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
Open `http://localhost:3000`, sign in (or create an email account), and start the intake wizard.

## Google sign-in (optional)

1. In [Google Cloud Console](https://console.cloud.google.com), open **Google Auth Platform**, set
   the app name and support email under **Branding**, and add yourself as a test user under **Audience**.
2. Under **Clients**, create a **Web application** client. Add `http://localhost` and
   `http://localhost:3000` to **Authorized JavaScript origins**. No redirect URI or client secret is needed.
3. Put the Client ID in both `GOOGLE_CLIENT_ID` (`apps/server/.env`) and
   `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (`apps/web/.env.local`), then restart `npm run dev`.

## How it works

0. **Landing** (`/`) — a public page describing the product, linking to sign-in and a new interview.
1. **Sign in** (`/login`) — Google, or an email + password account. The backend sets an httpOnly
   signed cookie, and every session route only returns sessions owned by the signed-in user.
1. **Intake** (`/new`) — a 3-step wizard: Welcome → Role & JD (JD file/link/free text, all optional)
   → Resume (mandatory unless one is saved in Settings). Submitting sends everything to the backend, which extracts text and
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
6. **Settings** (`/settings`) — profile and sign out, a saved resume, default target role and
   seniority, and the interviewer voice.

## Known limitations (local MVP)

- Email accounts have no email verification, password reset, or login rate limiting. Add those
  before exposing the app beyond localhost.
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
- **Google sign-in**: add the site URL to the OAuth client's Authorized JavaScript origins.

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
- [ ] With no Google config, an email account can be created and used; a wrong password returns 401 (AC-8).
