/** Resend allows 10 POST /emails requests per second; keep headroom. */
const RESEND_SENDS_PER_SECOND = 5;

const BATCH_PAUSE_MS = 1000;

/**
 * Run async work in fixed-size parallel batches with a pause between batches
 * so external APIs (Resend) are not bursted past their per-second limit.
 */
export async function runInRateLimitedBatches<T>(
  items: readonly T[],
  run: (item: T) => Promise<void>,
  options?: { batchSize?: number; pauseMs?: number },
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const batchSize = options?.batchSize ?? RESEND_SENDS_PER_SECOND;
  const pauseMs = options?.pauseMs ?? BATCH_PAUSE_MS;

  for (let offset = 0; offset < items.length; offset += batchSize) {
    const batch = items.slice(offset, offset + batchSize);
    await Promise.all(batch.map((item) => run(item)));

    const hasMore = offset + batchSize < items.length;
    if (hasMore) {
      await sleep(pauseMs);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
