import { readFile } from "node:fs/promises";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";

export async function setupTokenMatches(candidate: string) {
  const expected = await readSetupToken();
  if (!candidate || !expected) return false;

  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
}

async function readSetupToken() {
  if (process.env.CLIPHOUSE_SETUP_TOKEN) return process.env.CLIPHOUSE_SETUP_TOKEN.trim();

  const tokenPath = process.env.CLIPHOUSE_SETUP_TOKEN_FILE
    ? path.resolve(process.env.CLIPHOUSE_SETUP_TOKEN_FILE)
    : path.join(process.cwd(), "data", "setup-token");

  try {
    return (await readFile(tokenPath, "utf8")).trim();
  } catch {
    return "";
  }
}
