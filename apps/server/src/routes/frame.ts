import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma.js";

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

const SAFE_ID = /^[a-zA-Z0-9]+$/;

function rejectUnsafeId(req: Request, res: Response, next: NextFunction) {
  if (!SAFE_ID.test(req.params.id)) {
    return res.status(400).json({ error: "Invalid session id." });
  }
  next();
}

frameRouter.post("/:id/frame", rejectUnsafeId, upload.single("frame"), async (req, res) => {
  const session = await prisma.session.findUnique({ where: { id: req.params.id } });
  if (!session) {
    return res.status(404).json({ error: "Session not found." });
  }
  if (!req.file) {
    return res.status(400).json({ error: "frame file is required." });
  }

  const relativePath = path.relative(uploadsRoot, req.file.path);
  await prisma.frameCapture.create({
    data: { sessionId: session.id, filePath: relativePath },
  });

  res.status(201).json({ ok: true });
});
