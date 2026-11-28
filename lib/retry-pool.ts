import { Pool, type PoolClient } from "pg";

/** pg-pool's error when a new connection misses connectionTimeoutMillis. A
 *  full pool fails with a different message and is not retried. */
export const CONNECT_TIMEOUT_MESSAGE =
  "Connection terminated due to connection timeout";

type ConnectCallback = (
  err: Error | undefined,
  client: PoolClient | undefined,
  done: (release?: Error | boolean) => void,
) => void;

// Retry once when opening a connection times out. Nothing reached the
// database yet, so it is safe for writes too. On 2026-11-28 Vercel logged
// bursts of these while Neon was awake: background cache refreshes woke with
// every connect already past its timer. pool.query() and transactions both
// go through connect(), so this covers every Prisma query.
export class RetryConnectPool extends Pool {
  override connect(): Promise<PoolClient>;
  override connect(callback: ConnectCallback): void;
  override connect(
    callback?: ConnectCallback,
  ): Promise<PoolClient> | undefined {
    const connected = super.connect().catch((err: unknown) => {
      if (!(err instanceof Error) || err.message !== CONNECT_TIMEOUT_MESSAGE)
        throw err;
      console.warn("[db] connect timed out, retrying once");
      return super.connect();
    });
    if (!callback) return connected;
    connected.then(
      (client) => callback(undefined, client, client.release),
      (err: Error) => callback(err, undefined, () => {}),
    );
    return undefined;
  }
}
