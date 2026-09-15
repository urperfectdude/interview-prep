import { Router } from "express";
import type { Session } from "@prisma/client";
import type { CandidateProfile, QuestionPlan } from "@interview-prep/shared";
import { prisma } from "../lib/prisma.js";
import { requireOwnedSession } from "../lib/auth.js";
import { buildInterviewerInstructions, createRealtimeEphemeralSession } from "../lib/realtime.js";
import { REALTIME_MODEL } from "../lib/openai.js";

export const realtimeTokenRouter = Router();

realtimeTokenRouter.post("/:id/realtime-token", requireOwnedSession, async (_req, res) => {
  const session = res.locals.session as Session;
  if (!session.candidateProfile || !session.questionPlan) {
    return res.status(400).json({ error: "Session has no question plan yet." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: res.locals.userId } });
    const profile = JSON.parse(session.candidateProfile) as CandidateProfile;
    const plan = JSON.parse(session.questionPlan) as QuestionPlan;
    const instructions = buildInterviewerInstructions(profile, plan);

    const realtimeSession = await createRealtimeEphemeralSession(instructions, user?.interviewerVoice ?? "alloy");

    await prisma.session.update({
      where: { id: session.id },
      data: { status: "in_progress" },
    });

    res.json({
      clientSecret: realtimeSession.value,
      expiresAt: realtimeSession.expires_at,
      model: REALTIME_MODEL,
      openingQuestion: plan.openingQuestion,
    });
  } catch (err) {
    console.error("Failed to mint realtime token:", err);
    res.status(500).json({ error: "Failed to start interview session." });
  }
});
