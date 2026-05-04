import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { FETCH_LOG_PATH } from "./paths.mjs";

export async function appendFetchLog(entry) {
  await mkdir(dirname(FETCH_LOG_PATH), { recursive: true });
  await appendFile(FETCH_LOG_PATH, `${JSON.stringify(entry)}\n`, "utf8");
}