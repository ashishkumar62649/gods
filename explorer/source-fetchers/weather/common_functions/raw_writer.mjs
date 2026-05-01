import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { findDuplicateMetadata } from "./duplicate_detector.mjs";
import { appendFetchLog } from "./fetch_log.mjs";
import { normalizeExtension } from "./names.mjs";
import { metadataPathForRaw, outputDir, outputPath } from "./paths.mjs";
import { detectFileShape } from "./shape_detector.mjs";

function finalExtension(feed, download) {
  if (feed.extension && feed.extension !== "raw") return normalizeExtension(feed.extension);
  return normalizeExtension(download.extension || "raw");
}

export async function finalizeRawDownload(feed, download, fetchedAt = new Date(), extras = {}) {
  const directory = outputDir(feed, fetchedAt);
  await mkdir(directory, { recursive: true });

  const duplicate = await findDuplicateMetadata(directory, feed.endpoint, download.checksumSha256);
  if (duplicate) {
    await rm(download.tempFilePath, { force: true }).catch(() => {});
    const entry = {
      source: feed.source,
      folder: feed.folder,
      dataType: feed.dataType,
      expected: feed.expected,
      expectedFormat: feed.expectedFormat,
      endpoint: feed.endpoint,
      fetchedAt: fetchedAt.toISOString(),
      status: "duplicate",
      httpStatus: download.httpStatus,
      contentType: download.contentType,
      checksumSha256: download.checksumSha256,
      existingFilePath: duplicate.rawFilePath,
      bytes: download.bytes,
      durationMs: download.durationMs,
      retryCount: extras.retryCount || 0,
      rateLimitUsed: extras.rateLimitUsed,
    };
    await appendFetchLog(entry);
    return entry;
  }

  const rawFilePath = outputPath(feed, fetchedAt, finalExtension(feed, download));
  const metadataPath = metadataPathForRaw(rawFilePath);
  const metadataTempPath = `${metadataPath}.part-${process.pid}`;
  const sampleShape = await detectFileShape(download.tempFilePath, {
    contentType: download.contentType,
    bytes: download.bytes,
    expectedFormat: feed.expectedFormat,
  });

  const metadata = {
    source: feed.source,
    folder: feed.folder,
    dataType: feed.dataType,
    expected: feed.expected,
    expectedFormat: feed.expectedFormat,
    endpoint: feed.endpoint,
    fetchedAt: fetchedAt.toISOString(),
    status: download.ok ? "success" : "http_error",
    httpStatus: download.httpStatus,
    httpStatusText: download.httpStatusText,
    contentType: download.contentType,
    contentLength: download.contentLength,
    bytes: download.bytes,
    expectedLimitBytes: feed.expectedLimitBytes,
    checksumSha256: download.checksumSha256,
    durationMs: download.durationMs,
    retryCount: extras.retryCount || 0,
    rateLimitUsed: extras.rateLimitUsed,
    tempFileUsed: download.tempFilePath,
    rawFilePath,
    metadataPath,
    sampleShape,
  };

  await mkdir(dirname(rawFilePath), { recursive: true });
  await writeFile(metadataTempPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  await rename(download.tempFilePath, rawFilePath);
  await rename(metadataTempPath, metadataPath);
  await appendFetchLog(metadata);
  return metadata;
}