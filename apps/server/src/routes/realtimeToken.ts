import { Router } from "express";
import type { CandidateProfile, QuestionPlan } from "@interview-prep/shared";
import { prisma } from "../lib/prisma.js";
import { buildInterviewerInstructions, createRealtimeEphemeralSession } from "../lib/realtime.js";
import { REALTIME_MODEL } from "../lib/openai.js";

export const realtimeTokenRouter = Router();

realtimeTokenRouter.post("/:id/realtime-token", async (req, res) => {
  try {
    const session = await prisma.session.findUnique({ where: { id: req.params.id } });
    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }
    if (!session.candidateProfile || !session.questionPlan) {
      return res.status(400).json({ error: "Session has no question plan yet." });
    }

    const profile = JSON.parse(session.candidateProfile) as CandidateProfile;
    const plan = JSON.parse(session.questionPlan) as QuestionPlan;
    const instructions = buildInterviewerInstructions(profile, plan);

    const realtimeSession = await createRealtimeEphemeralSession(instructions);

    await prisma.session.update({
      where: { id: session.id },
      data: { status: "in_progress" },
    });

    res.json({
      clientSecret: realtimeSession.client_secret.value,
      expiresAt: realtimeSession.client_secret.expires_at,
      model: REALTIME_MODEL,
      openingQuestion: plan.openingQuestion,
    });
  } catch (err) {
    console.error("Failed to mint realtime token:", err);
    res.status(500).json({ error: "Failed to start interview session." });
  }
});
