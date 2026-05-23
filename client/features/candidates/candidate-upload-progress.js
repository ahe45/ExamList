import { formatCount, formatDecimalNumber } from "../../app/number-format.js";

export const emptyCandidatePreviewProgress = Object.freeze({
  detail: "",
  isIndeterminate: false,
  isActive: false,
  message: "",
  percent: 0,
});

export const emptyCandidateUploadProgressOverlay = Object.freeze({
  detail: "",
  isIndeterminate: false,
  isOpen: false,
  message: "",
  percent: 0,
  stageLabel: "",
  title: "",
});

export function clampProgressPercent(value = 0) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(numericValue)));
}

export function formatByteCount(value = 0) {
  const normalizedValue = Math.max(0, Number(value) || 0);
  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  let displayValue = normalizedValue;

  while (displayValue >= 1024 && unitIndex < units.length - 1) {
    displayValue /= 1024;
    unitIndex += 1;
  }

  if (unitIndex === 0) {
    return `${formatCount(Math.round(displayValue))}${units[unitIndex]}`;
  }

  return `${formatDecimalNumber(displayValue, displayValue >= 10 ? 1 : 2)}${units[unitIndex]}`;
}

export function createFileProgressDetail(file, progress = {}) {
  const fileSize = Number(file?.size || 0);
  const progressPercent = clampProgressPercent(progress.percent);
  const total = fileSize || Number(progress.total || 0);
  const loaded = total > 0
    ? Math.min(total, Math.round((total * progressPercent) / 100))
    : Number(progress.loaded || 0);
  const fileName = String(file?.name || "선택한 파일");

  return total > 0
    ? `${fileName} · ${formatByteCount(loaded)} / ${formatByteCount(total)}`
    : `${fileName} · ${formatByteCount(loaded)}`;
}

function waitForProgressPaint() {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    return Promise.resolve();
  }

  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

export function createCandidateUploadProgressActions({ appState, onStateChange }) {
  let progressRenderQueued = false;

  function ensureCandidateUploadState() {
    appState.candidates.upload = appState.candidates.upload || {};
    appState.candidates.upload.previewProgress = {
      ...emptyCandidatePreviewProgress,
      ...(appState.candidates.upload.previewProgress || {}),
    };
    appState.candidates.upload.progressOverlay = {
      ...emptyCandidateUploadProgressOverlay,
      ...(appState.candidates.upload.progressOverlay || {}),
    };

    return appState.candidates.upload;
  }

  function queueCandidateUploadProgressRender() {
    if (progressRenderQueued) {
      return;
    }

    progressRenderQueued = true;

    const renderQueuedProgress = () => {
      progressRenderQueued = false;
      void onStateChange();
    };

    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(renderQueuedProgress);
      return;
    }

    setTimeout(renderQueuedProgress, 16);
  }

  async function setCandidatePreviewProgress(nextProgress = {}, options = {}) {
    const upload = ensureCandidateUploadState();

    upload.previewProgress = {
      ...emptyCandidatePreviewProgress,
      ...(upload.previewProgress || {}),
      ...nextProgress,
      percent: clampProgressPercent(nextProgress.percent ?? upload.previewProgress?.percent ?? 0),
    };

    if (options.flush === false) {
      queueCandidateUploadProgressRender();
      return;
    }

    await onStateChange();
  }

  async function setCandidateUploadProgressOverlay(nextProgress = {}, options = {}) {
    const upload = ensureCandidateUploadState();

    upload.progressOverlay = {
      ...emptyCandidateUploadProgressOverlay,
      ...(upload.progressOverlay || {}),
      ...nextProgress,
      percent: clampProgressPercent(nextProgress.percent ?? upload.progressOverlay?.percent ?? 0),
    };

    if (options.flush === false) {
      queueCandidateUploadProgressRender();
      return;
    }

    await onStateChange();
  }

  return Object.freeze({
    ensureCandidateUploadState,
    setCandidatePreviewProgress,
    setCandidateUploadProgressOverlay,
    waitForProgressPaint,
  });
}
