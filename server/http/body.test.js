const test = require("node:test");
const assert = require("node:assert/strict");
const { PassThrough } = require("node:stream");

const { readRequestBody } = require("./body");

test("readRequestBody uses a route-specific body size limit", async () => {
  const request = new PassThrough();
  const bodyPromise = readRequestBody(request, { maxBodyBytes: 8 });

  request.end(Buffer.from("12345678"));

  assert.equal((await bodyPromise).toString("utf8"), "12345678");
});

test("readRequestBody returns a 413 error without destroying the request stream", async () => {
  const request = new PassThrough();
  let destroyCallCount = 0;
  const originalDestroy = request.destroy.bind(request);

  request.destroy = (...args) => {
    destroyCallCount += 1;
    return originalDestroy(...args);
  };

  const bodyPromise = readRequestBody(request, {
    maxBodyBytes: 4,
    tooLargeMessage: "테스트 요청이 너무 큽니다.",
  });

  request.write(Buffer.from("1234"));
  request.write(Buffer.from("5"));
  request.end();

  await assert.rejects(
    bodyPromise,
    (error) =>
      error?.statusCode === 413 &&
      error?.errorCode === "PAYLOAD_TOO_LARGE" &&
      error?.message === "테스트 요청이 너무 큽니다.",
  );
  assert.equal(destroyCallCount, 0);
});
