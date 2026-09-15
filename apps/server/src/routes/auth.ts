import { Router } from "express";
import multer from "multer";
import type { User } from "@prisma/client";
import { INTERVIEWER_VOICES, type InterviewerVoice, type UserDTO } from "@interview-prep/shared";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { extractTextFromFile } from "../lib/extractText.js";
import {
  clearSessionCookie,
  hashPassword,
  requireUser,
  setSessionCookie,
  verifyGoogleCredential,
  verifyPassword,
} from "../lib/auth.js";

export const authRouter = Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function toUserDTO(user: User): UserDTO {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    googleLinked: user.googleSub !== null,
    resumeFileName: user.resumeFileName,
    targetRole: user.targetRole,
    seniority: user.seniority,
    interviewerVoice: user.interviewerVoice as InterviewerVoice,
  };
}

function readCredentials(body: unknown) {
  const { email, password } = (body ?? {}) as { email?: unknown; password?: unknown };
  return {
    email: typeof email === "string" ? email.trim().toLowerCase() : "",
    password: typeof password === "string" ? password : "",
  };
}

authRouter.post("/auth/signup", async (req, res) => {
  const { email, password } = readCredentials(req.body);
  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.` });
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    return res.status(409).json({ error: "An account with this email already exists. Sign in instead." });
  }

  const user = await prisma.user.create({ data: { email, passwordHash: await hashPassword(password) } });
  setSessionCookie(res, user.id);
  res.status(201).json(toUserDTO(user));
});

// ponytail: no rate limiting or lockout on password attempts; add both before exposing this beyond localhost.
authRouter.post("/auth/login", async (req, res) => {
  const { email, password } = readCredentials(req.body);
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }
  setSessionCookie(res, user.id);
  res.json(toUserDTO(user));
});

authRouter.post("/auth/google", async (req, res) => {
  if (!env.googleClientId) {
    return res.status(503).json({ error: "Google sign-in isn't configured on the server (GOOGLE_CLIENT_ID)." });
  }
  const { credential } = (req.body ?? {}) as { credential?: unknown };
  if (typeof credential !== "string") {
    return res.status(400).json({ error: "Missing Google credential." });
  }

  try {
    const profile = await verifyGoogleCredential(credential);
    const linked = await prisma.user.findUnique({ where: { googleSub: profile.sub } });
    const user = linked
      ? await prisma.user.update({
          where: { id: linked.id },
          data: { name: profile.name ?? undefined, picture: profile.picture ?? undefined },
        })
      : await prisma.user.upsert({
          where: { email: profile.email },
          // A verified Google email claims an unverified email/password account, so its password is dropped.
          update: {
            googleSub: profile.sub,
            passwordHash: null,
            name: profile.name ?? undefined,
            picture: profile.picture ?? undefined,
          },
          create: { email: profile.email, googleSub: profile.sub, name: profile.name, picture: profile.picture },
        });

    setSessionCookie(res, user.id);
    res.json(toUserDTO(user));
  } catch (err) {
    console.warn("Google sign-in failed:", err);
    res.status(401).json({ error: "Google sign-in failed. Please try again." });
  }
});

authRouter.post("/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get("/me", requireUser, async (_req, res) => {
  const user = await prisma.user.findUnique({ where: { id: res.locals.userId } });
  if (!user) {
    clearSessionCookie(res);
    return res.status(401).json({ error: "Sign in required." });
  }
  res.json(toUserDTO(user));
});

authRouter.patch("/me", requireUser, async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const text = (key: string) =>
    typeof body[key] === "string" ? (body[key] as string).trim().slice(0, 120) || null : undefined;
  const voice = body.interviewerVoice;
  if (voice !== undefined && !INTERVIEWER_VOICES.includes(voice as InterviewerVoice)) {
    return res.status(400).json({ error: "Unknown interviewer voice." });
  }

  const user = await prisma.user.update({
    where: { id: res.locals.userId },
    data: {
      name: text("name"),
      targetRole: text("targetRole"),
      seniority: text("seniority"),
      interviewerVoice: voice as InterviewerVoice | undefined,
    },
  });
  res.json(toUserDTO(user));
});

authRouter.post("/me/resume", requireUser, upload.single("resume"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Resume file is required." });
  }
  try {
    const resumeText = await extractTextFromFile(req.file.buffer, req.file.originalname);
    if (!resumeText) {
      return res.status(400).json({ error: "We couldn't read any text from that file." });
    }
    const user = await prisma.user.update({
      where: { id: res.locals.userId },
      data: { resumeText, resumeFileName: req.file.originalname.slice(0, 200) },
    });
    res.json(toUserDTO(user));
  } catch (err) {
    console.error("Failed to save resume:", err);
    res.status(400).json({ error: "We couldn't read that file. Try a PDF, DOCX, or TXT." });
  }
});

authRouter.delete("/me/resume", requireUser, async (_req, res) => {
  const user = await prisma.user.update({
    where: { id: res.locals.userId },
    data: { resumeText: null, resumeFileName: null },
  });
  res.json(toUserDTO(user));
});
