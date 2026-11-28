interface SwrCacheEntry<T> {
  value?: T;
  updatedAt: number;
  inflight?: Promise<T>;
}

const globalForSwr = globalThis as unknown as {
  __appSwrCache?: Map<string, SwrCacheEntry<unknown>>;
};

const swrStore =
  globalForSwr.__appSwrCache ??
  (globalForSwr.__appSwrCache = new Map<string, SwrCacheEntry<unknown>>());

export interface SwrCacheOptions {
  freshMs: number;
  staleMs: number;
  forceRefresh?: boolean;
}

/**
 * Stale-While-Revalidate + single-flight deduplication cache using monotonic `performance.now()`.
 * Serves fresh or stale entries instantaneously (0 ms) while refreshing stale entries in the background.
 */
export async function withSwrCache<T>(
  key: string,
  options: SwrCacheOptions,
  loader: () => Promise<T>
): Promise<T> {
  const now = performance.now();
  const entry = swrStore.get(key) as SwrCacheEntry<T> | undefined;
  const hasValue = entry !== undefined && entry.value !== undefined;
  const age = hasValue ? now - entry.updatedAt : Infinity;

  const startLoad = (): Promise<T> => {
    const existing = swrStore.get(key) as SwrCacheEntry<T> | undefined;
    if (existing?.inflight) return existing.inflight;

    const inflight = loader()
      .then((val) => {
        swrStore.set(key, {
          value: val,
          updatedAt: performance.now(),
        });
        return val;
      })
      .catch((err) => {
        const latest = swrStore.get(key) as SwrCacheEntry<T> | undefined;
        if (latest?.value !== undefined) {
          swrStore.set(key, {
            value: latest.value,
            updatedAt: latest.updatedAt,
          });
        } else {
          swrStore.delete(key);
        }
        throw err;
      });

    swrStore.set(key, {
      value: existing?.value,
      updatedAt: existing?.updatedAt ?? 0,
      inflight,
    });

    return inflight;
  };

  if (hasValue && !options.forceRefresh) {
    if (age < options.freshMs) {
      return entry.value as T;
    }
    if (age < options.staleMs) {
      if (!entry.inflight) {
        void startLoad().catch(() => undefined);
      }
      return entry.value as T;
    }
  }

  if (entry?.inflight) {
    return entry.inflight;
  }

  return startLoad();
}
