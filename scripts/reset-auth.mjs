import Database from "better-sqlite3";
import path from "node:path";

if (!process.argv.includes("--yes")) {
  console.error("This signs out every device and returns ClipHouse to first-run setup.");
  console.error("Run again with --yes to continue.");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL || "file:./data/cliphouse.db";
if (!databaseUrl.startsWith("file:")) throw new Error("Auth reset currently supports SQLite file databases only.");
const rawPath = databaseUrl.slice("file:".length).replace(/^\.\//, "");
const databasePath = path.isAbsolute(rawPath) ? rawPath : path.resolve(rawPath);
const database = new Database(databasePath);

database.transaction(() => {
  database.prepare('DELETE FROM "Session"').run();
  database.prepare('DELETE FROM "Owner"').run();
})();
database.close();

console.log("Authentication reset. Restart ClipHouse and use the setup link from its logs.");
