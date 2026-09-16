import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma.js";
import { requireOwnedSession } from "../lib/auth.js";
import { generateFrameInsight } from "../lib/interviewPlanning.js";

export const frameRouter = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.resolve(__dirname, "../../uploads");

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const sessionDir = path.join(uploadsRoot, req.params.id);
    fs.mkdirSync(sessionDir, { recursive: true });
    cb(null, sessionDir);
  },
  filename: (_req, file, cb) => {
    const ext = file.mimetype === "image/png" ? "png" : "jpg";
    cb(null, `frame-${Date.now()}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG/PNG frame captures are accepted."));
    }
  },
});

// requireOwnedSession must run before multer: the upload directory is built from :id.
frameRouter.post("/:id/frame", requireOwnedSession, upload.single("frame"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "frame file is required." });
  }

  const relativePath = path.relative(uploadsRoot, req.file.path);
  const frame = await prisma.frameCapture.create({
    data: { sessionId: req.params.id, filePath: relativePath },
  });

  res.status(201).json({ ok: true });

  // Analyze each snapshot as it arrives so the interview isn't slowed and results don't wait on a batch.
  const { path: filePath, mimetype } = req.file;
  fs.promises
    .readFile(filePath)
    .then((buffer) => generateFrameInsight(buffer.toString("base64"), mimetype))
    .then((note) => prisma.frameCapture.update({ where: { id: frame.id }, data: { note } }))
    .catch((err) => console.warn("Failed to analyze frame (non-blocking):", err));
});

frameRouter.get("/:id/frames", requireOwnedSession, async (req, res) => {
  const frames = await prisma.frameCapture.findMany({
    where: { sessionId: req.params.id },
    orderBy: { capturedAt: "asc" },
  });

  res.json(
    frames.map((frame) => ({
      id: frame.id,
      capturedAt: frame.capturedAt.toISOString(),
      note: frame.note,
      imageUrl: `/api/sessions/${req.params.id}/frames/${frame.id}/image`,
    }))
  );
});

frameRouter.get("/:id/frames/:frameId/image", requireOwnedSession, async (req, res) => {
  const frame = await prisma.frameCapture.findFirst({
    where: { id: req.params.frameId, sessionId: req.params.id },
  });
  if (!frame) {
    return res.status(404).json({ error: "Frame not found." });
  }

  res.sendFile(path.join(uploadsRoot, frame.filePath));
});
