import { mkdir, rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { once } from "node:events";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";
import { createStreamingChecksum } from "./checksum.mjs";
import { extensionForContentType } from "./content_type_map.mjs";

const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const USER_AGENT = "GODS-Explorer-RawFetcher/0.1";

export class ResponseSizeLimitError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ResponseSizeLimitError";
    this.retryable = false;
    Object.assign(this, details);
  }
}

export class RetryableHttpError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "RetryableHttpError";
    this.retryable = true;
    Object.assign(this, details);
  }
}

function requestHeaders(feed) {
  return {
    accept: feed.accept || "application/geo+json, application/json, application/rss+xml, application/xml, text/xml, text/csv, application/octet-stream, */*",
    "accept-encoding": "identity",
    "user-agent": feed.userAgent || USER_AGENT,
    ...(feed.headers || {}),
  };
}

async function writeChunk(stream, chunk) {
  if (!stream.write(Buffer.from(chunk))) await once(stream, "drain");
}

async function closeStream(stream) {
  stream.end();
  await once(stream, "finish");
}

async function destroyStream(stream) {
  if (stream.destroyed) return;
  const closed = once(stream, "close").catch(() => {});
  stream.destroy();
  await closed;
}

function parseContentLength(response) {
  const value = response.headers.get("content-length");
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export async function downloadToTempFile(feed, tempFilePath) {
  const started = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), feed.timeoutMs);
  let stream = null;

  try {
    await mkdir(dirname(tempFilePath), { recursive: true });
    const response = await fetch(feed.requestUrl || feed.url, {
      signal: controller.signal,
      headers: requestHeaders(feed),
    });

    const contentType = response.headers.get("content-type") || "unknown";
    const contentLength = parseContentLength(response);
    if (contentLength !== null && contentLength > feed.expectedLimitBytes) {
      throw new ResponseSizeLimitError("response content-length exceeds expectedLimitBytes", {
        httpStatus: response.status,
        contentLength,
        expectedLimitBytes: feed.expectedLimitBytes,
        contentType,
      });
    }

    if (!response.ok && RETRYABLE_HTTP_STATUSES.has(response.status)) {
      throw new RetryableHttpError(`retryable HTTP status ${response.status}`, {
        httpStatus: response.status,
        httpStatusText: response.statusText,
        contentType,
      });
    }

    if (!response.body) throw new Error("response body is not readable");

    const checksum = createStreamingChecksum("sha256");
    const reader = response.body.getReader();
    stream = createWriteStream(tempFilePath, { flags: "wx" });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const totalBytes = checksum.update(value);
      if (totalBytes > feed.expectedLimitBytes) {
        controller.abort();
        throw new ResponseSizeLimitError("streamed response exceeded expectedLimitBytes", {
          httpStatus: response.status,
          contentLength: totalBytes,
          expectedLimitBytes: feed.expectedLimitBytes,
          contentType,
        });
      }
      await writeChunk(stream, value);
    }

    await closeStream(stream);
    stream = null;

    return {
      ok: response.ok,
      httpStatus: response.status,
      httpStatusText: response.statusText,
      contentType,
      contentLength,
      bytes: checksum.bytes,
      checksumSha256: checksum.digest("hex"),
      durationMs: Math.round(performance.now() - started),
      tempFilePath,
      extension: extensionForContentType(contentType, feed.extension),
    };
  } catch (error) {
    if (stream) await destroyStream(stream);
    await rm(tempFilePath, { force: true }).catch(() => {});
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
