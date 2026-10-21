/**
 * Wrap an async job so overlapping calls collapse: while one run is in flight,
 * any number of further calls share it and schedule exactly one trailing run,
 * which sees everything that changed meanwhile. Errors are reported through
 * `onError` and never reject callers (callers are fire-and-forget).
 */
export function coalesce(
  job: () => Promise<unknown>,
  onError: (error: unknown) => void = () => {},
): () => Promise<void> {
  let running: Promise<void> | null = null;
  let queued = false;
  return () => {
    if (running) {
      queued = true;
      return running;
    }
    running = (async () => {
      try {
        do {
          queued = false;
          try {
            await job();
          } catch (error) {
            onError(error);
          }
        } while (queued);
      } finally {
        running = null;
      }
    })();
    return running;
  };
}
