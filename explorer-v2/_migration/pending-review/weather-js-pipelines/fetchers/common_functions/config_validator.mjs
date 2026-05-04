import { normalizeExtension } from "./names.mjs";

const RETRY_POLICIES = new Set(["none", "linear", "exponential"]);
const DEFAULT_EXPECTED_LIMIT_BYTES = 50 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = Number(process.env.RAW_FETCH_TIMEOUT_MS || 30000);
const DEFAULT_RATE_LIMIT_PER_MIN = 60;

function asPositiveInteger(value, fallback, fieldName, errors) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    errors.push(`${fieldName} must be a positive number`);
    return fallback;
  }
  return Math.floor(number);
}

export function validateFeedConfig(feed) {
  const errors = [];
  if (!feed || typeof feed !== "object") {
    return { ok: false, errors: ["feed config must be an object"] };
  }

  const url = feed.url || feed.endpoint;
  for (const key of ["source", "folder", "dataType", "expected"]) {
    if (typeof feed[key] !== "string" || !feed[key].trim()) errors.push(`${key} is required`);
  }
  if (typeof url !== "string" || !url.trim()) errors.push("url or endpoint is required");
  else {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) errors.push("url must use http or https");
    } catch {
      errors.push("url must be a valid URL");
    }
  }
  if (feed.requestUrl !== undefined) {
    try {
      const parsed = new URL(feed.requestUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) errors.push("requestUrl must use http or https");
    } catch {
      errors.push("requestUrl must be a valid URL");
    }
  }

  const retryPolicy = feed.retryPolicy || "none";
  if (!RETRY_POLICIES.has(retryPolicy)) errors.push(`retryPolicy must be one of ${Array.from(RETRY_POLICIES).join(", ")}`);

  const forcedLimit = process.env.RAW_FETCH_FORCE_EXPECTED_LIMIT_BYTES;
  const expectedLimitBytes = asPositiveInteger(
    forcedLimit || feed.expectedLimitBytes,
    DEFAULT_EXPECTED_LIMIT_BYTES,
    "expectedLimitBytes",
    errors,
  );

  const normalized = {
    ...feed,
    url,
    endpoint: url,
    requestUrl: feed.requestUrl || url,
    extension: normalizeExtension(feed.extension || "raw"),
    expectedFormat: feed.expectedFormat || feed.extension || "raw",
    expectedLimitBytes,
    timeoutMs: asPositiveInteger(feed.timeoutMs, DEFAULT_TIMEOUT_MS, "timeoutMs", errors),
    rateLimitPerMin: asPositiveInteger(feed.rateLimitPerMin, DEFAULT_RATE_LIMIT_PER_MIN, "rateLimitPerMin", errors),
    retryPolicy,
    maxRetries: Math.max(0, asPositiveInteger(feed.maxRetries, retryPolicy === "none" ? 0 : 1, "maxRetries", errors)),
    retryBaseMs: asPositiveInteger(feed.retryBaseMs, 1000, "retryBaseMs", errors),
  };

  return { ok: errors.length === 0, errors, feed: normalized };
}

export function assertFeedConfig(feed) {
  const result = validateFeedConfig(feed);
  if (!result.ok) {
    const error = new Error(`Invalid feed config: ${result.errors.join("; ")}`);
    error.name = "FeedConfigError";
    error.validationErrors = result.errors;
    throw error;
  }
  return result.feed;
}
