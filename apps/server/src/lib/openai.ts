import OpenAI from "openai";
import { env } from "./env.js";

export const openai = new OpenAI({ apiKey: env.openaiApiKey });

export const TEXT_MODEL = "gpt-4.1";
export const REALTIME_MODEL = "gpt-4o-realtime-preview";
