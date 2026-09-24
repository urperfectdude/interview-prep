export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

// BYOK: the user's OpenAI key lives only on this device and rides along on each API call.
const OPENAI_KEY_STORAGE = "openaiApiKey";
const OPENAI_KEY_CHANGE = "openai-key-change";

export function getOpenAIKey(): string {
  try {
    return localStorage.getItem(OPENAI_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setOpenAIKey(key: string): void {
  try {
    if (key) localStorage.setItem(OPENAI_KEY_STORAGE, key);
    else localStorage.removeItem(OPENAI_KEY_STORAGE);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(OPENAI_KEY_CHANGE));
}

export function onOpenAIKeyChange(listener: () => void): () => void {
  window.addEventListener(OPENAI_KEY_CHANGE, listener);
  return () => window.removeEventListener(OPENAI_KEY_CHANGE, listener);
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const openaiKey = typeof window !== "undefined" ? getOpenAIKey() : "";
  if (openaiKey) headers.set("X-OpenAI-Key", openaiKey);
  return fetch(apiUrl(path), { ...init, headers, credentials: "include" });
}
