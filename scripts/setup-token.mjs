import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const tokenPath = path.resolve(process.env.CLIPHOUSE_SETUP_TOKEN_FILE || "data/setup-token");
await mkdir(path.dirname(tokenPath), { recursive: true });

let token;
try {
  token = (await readFile(tokenPath, "utf8")).trim();
} catch {
  token = randomBytes(24).toString("hex");
  await writeFile(tokenPath, `${token}\n`, { mode: 0o600 });
}
await chmod(tokenPath, 0o600);

const publicUrl = (process.env.CLIPHOUSE_PUBLIC_URL || "http://localhost:3000").replace(/\/$/, "");
console.log(`ClipHouse setup link: ${publicUrl}/setup?token=${token}`);
