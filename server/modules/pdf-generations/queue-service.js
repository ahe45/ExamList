const { defaultQueueName, resolveQueueDriver } = require("./queue-options");

function createPdfGenerationQueueService({
  createHttpError,
  processQueuedPdfGeneration,
  writeAuditLog,
}) {
  const memoryQueue = {
    active: false,
    ids: [],
    scheduledIds: new Set(),
  };
  const bullQueueState = {
    connection: null,
    queue: null,
    worker: null,
  };

  function getQueueName() {
    return String(process.env.PDF_QUEUE_NAME || defaultQueueName).trim() || defaultQueueName;
  }

  function resolveQueueRetryDelayMs() {
    return Math.min(Math.max(Number(process.env.PDF_QUEUE_RETRY_DELAY_MS) || 5000, 0), 600000);
  }

  function shouldProcessBullQueueInCurrentProcess() {
    return String(process.env.PDF_QUEUE_PROCESS_IN_WEB || "true").trim().toLowerCase() !== "false";
  }

  function assertProductionQueueDriverAllowed(queueDriver) {
    if (queueDriver !== "memory" || String(process.env.NODE_ENV || "").trim().toLowerCase() !== "production") {
      return;
    }

    throw createHttpError(
      500,
      "운영 환경에서는 메모리 PDF 큐를 사용할 수 없습니다. PDF_QUEUE_DRIVER=bullmq와 REDIS_URL을 설정해주세요.",
      "PDF_QUEUE_MEMORY_DRIVER_NOT_ALLOWED",
    );
  }

  function getBullQueueModules() {
    try {
      return {
        bullmq: require("bullmq"),
        IORedis: require("ioredis"),
      };
    } catch (_error) {
      return null;
    }
  }

  function getBullQueueState() {
    const shouldProcessInCurrentProcess = shouldProcessBullQueueInCurrentProcess();

    if (bullQueueState.queue && (bullQueueState.worker || !shouldProcessInCurrentProcess)) {
      return bullQueueState;
    }

    const redisUrl = String(process.env.REDIS_URL || "").trim();
    const modules = getBullQueueModules();

    if (!redisUrl || !modules) {
      return null;
    }

    const { bullmq, IORedis } = modules;
    const queueName = getQueueName();

    if (!bullQueueState.connection) {
      const connection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
      });

      connection.on("error", (error) => {
        writeAuditLog({
          action: "pdf_generation_queue_connection_error",
          entityType: "pdf_generation_queue",
          metadata: {
            errorCode: String(error?.code || ""),
          },
          status: "failed",
        });
      });
      bullQueueState.connection = connection;
    }

    if (!bullQueueState.queue) {
      bullQueueState.queue = new bullmq.Queue(queueName, { connection: bullQueueState.connection });
    }

    if (!shouldProcessInCurrentProcess || bullQueueState.worker) {
      return bullQueueState;
    }

    bullQueueState.worker = new bullmq.Worker(
      queueName,
      async (job) => {
        await processQueuedPdfGeneration(String(job.data?.generationId || ""));
      },
      {
        concurrency: Math.min(Math.max(Number(process.env.PDF_QUEUE_CONCURRENCY) || 1, 1), 5),
        connection: bullQueueState.connection,
      },
    );
    bullQueueState.worker.on("failed", (job, error) => {
      const generationId = String(job?.data?.generationId || "");

      writeAuditLog({
        action: "pdf_generation_queue_worker_failed",
        entityId: generationId,
        metadata: {
          errorCode: String(error?.code || ""),
        },
        status: "failed",
      });
    });

    return bullQueueState;
  }

  async function enqueueMemoryGeneration(generationId, delayMs = 0) {
    if (!generationId || memoryQueue.scheduledIds.has(generationId)) {
      return;
    }

    memoryQueue.scheduledIds.add(generationId);
    const schedule = () => {
      memoryQueue.ids.push(generationId);
      drainMemoryQueue();
    };

    if (delayMs > 0) {
      setTimeout(schedule, delayMs);
      return;
    }

    setImmediate(schedule);
  }

  async function drainMemoryQueue() {
    if (memoryQueue.active) {
      return;
    }

    memoryQueue.active = true;

    try {
      while (memoryQueue.ids.length) {
        const generationId = memoryQueue.ids.shift();
        memoryQueue.scheduledIds.delete(generationId);
        await processQueuedPdfGeneration(generationId);
      }
    } finally {
      memoryQueue.active = false;

      if (memoryQueue.ids.length) {
        setImmediate(drainMemoryQueue);
      }
    }
  }

  async function scheduleQueuedGeneration(generationId, delayMs = 0) {
    const queueDriver = resolveQueueDriver();

    assertProductionQueueDriverAllowed(queueDriver);

    const bullState = queueDriver === "bullmq" ? getBullQueueState() : null;

    if (queueDriver === "bullmq" && !bullState?.queue) {
      throw createHttpError(
        500,
        "BullMQ 큐를 사용할 수 없습니다. REDIS_URL과 BullMQ 의존성을 확인해주세요.",
        "PDF_QUEUE_BULLMQ_UNAVAILABLE",
      );
    }

    if (bullState?.queue) {
      await bullState.queue.add(
        "generate-pdf",
        { generationId },
        {
          attempts: 1,
          delay: Math.max(Number(delayMs) || 0, 0),
          jobId: generationId,
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );
      return "bullmq";
    }

    await enqueueMemoryGeneration(generationId, delayMs);
    return "memory";
  }

  return Object.freeze({
    getBullQueueState,
    resolveQueueRetryDelayMs,
    scheduleQueuedGeneration,
  });
}

module.exports = {
  createPdfGenerationQueueService,
};
