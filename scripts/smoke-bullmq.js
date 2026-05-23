const { Queue, QueueEvents, Worker } = require("bullmq");
const IORedis = require("ioredis");

const { loadEnvironment } = require("../db");

function requireRedisUrl() {
  loadEnvironment();

  const redisUrl = String(process.env.REDIS_URL || process.env.PDF_SMOKE_REDIS_URL || "").trim();

  if (!redisUrl) {
    throw new Error("REDIS_URL 또는 PDF_SMOKE_REDIS_URL을 설정해주세요.");
  }

  return redisUrl;
}

async function closeQuietly(resource) {
  if (!resource || typeof resource.close !== "function") {
    return;
  }

  await resource.close().catch(() => {});
}

async function disconnectQuietly(connection) {
  if (!connection || typeof connection.disconnect !== "function") {
    return;
  }

  connection.disconnect();
}

async function run() {
  const redisUrl = requireRedisUrl();
  const queueName = `${String(process.env.PDF_QUEUE_NAME || "examlist-pdf-generation").trim()}-smoke-${Date.now()}`;
  const connection = new IORedis(redisUrl, {
    connectTimeout: 5000,
    maxRetriesPerRequest: null,
  });
  const queue = new Queue(queueName, { connection });
  const queueEvents = new QueueEvents(queueName, { connection });
  const progressEvents = [];
  let worker;

  connection.on("error", (error) => {
    console.error(`Redis 연결 오류: ${error.message}`);
  });

  queueEvents.on("progress", ({ data, jobId }) => {
    progressEvents.push({ jobId, progress: Number(data) || 0 });
  });

  try {
    await connection.ping();
    await queueEvents.waitUntilReady();

    worker = new Worker(
      queueName,
      async (job) => {
        await job.updateProgress(25);

        if (job.data.failOnce && job.attemptsMade === 0) {
          throw new Error("의도된 1회 실패");
        }

        await job.updateProgress(100);

        return {
          ok: true,
          attemptsMade: job.attemptsMade,
        };
      },
      { connection },
    );
    await worker.waitUntilReady();

    const job = await queue.add(
      "smoke",
      { failOnce: true },
      {
        attempts: 2,
        backoff: {
          delay: 100,
          type: "fixed",
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
    const result = await job.waitUntilFinished(queueEvents, 15000);

    if (!result?.ok) {
      throw new Error("BullMQ 작업 결과가 올바르지 않습니다.");
    }

    if (!progressEvents.some((event) => event.progress === 100)) {
      throw new Error("BullMQ progress 이벤트를 확인하지 못했습니다.");
    }

    console.log(`BullMQ smoke OK: queue=${queueName}, attemptsMade=${result.attemptsMade + 1}`);
  } finally {
    await closeQuietly(worker);
    await closeQuietly(queueEvents);
    await queue.obliterate({ force: true }).catch(() => {});
    await closeQuietly(queue);
    disconnectQuietly(connection);
  }
}

run().catch((error) => {
  console.error(error.message || "BullMQ smoke 실패");
  process.exitCode = 1;
});
