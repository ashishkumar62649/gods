import { sleep } from "./time.mjs";

const lastRunByKey = new Map();

function keyForFeed(feed) {
  return `${feed.source}:${feed.folder}:${feed.dataType}:${feed.endpoint || feed.url}`;
}

export async function applyRateLimit(feed) {
  const rateLimitPerMin = Number(feed.rateLimitPerMin || 0);
  if (!Number.isFinite(rateLimitPerMin) || rateLimitPerMin <= 0) {
    return { rateLimitPerMin: 0, waitedMs: 0 };
  }

  const key = keyForFeed(feed);
  const intervalMs = Math.ceil(60000 / rateLimitPerMin);
  const now = Date.now();
  const lastRun = lastRunByKey.get(key) || 0;
  const waitMs = Math.max(0, lastRun + intervalMs - now);
  if (waitMs > 0) await sleep(waitMs);
  lastRunByKey.set(key, Date.now());
  return { rateLimitPerMin, waitedMs: waitMs };
}