import { sleep } from "./time.mjs";

function retryDelayMs(feed, attempt) {
  const base = Number(feed.retryBaseMs || 1000);
  const jitter = Math.floor(Math.random() * Number(feed.retryJitterMs || 250));
  if (feed.retryPolicy === "linear") return base * (attempt + 1) + jitter;
  if (feed.retryPolicy === "exponential") return base * 2 ** attempt + jitter;
  return 0;
}

export async function runWithRetry(feed, task) {
  const maxRetries = Number(feed.maxRetries || 0);
  let lastError = null;
  let finalAttempt = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    finalAttempt = attempt;
    try {
      const result = await task({ attempt, retryCount: attempt });
      return { result, retryCount: attempt };
    } catch (error) {
      lastError = error;
      const canRetry = error?.retryable !== false && feed.retryPolicy !== "none" && attempt < maxRetries;
      if (!canRetry) break;
      await sleep(retryDelayMs(feed, attempt));
    }
  }

  lastError.retryCount = finalAttempt;
  throw lastError;
}