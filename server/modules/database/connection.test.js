const test = require("node:test");
const assert = require("node:assert/strict");

const {
  withDatabaseConnection,
  withDatabaseTransaction,
} = require("./connection");

test("withDatabaseConnection releases the connection after success", async () => {
  const calls = [];
  const connection = {
    release() {
      calls.push("release");
    },
  };

  const result = await withDatabaseConnection(
    () => ({
      async getConnection() {
        calls.push("getConnection");
        return connection;
      },
    }),
    async (activeConnection) => {
      calls.push("handler");
      assert.equal(activeConnection, connection);
      return "ok";
    },
  );

  assert.equal(result, "ok");
  assert.deepEqual(calls, ["getConnection", "handler", "release"]);
});

test("withDatabaseConnection releases the connection after failure", async () => {
  const calls = [];
  const expectedError = new Error("query failed");

  await assert.rejects(
    withDatabaseConnection(
      () => ({
        async getConnection() {
          return {
            release() {
              calls.push("release");
            },
          };
        },
      }),
      async () => {
        throw expectedError;
      },
    ),
    expectedError,
  );

  assert.deepEqual(calls, ["release"]);
});

test("withDatabaseTransaction commits successful handlers", async () => {
  const calls = [];

  const result = await withDatabaseTransaction(
    () => ({
      async getConnection() {
        return {
          async beginTransaction() {
            calls.push("begin");
          },
          async commit() {
            calls.push("commit");
          },
          release() {
            calls.push("release");
          },
          async rollback() {
            calls.push("rollback");
          },
        };
      },
    }),
    async () => {
      calls.push("handler");
      return 42;
    },
  );

  assert.equal(result, 42);
  assert.deepEqual(calls, ["begin", "handler", "commit", "release"]);
});

test("withDatabaseTransaction rolls back failed handlers", async () => {
  const calls = [];

  await assert.rejects(
    withDatabaseTransaction(
      () => ({
        async getConnection() {
          return {
            async beginTransaction() {
              calls.push("begin");
            },
            async commit() {
              calls.push("commit");
            },
            release() {
              calls.push("release");
            },
            async rollback() {
              calls.push("rollback");
            },
          };
        },
      }),
      async () => {
        calls.push("handler");
        throw new Error("write failed");
      },
    ),
    /write failed/,
  );

  assert.deepEqual(calls, ["begin", "handler", "rollback", "release"]);
});
