import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function writeJsonl(filePath, records) {
  await mkdir(dirname(filePath), { recursive: true });
  const text = records.map((record) => JSON.stringify(record)).join("\n");
  await writeFile(filePath, records.length > 0 ? `${text}\n` : "", "utf8");
}
