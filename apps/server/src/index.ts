import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { env } from "./lib/env.js";
import { requireUser } from "./lib/auth.js";
import { authRouter } from "./routes/auth.js";
import { sessionsRouter } from "./routes/sessions.js";
import { realtimeTokenRouter } from "./routes/realtimeToken.js";
import { transcriptRouter } from "./routes/transcript.js";
import { frameRouter } from "./routes/frame.js";
import { completeRouter } from "./routes/complete.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.resolve(__dirname, "../uploads");
fs.mkdirSync(uploadsRoot, { recursive: true });

const app = express();
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", authRouter);
app.use("/api/sessions", requireUser);
app.use("/api/sessions", sessionsRouter);
app.use("/api/sessions", realtimeTokenRouter);
app.use("/api/sessions", transcriptRouter);
app.use("/api/sessions", frameRouter);
app.use("/api/sessions", completeRouter);

app.listen(env.port, () => {
  console.log(`interview-prep server listening on http://localhost:${env.port}`);
});
