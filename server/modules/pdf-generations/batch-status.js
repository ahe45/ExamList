const { normalizeProgressPercent } = require("./queue-options");
const { pdfGenerationCancelMessage } = require("./cancellation");

function countRowsByStatus(generationRows = []) {
  return generationRows.reduce(
    (counts, row) => {
      const status = String(row?.status || "");

      if (status === "queued") {
        counts.queuedCount += 1;
      } else if (status === "running") {
        counts.runningCount += 1;
      } else if (status === "completed") {
        counts.succeededCount += 1;
      } else if (status === "failed") {
        counts.failedCount += 1;
      }

      return counts;
    },
    {
      failedCount: 0,
      queuedCount: 0,
      runningCount: 0,
      succeededCount: 0,
    },
  );
}

function summarizePdfGenerationBatchStatus(batchRow = {}, generationRows = []) {
  const {
    failedCount,
    queuedCount,
    runningCount,
    succeededCount,
  } = countRowsByStatus(generationRows);
  const totalRequested = Number(batchRow.totalRequested) || generationRows.length;
  const terminalCount = succeededCount + failedCount;
  const progressPercent = totalRequested ? Math.round((terminalCount / totalRequested) * 100) : 0;
  const isTerminal = totalRequested > 0 && terminalCount >= totalRequested;
  const isCancelRequested = String(batchRow.errorMessage || "").trim() === pdfGenerationCancelMessage;
  const status = isTerminal
    ? succeededCount > 0 && !isCancelRequested
      ? "completed"
      : "failed"
    : runningCount > 0
      ? "running"
      : "queued";

  return {
    failedCount,
    isCancelRequested,
    isTerminal,
    progressPercent: normalizeProgressPercent(progressPercent),
    queuedCount,
    runningCount,
    status,
    succeededCount,
    terminalCount,
    totalRequested,
  };
}

module.exports = {
  countRowsByStatus,
  summarizePdfGenerationBatchStatus,
};
