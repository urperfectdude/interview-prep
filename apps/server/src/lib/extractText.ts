import { lookup } from "node:dns/promises";
import * as cheerio from "cheerio";

function isPrivateOrReservedIPv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateOrReservedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80");
}

async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http/https JD links are supported.");
  }

  const { address, family } = await lookup(url.hostname);
  const isPrivate = family === 4 ? isPrivateOrReservedIPv4(address) : isPrivateOrReservedIPv6(address);
  if (isPrivate) {
    throw new Error("This JD link resolves to a non-public address and cannot be fetched.");
  }

  return url;
}

export async function extractTextFromFile(buffer: Buffer, originalName: string): Promise<string> {
  const ext = originalName.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return result.text.trim();
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  return buffer.toString("utf-8").trim();
}

export async function extractTextFromUrl(rawUrl: string): Promise<string> {
  // ponytail: DNS is re-checked once here but not re-verified on the actual fetch,
  // so a DNS-rebinding attacker could still slip a private IP past this in principle.
  // Upgrade path: fetch via an http agent pinned to the looked-up address if this
  // ever handles untrusted links at higher stakes.
  const url = await assertPublicHttpUrl(rawUrl);

  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; InterviewPrepBot/1.0)" },
    signal: AbortSignal.timeout(10_000),
    redirect: "manual",
  });

  if (response.status >= 300 && response.status < 400) {
    throw new Error("JD link redirects are not followed for security reasons.");
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch JD link: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, noscript").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}
