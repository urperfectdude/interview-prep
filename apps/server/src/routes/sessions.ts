import { Router } from "express";
import multer from "multer";
import type { CandidateProfile, QuestionPlan, SessionDTO, SessionListItemDTO, SessionSummary } from "@interview-prep/shared";
import { prisma } from "../lib/prisma.js";
import { extractTextFromFile, extractTextFromUrl } from "../lib/extractText.js";
import { generateCandidateProfileAndPlan } from "../lib/interviewPlanning.js";

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
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "jdFile", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
      const resumeFile = files?.resume?.[0];
      const jdFile = files?.jdFile?.[0];
      const { jdLink, roleDescription } = req.body as { jdLink?: string; roleDescription?: string };

      if (!resumeFile) {
        return res.status(400).json({ error: "Resume file is required." });
      }

      const resumeText = await extractTextFromFile(resumeFile.buffer, resumeFile.originalname);

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

      const roleDescriptionRaw = roleDescription ?? "";

      const { candidateProfile, questionPlan } = await generateCandidateProfileAndPlan({
        resumeText,
        jdText,
        roleDescriptionRaw,
      });

      const session = await prisma.session.create({
        data: {
          status: "ready",
          roleTitle: candidateProfile.roleTitle,
          roleDescriptionRaw,
          jdText,
          resumeText,
          candidateProfile: JSON.stringify(candidateProfile),
          questionPlan: JSON.stringify(questionPlan),
        },
      });

      res.status(201).json({ sessionId: session.id });
    } catch (err) {
      console.error("Failed to create session:", err);
      res.status(500).json({ error: "Failed to create session." });
    }
  }
);

sessionsRouter.get("/", async (_req, res) => {
  const sessions = await prisma.session.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const dto: SessionListItemDTO[] = sessions.map((session) => {
    const summary = session.summary ? (JSON.parse(session.summary) as SessionSummary) : null;
    return {
      id: session.id,
      roleTitle: session.roleTitle,
      status: session.status as SessionListItemDTO["status"],
      createdAt: session.createdAt.toISOString(),
      overallScore: summary?.overallScore ?? null,
    };
  });

  res.json(dto);
});

sessionsRouter.get("/:id", async (req, res) => {
  const session = await prisma.session.findUnique({ where: { id: req.params.id } });
  if (!session) {
    return res.status(404).json({ error: "Session not found." });
  }
  res.json(toSessionDTO(session));
});
