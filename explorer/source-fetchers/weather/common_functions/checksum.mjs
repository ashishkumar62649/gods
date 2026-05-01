import { createHash } from "node:crypto";

export function createStreamingChecksum(algorithm = "sha256") {
  const hash = createHash(algorithm);
  let bytes = 0;
  return {
    update(chunk) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      hash.update(buffer);
      return bytes;
    },
    digest(encoding = "hex") {
      return hash.digest(encoding);
    },
    get bytes() {
      return bytes;
    },
  };
}

export function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}