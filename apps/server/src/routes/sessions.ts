import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import type { CandidateProfile, QuestionPlan, SessionDTO, SessionListItemDTO, SessionSummary } from "@interview-prep/shared";
import { prisma } from "../lib/prisma.js";
import { requireOwnedSession } from "../lib/auth.js";
import { extractTextFromFile, extractTextFromUrl } from "../lib/extractText.js";
import { generateCandidateProfileAndPlan } from "../lib/interviewPlanning.js";
import { isKeyRejected, KEY_REJECTED_MESSAGE, requireOpenAIKey } from "../lib/openai.js";
import { uploadsRoot } from "./frame.js";

export const sessionsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function toSessionDTO(session: {
  id: string;
  status: string;
  roleTitle: string | null;
  createdAt: Date;
  candidateProfile: string | null;
  questionPlan: string | null;
}): SessionDTO {
  return {
    id: session.id,
    status: session.status as SessionDTO["status"],
    roleTitle: session.roleTitle,
    createdAt: session.createdAt.toISOString(),
    candidateProfile: session.candidateProfile ? (JSON.parse(session.candidateProfile) as CandidateProfile) : null,
    questionPlan: session.questionPlan ? (JSON.parse(session.questionPlan) as QuestionPlan) : null,
  };
}

sessionsRouter.post(
  "/",
  requireOpenAIKey,
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "jdFile", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: res.locals.userId } });
      if (!user) {
        return res.status(500).json({ error: "Couldn't start the interview." });
      }

      const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
      const resumeFile = files?.resume?.[0];
      const jdFile = files?.jdFile?.[0];
      const { jdLink, roleDescription } = req.body as { jdLink?: string; roleDescription?: string };

      const resumeText = resumeFile
        ? await extractTextFromFile(resumeFile.buffer, resumeFile.originalname)
        : user.resumeText;
      if (!resumeText) {
        return res.status(400).json({ error: "Upload a resume, or save one in Settings." });
      }

      let jdText = "";
      if (jdFile) {
        jdText += await extractTextFromFile(jdFile.buffer, jdFile.originalname);
      }
      if (jdLink) {
        try {
          const linkText = await extractTextFromUrl(jdLink);
          jdText = jdText ? `${jdText}\n\n${linkText}` : linkText;
        } catch (err) {
          console.warn("Failed to extract JD link text:", err);
        }
      }

      const roleDescriptionRaw =
        roleDescription?.trim() || [user.seniority, user.targetRole].filter(Boolean).join(" ");

      const { candidateProfile, questionPlan } = await generateCandidateProfileAndPlan(res.locals.openaiKey, {
        resumeText,
        jdText,
        roleDescriptionRaw,
      });

      const session = await prisma.session.create({
        data: {
          userId: user.id,
          status: "ready",
          roleTitle: candidateProfile.roleTitle,
          roleDescriptionRaw,
          jdText,
          resumeText,
          candidateProfile: JSON.stringify(candidateProfile),
          questionPlan: JSON.stringify(questionPlan),
        },
      });

      if (resumeFile) {
        await prisma.user.update({
          where: { id: user.id },
          data: { resumeText, resumeFileName: resumeFile.originalname.slice(0, 200) },
        });
      }

      res.status(201).json({ sessionId: session.id });
    } catch (err) {
      console.error("Failed to create session:", err);
      if (isKeyRejected(err)) return res.status(400).json({ error: KEY_REJECTED_MESSAGE });
      res.status(500).json({ error: "Failed to create session." });
    }
  }
);

sessionsRouter.get("/", async (_req, res) => {
  const sessions = await prisma.session.findMany({
    where: { userId: res.locals.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const frames = await prisma.frameCapture.findMany({
    where: { sessionId: { in: sessions.map((s) => s.id) } },
    orderBy: { capturedAt: "asc" },
  });
  const firstFrameBySession = new Map<string, (typeof frames)[number]>();
  for (const frame of frames) {
    if (!firstFrameBySession.has(frame.sessionId)) firstFrameBySession.set(frame.sessionId, frame);
  }

  const dto: SessionListItemDTO[] = sessions.map((session) => {
    const summary = session.summary ? (JSON.parse(session.summary) as SessionSummary) : null;
    const firstFrame = firstFrameBySession.get(session.id);
    return {
      id: session.id,
      roleTitle: session.roleTitle,
      status: session.status as SessionListItemDTO["status"],
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      overallScore: summary?.overallScore ?? null,
      scoreBreakdown: summary?.scoreBreakdown ?? null,
      thumbnailUrl: firstFrame ? `/api/sessions/${session.id}/frames/${firstFrame.id}/image` : null,
    };
  });

  res.json(dto);
});

sessionsRouter.get("/:id", requireOwnedSession, (_req, res) => {
  res.json(toSessionDTO(res.locals.session));
});

sessionsRouter.delete("/:id", requireOwnedSession, async (req, res) => {
  // Transcript and frame rows cascade; the snapshot files live on disk under uploads/<id>.
  await prisma.session.delete({ where: { id: req.params.id } });
  await fs.promises.rm(path.join(uploadsRoot, req.params.id), { recursive: true, force: true });
  res.status(204).end();
});
