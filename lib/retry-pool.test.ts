import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { Pool, type PoolClient } from "pg";
import { CONNECT_TIMEOUT_MESSAGE, RetryConnectPool } from "./retry-pool";

const fakeClient = { release: () => {} } as unknown as PoolClient;

// stand-in for pg's real connect: fail with each error in turn, then succeed
function stubConnect(...failures: Error[]) {
  let calls = 0;
  const spy = spyOn(Pool.prototype, "connect").mockImplementation((() => {
    const err = failures[calls++];
    return err ? Promise.reject(err) : Promise.resolve(fakeClient);
  }) as typeof Pool.prototype.connect);
  return { spy, calls: () => calls };
}

describe("RetryConnectPool", () => {
  let restore: (() => void) | undefined;
  afterEach(() => restore?.());

  test("retries once after a connect timeout", async () => {
    const s = stubConnect(new Error(CONNECT_TIMEOUT_MESSAGE));
    restore = () => s.spy.mockRestore();
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    expect(await new RetryConnectPool().connect()).toBe(fakeClient);
    expect(s.calls()).toBe(2);
    warn.mockRestore();
  });

  test("gives up after the second timeout", async () => {
    const s = stubConnect(
      new Error(CONNECT_TIMEOUT_MESSAGE),
      new Error(CONNECT_TIMEOUT_MESSAGE),
    );
    restore = () => s.spy.mockRestore();
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    await expect(new RetryConnectPool().connect()).rejects.toThrow(
      CONNECT_TIMEOUT_MESSAGE,
    );
    expect(s.calls()).toBe(2);
    warn.mockRestore();
  });

  test("does not retry other errors, like a full pool", async () => {
    const s = stubConnect(new Error("timeout exceeded when trying to connect"));
    restore = () => s.spy.mockRestore();
    await expect(new RetryConnectPool().connect()).rejects.toThrow(
      "timeout exceeded",
    );
    expect(s.calls()).toBe(1);
  });

  test("callback form, the one pool.query() uses, gets the client", async () => {
    const s = stubConnect(new Error(CONNECT_TIMEOUT_MESSAGE));
    restore = () => s.spy.mockRestore();
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    const got = await new Promise<PoolClient | undefined>((resolve, reject) =>
      new RetryConnectPool().connect((err, client) =>
        err ? reject(err) : resolve(client),
      ),
    );
    expect(got).toBe(fakeClient);
    warn.mockRestore();
  });
});

// real pg-pool against a server that accepts and never answers: proves the
// message we match is the one pg-pool throws, and that query() retries too
test("pool.query() retries a real connect timeout once", async () => {
  const { createServer } = await import("node:net");
  let sockets = 0;
  const server = createServer(() => {
    sockets++;
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as { port: number };
  const warn = spyOn(console, "warn").mockImplementation(() => {});
  const pool = new RetryConnectPool({
    host: "127.0.0.1",
    port,
    connectionTimeoutMillis: 100,
  });
  try {
    await expect(pool.query("SELECT 1")).rejects.toThrow(
      CONNECT_TIMEOUT_MESSAGE,
    );
    expect(sockets).toBe(2);
  } finally {
    warn.mockRestore();
    await pool.end();
    server.close();
  }
});
