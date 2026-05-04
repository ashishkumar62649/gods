import { readFile } from "node:fs/promises";
import { EXPLORER_ROOT } from "./paths.mjs";
import { join } from "node:path";

function unquote(value) {
  const trimmed = String(value || "").trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export async function loadDotEnv(envPath = join(EXPLORER_ROOT, ".env")) {
  let text = "";
  try {
    text = await readFile(envPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return { loaded: false, envPath, keys: [] };
    throw error;
  }

  const keys = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = rawLine.indexOf("=");
    const key = rawLine.slice(0, index).trim();
    const value = unquote(rawLine.slice(index + 1));
    if (!key || process.env[key]) continue;
    process.env[key] = value;
    keys.push(key);
  }

  return { loaded: true, envPath, keys };
}

export async function ensureDotEnvLoaded() {
  if (process.env.RAW_FETCH_DOTENV_LOADED === "1") return;
  await loadDotEnv();
  process.env.RAW_FETCH_DOTENV_LOADED = "1";
}

export function envValue(name, fallback = "") {
  return process.env[name] || fallback;
}

export function hasEnvValue(name) {
  return Boolean(process.env[name]);
}
