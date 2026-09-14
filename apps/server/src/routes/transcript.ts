import { Router } from "express";
import type { TranscriptEntryDTO } from "@interview-prep/shared";
import { prisma } from "../lib/prisma.js";

export const transcriptRouter = Router();

transcriptRouter.post("/:id/transcript", async (req, res) => {
  const { role, text } = req.body as { role?: string; text?: string };

  if (role !== "assistant" && role !== "user") {
    return res.status(400).json({ error: "role must be 'assistant' or 'user'." });
  }
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "text is required." });
  }

  const session = await prisma.session.findUnique({ where: { id: req.params.id } });
  if (!session) {
    return res.status(404).json({ error: "Session not found." });
  }

  const entry = await prisma.transcriptEntry.create({
    data: { sessionId: session.id, role, text: text.trim() },
  });

  const dto: TranscriptEntryDTO = {
    id: entry.id,
    role: entry.role as TranscriptEntryDTO["role"],
    text: entry.text,
    createdAt: entry.createdAt.toISOString(),
  };
  res.status(201).json(dto);
});

transcriptRouter.get("/:id/transcript", async (req, res) => {
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
