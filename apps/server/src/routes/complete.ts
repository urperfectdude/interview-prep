import { Router } from "express";
import type { TranscriptEntryDTO } from "@interview-prep/shared";
import { prisma } from "../lib/prisma.js";
import { generateSessionSummary } from "../lib/interviewPlanning.js";

export const completeRouter = Router();

completeRouter.post("/:id/complete", async (req, res) => {
  try {
    const session = await prisma.session.findUnique({ where: { id: req.params.id } });
    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }

    const entries = await prisma.transcriptEntry.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" },
    });

    const transcript: TranscriptEntryDTO[] = entries.map((entry) => ({
      id: entry.id,
      role: entry.role as TranscriptEntryDTO["role"],
      text: entry.text,
      createdAt: entry.createdAt.toISOString(),
    }));

    const summary = await generateSessionSummary(transcript, session.roleTitle);

    await prisma.session.update({
      where: { id: session.id },
      data: { status: "completed", summary: JSON.stringify(summary) },
    });

    res.json(summary);
  } catch (err) {
    console.error("Failed to complete session:", err);
    res.status(500).json({ error: "Failed to complete session." });
  }
});

completeRouter.get("/:id/summary", async (req, res) => {
  const session = await prisma.session.findUnique({ where: { id: req.params.id } });
  if (!session) {
    return res.status(404).json({ error: "Session not found." });
  }
  if (!session.summary) {
    return res.status(404).json({ error: "Summary not generated yet." });
  }
  res.json(JSON.parse(session.summary));
});
