import { assertFeedConfig, validateFeedConfig } from "./config_validator.mjs";
import { downloadToTempFile } from "./http_client.mjs";
import { tempOutputPath } from "./paths.mjs";
import { applyRateLimit } from "./rate_limiter.mjs";
import { runWithRetry } from "./retry_policy.mjs";
import { saveFailure } from "./failure_writer.mjs";
import { finalizeRawDownload } from "./raw_writer.mjs";

function feedForFailure(feedConfig, validationResult) {
  return validationResult?.feed || {
    source: feedConfig?.source,
    folder: feedConfig?.folder,
    dataType: feedConfig?.dataType,
    url: feedConfig?.url || feedConfig?.endpoint,
    endpoint: feedConfig?.endpoint || feedConfig?.url,
    expected: feedConfig?.expected,
    expectedFormat: feedConfig?.expectedFormat || feedConfig?.extension,
    expectedLimitBytes: feedConfig?.expectedLimitBytes,
  };
}

export async function runFeed(feedConfig) {
  const validation = validateFeedConfig(feedConfig);
  if (!validation.ok) {
    const error = new Error(`Invalid feed config: ${validation.errors.join("; ")}`);
    error.name = "FeedConfigError";
    error.validationErrors = validation.errors;
    return saveFailure(feedForFailure(feedConfig, validation), error, new Date());
  }

  const feed = assertFeedConfig(feedConfig);
  try {
    const { result } = await runWithRetry(feed, async ({ attempt, retryCount }) => {
      const fetchedAt = new Date();
      const rateLimit = await applyRateLimit(feed);
      const tempFilePath = tempOutputPath(feed, fetchedAt);
      const download = await downloadToTempFile(feed, tempFilePath);
      return finalizeRawDownload(feed, download, fetchedAt, {
        retryCount,
        rateLimitUsed: rateLimit,
        attempt,
      });
    });
    return result;
  } catch (error) {
    return saveFailure(feed, error, new Date(), { retryCount: error?.retryCount || 0 });
  }
}

export async function runFeedList(feeds, options = {}) {
  const results = [];
  for (const feedConfig of feeds) {
    const result = await runFeed(feedConfig);
    results.push(result);
    if (typeof options.afterFeed === "function") {
      const extra = await options.afterFeed({ feedConfig, result, runFeed });
      if (Array.isArray(extra)) results.push(...extra);
      else if (extra) results.push(extra);
    }
  }
  return results;
}