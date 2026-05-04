import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export async function findDuplicateMetadata(directory, endpoint, checksumSha256) {
  try {
    const names = await readdir(directory);
    for (const name of names) {
      if (!name.endsWith(".metadata.json")) continue;
      try {
        const metadata = JSON.parse(await readFile(join(directory, name), "utf8"));
        if (metadata.endpoint === endpoint && metadata.checksumSha256 === checksumSha256 && metadata.status === "success") {
          return metadata;
        }
      } catch {
        // Ignore malformed sidecars; the current run remains fully logged.
      }
    }
  } catch {
    return null;
  }
  return null;
}