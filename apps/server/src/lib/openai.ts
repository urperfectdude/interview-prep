import OpenAI from "openai";
import type { NextFunction, Request, Response } from "express";

export const TEXT_MODEL = "gpt-4.1";
export const REALTIME_MODEL = "gpt-realtime";

// BYOK: each request carries the user's own OpenAI key; the server never stores it.
export const OPENAI_KEY_HEADER = "x-openai-key";

export function openaiClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}

export function requireOpenAIKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.get(OPENAI_KEY_HEADER)?.trim();
  if (!apiKey) {
    return res.status(400).json({ error: "Add your OpenAI API key in Settings to continue." });
  }
  res.locals.openaiKey = apiKey;
  next();
}

export function isKeyRejected(err: unknown): boolean {
  return (err as { status?: number } | null)?.status === 401;
}

export const KEY_REJECTED_MESSAGE = "OpenAI rejected your API key. Check it in Settings.";
