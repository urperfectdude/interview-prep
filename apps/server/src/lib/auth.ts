import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "./env.js";
import { prisma } from "./prisma.js";

const COOKIE_NAME = "ip_session";
// ponytail: this cookie is the only identity. Clearing it starts a new empty history.
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 400;

function sign(payload: string): string {
  return createHmac("sha256", env.sessionSecret).update(payload).digest("base64url");
}

function setSessionCookie(res: Response, userId: string): void {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${userId}.${expiresAt}`;
  res.cookie(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: "/",
  });
}

function readSessionUserId(req: Request): string | null {
  const raw = (req.headers.cookie ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  if (!raw) return null;

  const signatureStart = raw.lastIndexOf(".");
  const payload = raw.slice(0, signatureStart);
  const signature = Buffer.from(raw.slice(signatureStart + 1));
  const expected = Buffer.from(sign(payload));
  if (signatureStart < 1 || signature.length !== expected.length || !timingSafeEqual(signature, expected)) {
    return null;
  }

  const [userId, expiresAt] = payload.split(".");
  return userId && Number(expiresAt) * 1000 > Date.now() ? userId : null;
}

// Every visitor gets an anonymous account on first request, remembered by the signed cookie.
// ponytail: parallel first requests can each create a guest; the extra rows stay empty. Dedupe if they pile up.
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const cookieUserId = readSessionUserId(req);
  const existing = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId }, select: { id: true } }) : null;
  if (existing) {
    res.locals.userId = existing.id;
    return next();
  }

  const guest = await prisma.user.create({ data: { email: `${randomUUID()}@guest.invalid`, name: "Guest" } });
  setSessionCookie(res, guest.id);
  res.locals.userId = guest.id;
  next();
}

export async function requireOwnedSession(req: Request, res: Response, next: NextFunction) {
  const userId: string | undefined = res.locals.userId;
  const session = userId ? await prisma.session.findFirst({ where: { id: req.params.id, userId } }) : null;
  if (!session) {
    return res.status(404).json({ error: "Session not found." });
  }
  res.locals.session = session;
  next();
}
