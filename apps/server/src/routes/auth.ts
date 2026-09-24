import { Router } from "express";
import multer from "multer";
import type { User } from "@prisma/client";
import { INTERVIEWER_VOICES, type InterviewerVoice, type UserDTO } from "@interview-prep/shared";
import { prisma } from "../lib/prisma.js";
import { extractTextFromFile } from "../lib/extractText.js";
import { requireUser } from "../lib/auth.js";

export const authRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function toUserDTO(user: User): UserDTO {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    resumeFileName: user.resumeFileName,
    targetRole: user.targetRole,
    seniority: user.seniority,
    interviewerVoice: user.interviewerVoice as InterviewerVoice,
  };
}

authRouter.get("/me", requireUser, async (_req, res) => {
  res.json(toUserDTO(await prisma.user.findUniqueOrThrow({ where: { id: res.locals.userId } })));
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
