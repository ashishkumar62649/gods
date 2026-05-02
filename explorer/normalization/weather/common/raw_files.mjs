import { readFile } from "node:fs/promises";
import { extname, isAbsolute, join, relative } from "node:path";
import { EXPLORER_ROOT } from "./paths.mjs";

export function safeJsonParse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export function toExplorerRelativePath(path) {
  if (!path) return null;
  return isAbsolute(path) ? relative(EXPLORER_ROOT, path) : path;
}

export function toAbsoluteExplorerPath(path) {
  if (!path) return null;
  return isAbsolute(path) ? path : join(EXPLORER_ROOT, path);
}

export function fileExtension(path) {
  const ext = extname(path || "").replace(/^\./, "").toLowerCase();
  return ext || null;
}

