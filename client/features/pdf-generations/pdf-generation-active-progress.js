import { formatCount } from "../../app/number-format.js";

export function calculateEstimatedGenerationSeconds({ completedCount, elapsedSeconds, totalRequested }) {
  if (!(completedCount > 0) || !(elapsedSeconds > 0) || !(totalRequested > 0)) {
    return 0;
  }

  return Math.max(elapsedSeconds, Math.round((elapsedSeconds * totalRequested) / completedCount));
}

export function formatActiveGenerationDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const paddedMinutes = String(minutes).padStart(2, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");

  return hours > 0 ? `${hours}:${paddedMinutes}:${paddedSeconds}` : `${paddedMinutes}:${paddedSeconds}`;
}

export function getActiveGenerationProgressViewModel(activeGeneration = {}) {
  const progressPercent = Math.min(Math.max(Math.round(Number(activeGeneration.progressPercent) || 0), 0), 100);
  const completedCount = Math.max(0, Number(activeGeneration.completedCount) || 0);
  const totalRequested = Math.max(0, Number(activeGeneration.totalRequested) || 0);
  const elapsedSeconds = Math.max(0, Number(activeGeneration.elapsedSeconds) || 0);
  const estimatedSeconds = Math.max(0, Number(activeGeneration.estimatedSeconds) || 0);

  return {
    canCancel: Boolean(activeGeneration.batchId && activeGeneration.canCancel && !activeGeneration.isCancelling),
    completedText: `진행 ${formatCount(completedCount)}개 / 총 ${formatCount(totalRequested)}개`,
    durationText: `시간 ${formatActiveGenerationDuration(elapsedSeconds)} / 예상 ${
      estimatedSeconds ? formatActiveGenerationDuration(estimatedSeconds) : "계산 중"
    }`,
    label: String(activeGeneration.label || "PDF 생성 중"),
    progressPercent,
  };
}
