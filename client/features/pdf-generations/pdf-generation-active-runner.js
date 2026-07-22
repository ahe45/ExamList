import { getJson, postJson } from "../../app/api-client.js";
import { formatCount } from "../../app/number-format.js";
import { showToast } from "../../app/toast.js";
import {
  calculateEstimatedGenerationSeconds,
  calculateServerSyncedElapsedSeconds,
  getActiveGenerationProgressViewModel,
} from "./pdf-generation-active-progress.js";
import { createEmptyActivePdfGeneration } from "./pdf-generation-state.js";

function getActiveGenerationClockMs() {
  const monotonicClockMs = window.performance?.now?.();

  return Number.isFinite(monotonicClockMs) ? monotonicClockMs : Date.now();
}

export function createPdfGenerationActiveRunner({
  appState,
  getCreateModalState,
  hasPermission,
  loadGenerations,
  onStateChange,
  resetPdfGenerationTemplatePreview,
}) {
  let activeGenerationClockTimer = null;
  let activeGenerationPollTimer = null;

  function updateActiveGenerationOverlayDom() {
    const activeGeneration = appState.pdfGenerations.activeGeneration || {};
    const overlay = document.querySelector(".pdf-generation-progress-overlay");

    if (!overlay || !activeGeneration.isOpen) {
      return false;
    }

    const viewModel = getActiveGenerationProgressViewModel(activeGeneration);
    const label = overlay.querySelector("[data-pdf-generation-progress-label]");
    const percent = overlay.querySelector("[data-pdf-generation-progress-percent]");
    const progressValue = overlay.querySelector("[data-pdf-generation-progress-value]");
    const completed = overlay.querySelector("[data-pdf-generation-progress-completed]");
    const duration = overlay.querySelector("[data-pdf-generation-progress-duration]");
    const cancelButton = overlay.querySelector("[data-action='cancel-active-pdf-generation']");

    if (label) {
      label.textContent = viewModel.label;
    }

    if (percent) {
      percent.textContent = `${viewModel.progressPercent}%`;
    }

    if (progressValue) {
      progressValue.style.width = `${viewModel.progressPercent}%`;
    }

    if (completed) {
      completed.textContent = viewModel.completedText;
    }

    if (duration) {
      duration.textContent = viewModel.durationText;
    }

    if (cancelButton) {
      cancelButton.disabled = !viewModel.canCancel;
      cancelButton.textContent = activeGeneration.isCancelling ? "중단 중" : "중단";
    }

    return true;
  }

  function shouldRunActiveGenerationClock(activeGeneration = appState.pdfGenerations.activeGeneration || {}) {
    const elapsedSyncedAtMs = Number(activeGeneration.elapsedSyncedAtMs);

    if (!activeGeneration.isOpen || !Number.isFinite(elapsedSyncedAtMs) || elapsedSyncedAtMs < 0) {
      return false;
    }

    return !(Number(activeGeneration.progressPercent) >= 100 && activeGeneration.canCancel === false);
  }

  function updateActiveGenerationClockFields() {
    const activeGeneration = appState.pdfGenerations.activeGeneration || {};

    if (!shouldRunActiveGenerationClock(activeGeneration)) {
      return false;
    }

    const elapsedSeconds = calculateServerSyncedElapsedSeconds(
      activeGeneration,
      getActiveGenerationClockMs(),
    );
    const estimatedSeconds = calculateEstimatedGenerationSeconds({
      completedCount: Number(activeGeneration.completedCount) || 0,
      elapsedSeconds,
      totalRequested: Number(activeGeneration.totalRequested) || 0,
    });

    if (
      elapsedSeconds === (Number(activeGeneration.elapsedSeconds) || 0) &&
      estimatedSeconds === (Number(activeGeneration.estimatedSeconds) || 0)
    ) {
      return false;
    }

    appState.pdfGenerations.activeGeneration = {
      ...activeGeneration,
      elapsedSeconds,
      estimatedSeconds,
    };
    return true;
  }

  function stopActiveGenerationClock() {
    if (!activeGenerationClockTimer) {
      return;
    }

    window.clearTimeout(activeGenerationClockTimer);
    activeGenerationClockTimer = null;
  }

  function scheduleActiveGenerationClock() {
    if (activeGenerationClockTimer || !shouldRunActiveGenerationClock()) {
      return;
    }

    activeGenerationClockTimer = window.setTimeout(async () => {
      activeGenerationClockTimer = null;

      if (!shouldRunActiveGenerationClock()) {
        return;
      }

      const didChange = updateActiveGenerationClockFields();

      if (didChange) {
        updateActiveGenerationOverlayDom();
      }

      scheduleActiveGenerationClock();
    }, 1000);
  }

  function updateActiveGenerationFromBatch(batchPayload = {}) {
    const previousState = appState.pdfGenerations.activeGeneration || {};
    const totalRequested = Number(batchPayload.totalRequested) || 0;
    const succeededCount = Number(batchPayload.succeededCount) || 0;
    const failedCount = Number(batchPayload.failedCount) || 0;
    const runningCount = Number(batchPayload.runningCount) || 0;
    const queuedCount = Number(batchPayload.queuedCount) || 0;
    const completedCount = succeededCount + failedCount;
    const progressPercent = Number(batchPayload.progressPercent) || 0;
    const serverElapsedSeconds = Math.max(0, Math.floor(Number(batchPayload.elapsedSeconds) || 0));
    const elapsedSeconds = serverElapsedSeconds;
    const elapsedSyncedAtMs = getActiveGenerationClockMs();
    const estimatedSeconds = calculateEstimatedGenerationSeconds({
      completedCount,
      elapsedSeconds,
      totalRequested,
    });
    const status = String(batchPayload.status || "");
    const batchId = String(batchPayload.batchId || batchPayload.id || previousState.batchId || "");

    appState.pdfGenerations.activeGeneration = {
      batchId,
      canCancel: Boolean(batchId && status !== "completed" && status !== "failed"),
      completedCount,
      errorMessage: String(batchPayload.errorMessage || ""),
      estimatedSeconds,
      elapsedSeconds,
      elapsedSyncedAtMs,
      failedCount,
      isOpen: true,
      isCancelling: previousState.batchId === batchId ? Boolean(previousState.isCancelling) : false,
      label: "수험생확인대장 PDF 생성 중",
      progressPercent,
      queuedCount,
      runningCount,
      serverElapsedSeconds,
      succeededCount,
      statusText: `완료 ${formatCount(succeededCount)}건 / 실패 ${formatCount(failedCount)}건 / 진행 ${formatCount(runningCount)}건 / 대기 ${formatCount(queuedCount)}건${totalRequested ? ` / 총 ${formatCount(totalRequested)}건` : ""}`,
      totalRequested,
    };
    scheduleActiveGenerationClock();
  }

  function closeActiveGenerationOverlay() {
    stopActiveGenerationClock();

    if (activeGenerationPollTimer) {
      window.clearTimeout(activeGenerationPollTimer);
      activeGenerationPollTimer = null;
    }

    appState.pdfGenerations.activeGeneration = createEmptyActivePdfGeneration();
  }

  function closePdfGenerationCreateModalAfterActiveGeneration() {
    const modal = getCreateModalState();

    modal.isOpen = false;
    modal.errorMessage = "";
    modal.isSubmitting = false;
    resetPdfGenerationTemplatePreview();
  }

  function isTerminalBatch(batchPayload = {}) {
    const status = String(batchPayload.status || "");

    return status === "completed" || status === "failed";
  }

  async function pollActiveGenerationBatch(batchId) {
    const normalizedBatchId = String(batchId || "").trim();

    if (!normalizedBatchId) {
      closeActiveGenerationOverlay();
      await onStateChange();
      return;
    }

    try {
      const batchPayload = await getJson(`/api/pdf-generations/batches/${encodeURIComponent(normalizedBatchId)}`);

      updateActiveGenerationFromBatch(batchPayload);

      if (isTerminalBatch(batchPayload)) {
        const failedCount = Number(batchPayload.failedCount) || 0;
        const wasCancelled = String(batchPayload.errorMessage || "").includes("중단");

        stopActiveGenerationClock();
        appState.pdfGenerations.activeGeneration.progressPercent = 100;
        appState.pdfGenerations.activeGeneration.canCancel = false;
        appState.pdfGenerations.activeGeneration.isCancelling = false;
        appState.pdfGenerations.activeGeneration.statusText = wasCancelled
          ? "PDF 생성이 중단되었습니다."
          : failedCount
            ? `PDF 생성이 완료되었습니다. 실패 ${formatCount(failedCount)}건을 확인하세요.`
            : "PDF 생성이 완료되었습니다.";
        closePdfGenerationCreateModalAfterActiveGeneration();
        await loadGenerations({
          openGeneratedResultModalForBatch: wasCancelled
            ? null
            : {
                ...batchPayload,
                batchId: normalizedBatchId,
              },
        });
        showToast(wasCancelled ? "PDF 생성을 중단했습니다." : failedCount ? `PDF 생성 완료: 실패 ${formatCount(failedCount)}건` : "PDF 생성이 완료되었습니다.", {
          tone: wasCancelled || failedCount ? "warning" : "default",
        });
        window.setTimeout(async () => {
          closeActiveGenerationOverlay();
          await onStateChange();
        }, 700);
        return;
      }

      if (!updateActiveGenerationOverlayDom()) {
        await onStateChange();
      }

      activeGenerationPollTimer = window.setTimeout(() => {
        activeGenerationPollTimer = null;
        pollActiveGenerationBatch(normalizedBatchId);
      }, 1500);
    } catch (error) {
      getCreateModalState().isSubmitting = false;
      closeActiveGenerationOverlay();
      showToast(error.message, { tone: "error" });
      await onStateChange();
    }
  }

  async function cancelActivePdfGeneration() {
    if (!hasPermission("generatePdfs")) {
      return;
    }

    const activeGeneration = appState.pdfGenerations.activeGeneration || {};
    const batchId = String(activeGeneration.batchId || "").trim();

    if (!batchId || activeGeneration.isCancelling || activeGeneration.canCancel === false) {
      return;
    }

    appState.pdfGenerations.activeGeneration = {
      ...activeGeneration,
      canCancel: false,
      isCancelling: true,
      statusText: "PDF 생성 중단을 요청하고 있습니다.",
    };
    if (!updateActiveGenerationOverlayDom()) {
      await onStateChange();
    }

    try {
      const payload = await postJson(`/api/pdf-generations/batches/${encodeURIComponent(batchId)}/cancel`, {});

      if (activeGenerationPollTimer) {
        window.clearTimeout(activeGenerationPollTimer);
        activeGenerationPollTimer = null;
      }
      updateActiveGenerationFromBatch(payload || {});
      appState.pdfGenerations.activeGeneration.canCancel = false;
      appState.pdfGenerations.activeGeneration.isCancelling = false;
      appState.pdfGenerations.activeGeneration.statusText = "PDF 생성이 중단되었습니다.";
      stopActiveGenerationClock();
      closePdfGenerationCreateModalAfterActiveGeneration();
      showToast("PDF 생성을 중단했습니다.", { tone: "warning" });
      await loadGenerations();
      window.setTimeout(async () => {
        closeActiveGenerationOverlay();
        await onStateChange();
      }, 700);
    } catch (error) {
      appState.pdfGenerations.activeGeneration = {
        ...appState.pdfGenerations.activeGeneration,
        canCancel: true,
        errorMessage: error.message,
        isCancelling: false,
      };
      showToast(error.message, { tone: "error" });
      await onStateChange();
    }
  }

  return {
    cancelActivePdfGeneration,
    closeActiveGenerationOverlay,
    closePdfGenerationCreateModalAfterActiveGeneration,
    pollActiveGenerationBatch,
    scheduleActiveGenerationClock,
    updateActiveGenerationFromBatch,
    updateActiveGenerationOverlayDom,
  };
}
