import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import type { Session } from "@prisma/client";
import type { TranscriptEntryDTO } from "@interview-prep/shared";
import { prisma } from "../lib/prisma.js";
import { requireOwnedSession } from "../lib/auth.js";
import { generateSessionSummary, generateFrameInsight } from "../lib/interviewPlanning.js";

export const completeRouter = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.resolve(__dirname, "../../uploads");

async function generateLatestFrameInsight(sessionId: string): Promise<void> {
  const frame = await prisma.frameCapture.findFirst({
    where: { sessionId },
    orderBy: { capturedAt: "desc" },
  });
  if (!frame || frame.note) return;

  const buffer = await fs.readFile(path.join(uploadsRoot, frame.filePath));
  const mimeType = frame.filePath.endsWith(".png") ? "image/png" : "image/jpeg";
  const note = await generateFrameInsight(buffer.toString("base64"), mimeType);

  await prisma.frameCapture.update({ where: { id: frame.id }, data: { note } });
}

completeRouter.post("/:id/complete", requireOwnedSession, async (_req, res) => {
  const session = res.locals.session as Session;
  try {
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

    try {
      await generateLatestFrameInsight(session.id);
    } catch (err) {
      console.warn("Failed to generate frame insight (non-blocking):", err);
    }

    res.json(summary);
  } catch (err) {
    console.error("Failed to complete session:", err);
    res.status(500).json({ error: "Failed to complete session." });
  }
});

completeRouter.get("/:id/summary", requireOwnedSession, (_req, res) => {
  const session = res.locals.session as Session;
  if (!session.summary) {
    return res.status(404).json({ error: "Summary not generated yet." });
  }
  res.json(JSON.parse(session.summary));
});
