import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { appendFetchLog } from "./fetch_log.mjs";
import { outputPath } from "./paths.mjs";

function safeFeed(feed = {}) {
  return {
    source: feed.source || "unknown_source",
    folder: feed.folder || "unknown_folder",
    dataType: feed.dataType || "unknown_datatype",
    url: feed.url || feed.endpoint || "unknown_endpoint",
    endpoint: feed.endpoint || feed.url || "unknown_endpoint",
    expected: feed.expected || "unknown expected payload",
    expectedFormat: feed.expectedFormat || feed.extension || "unknown",
    extension: "metadata.json",
  };
}

export async function saveFailure(feed, error, fetchedAt = new Date(), extras = {}) {
  const normalized = safeFeed(feed);
  const metadataPath = outputPath({ ...normalized, dataType: `${normalized.dataType}_error` }, fetchedAt, "metadata.json");
  await mkdir(dirname(metadataPath), { recursive: true });

  const metadata = {
    source: normalized.source,
    folder: normalized.folder,
    dataType: normalized.dataType,
    expected: normalized.expected,
    expectedFormat: normalized.expectedFormat,
    endpoint: normalized.endpoint,
    fetchedAt: fetchedAt.toISOString(),
    status: error?.name === "FeedConfigError" ? "config_error" : "failed",
    httpStatus: error?.httpStatus,
    httpStatusText: error?.httpStatusText,
    contentType: error?.contentType,
    contentLength: error?.contentLength,
    expectedLimitBytes: error?.expectedLimitBytes || feed?.expectedLimitBytes,
    retryCount: extras.retryCount ?? error?.retryCount ?? 0,
    rateLimitUsed: extras.rateLimitUsed,
    errorName: error?.name || "Error",
    errorMessage: error?.message || String(error),
    validationErrors: error?.validationErrors,
    metadataPath,
  };

  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  await appendFetchLog(metadata);
  return metadata;
}