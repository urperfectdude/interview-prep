import { Router } from "express";
import type { TranscriptEntryDTO } from "@interview-prep/shared";
import { prisma } from "../lib/prisma.js";
import { requireOwnedSession } from "../lib/auth.js";

export const transcriptRouter = Router();

transcriptRouter.post("/:id/transcript", requireOwnedSession, async (req, res) => {
  const { role, text } = req.body as { role?: string; text?: string };

  if (role !== "assistant" && role !== "user") {
    return res.status(400).json({ error: "role must be 'assistant' or 'user'." });
  }
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "text is required." });
  }

  const entry = await prisma.transcriptEntry.create({
    data: { sessionId: req.params.id, role, text: text.trim() },
  });

  const dto: TranscriptEntryDTO = {
    id: entry.id,
    role: entry.role as TranscriptEntryDTO["role"],
    text: entry.text,
    createdAt: entry.createdAt.toISOString(),
  };
  res.status(201).json(dto);
});

transcriptRouter.get("/:id/transcript", requireOwnedSession, async (req, res) => {
  const entries = await prisma.transcriptEntry.findMany({
    where: { sessionId: req.params.id },
    orderBy: { createdAt: "asc" },
  });

  const dto: TranscriptEntryDTO[] = entries.map((entry) => ({
    id: entry.id,
    role: entry.role as TranscriptEntryDTO["role"],
    text: entry.text,
    createdAt: entry.createdAt.toISOString(),
  }));
  res.json(dto);
});
