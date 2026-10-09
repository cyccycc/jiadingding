import fs from "node:fs";
import path from "node:path";

export function resolveDatabaseUrl(
  raw = process.env.DATABASE_URL || "file:./data/jiadingding.db",
) {
  if (!raw.startsWith("file:")) return raw;
  const filePath = raw.slice("file:".length);
  if (filePath === ":memory:" || filePath.startsWith(":memory:")) return raw;
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(/*turbopackIgnore: true*/ process.cwd(), filePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  return `file:${absolute}`;
}
