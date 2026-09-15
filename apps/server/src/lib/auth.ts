import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextFunction, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { env } from "./env.js";
import { prisma } from "./prisma.js";

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, keyLength: number) => Promise<Buffer>;

const COOKIE_NAME = "ip_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const KEY_LENGTH = 64;

const googleClient = new OAuth2Client();

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  const expected = Buffer.from(hashHex ?? "", "hex");
  if (!saltHex || expected.length !== KEY_LENGTH) return false;
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), KEY_LENGTH);
  return timingSafeEqual(actual, expected);
}

function sign(payload: string): string {
  return createHmac("sha256", env.sessionSecret).update(payload).digest("base64url");
}

export function setSessionCookie(res: Response, userId: string): void {
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

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
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

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const userId = readSessionUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Sign in required." });
  }
  res.locals.userId = userId;
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

export async function verifyGoogleCredential(credential: string) {
  const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.googleClientId });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || !payload.email_verified) {
    throw new Error("Google account has no verified email.");
  }
  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name ?? null,
    picture: payload.picture ?? null,
  };
}
