import { postJson } from "../../app/api-client.js";
import { formatCount } from "../../app/number-format.js";
import { showToast } from "../../app/toast.js";
import { triggerDownload } from "./pdf-generation-action-utils.js";
import {
  getSelectedDownloadableGenerationIds,
  getSelectedRerunnableGenerationIds,
} from "./pdf-generation-selection-actions.js";

function normalizeGenerationIdList(generationIds = []) {
  return [...new Set(generationIds.map((generationId) => String(generationId || "").trim()).filter(Boolean))];
}

export function createPdfGenerationBatchActions({
  appState,
  getCurrentSchoolId,
  hasPermission,
  loadGenerations,
  onStateChange,
  setRerunningGenerationIds,
}) {
  async function downloadSelectedGenerationArchive(downloadMode = "merge") {
    if (!hasPermission("downloadPdfs")) {
      return;
    }

    const generationIds = getSelectedDownloadableGenerationIds(appState);

    if (!generationIds.length) {
      return;
    }

    appState.pdfGenerations.archiveErrorMessage = "";
    appState.pdfGenerations.downloadModal.errorMessage = "";
    appState.pdfGenerations.downloadModal.isSubmitting = true;
    appState.pdfGenerations.isCreatingArchive = true;
    await onStateChange();

    try {
      const isMergeMode = downloadMode === "merge";
      const payload = await postJson(isMergeMode ? "/api/pdf-generations/merge" : "/api/pdf-generations/archive", {
        generationIds,
      });

      if (payload?.downloadUrl) {
        triggerDownload(payload.downloadUrl, payload.archiveFileName || payload.mergedFileName || "");
        showToast(isMergeMode ? "선택한 PDF 병합 다운로드를 시작했습니다." : "선택한 PDF ZIP 다운로드를 시작했습니다.");
      }

      appState.pdfGenerations.downloadModal.isOpen = false;
    } catch (error) {
      appState.pdfGenerations.archiveErrorMessage = error.message;
      appState.pdfGenerations.downloadModal.errorMessage = error.message;
      showToast(appState.pdfGenerations.archiveErrorMessage, { tone: "error" });
    } finally {
      appState.pdfGenerations.isCreatingArchive = false;
      appState.pdfGenerations.downloadModal.isSubmitting = false;
      await onStateChange();
    }
  }

  async function downloadGeneratedBatchResult(downloadMode = "merge") {
    if (!hasPermission("downloadPdfs")) {
      return;
    }

    const modal = appState.pdfGenerations.generatedResultModal || {};
    const generationIds = normalizeGenerationIdList(modal.generationIds || []);

    if (generationIds.length < 2) {
      return;
    }

    const isMergeMode = downloadMode === "merge";

    appState.pdfGenerations.archiveErrorMessage = "";
    modal.errorMessage = "";
    modal.isSubmitting = true;
    modal.mode = isMergeMode ? "merge" : "zip";
    appState.pdfGenerations.generatedResultModal = modal;
    appState.pdfGenerations.isCreatingArchive = true;
    await onStateChange();

    try {
      if (!isMergeMode && modal.archiveDownloadUrl) {
        triggerDownload(modal.archiveDownloadUrl, modal.archiveFileName || "");
        showToast("이번에 생성된 PDF ZIP 다운로드를 시작했습니다.");
        modal.isOpen = false;
        return;
      }

      const payload = await postJson(isMergeMode ? "/api/pdf-generations/merge" : "/api/pdf-generations/archive", {
        generationIds,
      });

      if (payload?.downloadUrl) {
        triggerDownload(payload.downloadUrl, payload.archiveFileName || payload.mergedFileName || "");
        showToast(isMergeMode ? "이번에 생성된 PDF 병합 다운로드를 시작했습니다." : "이번에 생성된 PDF ZIP 다운로드를 시작했습니다.");
      }

      modal.isOpen = false;
    } catch (error) {
      appState.pdfGenerations.archiveErrorMessage = error.message;
      modal.errorMessage = error.message;
      showToast(appState.pdfGenerations.archiveErrorMessage, { tone: "error" });
    } finally {
      appState.pdfGenerations.isCreatingArchive = false;
      modal.isSubmitting = false;
      await onStateChange();
    }
  }

  async function rerunSelectedGenerations() {
    if (!hasPermission("generatePdfs")) {
      return;
    }

    const generationIds = getSelectedRerunnableGenerationIds(appState);

    if (!generationIds.length) {
      return;
    }

    const rerunningIds = new Set(appState.pdfGenerations.rerunningGenerationIds);

    generationIds.forEach((generationId) => rerunningIds.add(generationId));
    setRerunningGenerationIds([...rerunningIds]);
    appState.pdfGenerations.isBatchRerunning = true;
    appState.pdfGenerations.lastRerunGeneration = null;
    appState.pdfGenerations.rerunErrorMessage = "";
    await onStateChange();

    try {
      const payload = await postJson("/api/pdf-generations/rerun-batch", {
        generationIds,
        schoolId: getCurrentSchoolId(),
      });

      appState.pdfGenerations.lastBatchRerun = payload || null;
      appState.pdfGenerations.rerunErrorMessage = "";

      if (payload?.archiveDownloadUrl) {
        triggerDownload(payload.archiveDownloadUrl, payload.archiveFileName || "");
      }

      showToast(`PDF 재생성을 요청했습니다. 성공 ${formatCount(payload?.succeededCount)}건 / 실패 ${formatCount(payload?.failedCount)}건`);
      await loadGenerations();
    } catch (error) {
      appState.pdfGenerations.lastBatchRerun = null;
      appState.pdfGenerations.rerunErrorMessage = error.message;
      showToast(appState.pdfGenerations.rerunErrorMessage, { tone: "error" });
    } finally {
      generationIds.forEach((generationId) => rerunningIds.delete(generationId));
      setRerunningGenerationIds([...rerunningIds]);
      appState.pdfGenerations.isBatchRerunning = false;
      await onStateChange();
    }
  }

  async function rerunGeneration(generationId) {
    if (!hasPermission("generatePdfs")) {
      return;
    }

    const normalizedGenerationId = String(generationId || "").trim();

    if (!normalizedGenerationId) {
      return;
    }

    const rerunningIds = new Set(appState.pdfGenerations.rerunningGenerationIds);

    rerunningIds.add(normalizedGenerationId);
    setRerunningGenerationIds([...rerunningIds]);
    appState.pdfGenerations.isBatchRerunning = false;
    appState.pdfGenerations.lastBatchRerun = null;
    appState.pdfGenerations.rerunErrorMessage = "";
    await onStateChange();

    try {
      const payload = await postJson(`/api/pdf-generations/${encodeURIComponent(normalizedGenerationId)}/rerun`, {});

      appState.pdfGenerations.lastRerunGeneration = payload || null;
      appState.pdfGenerations.rerunErrorMessage = "";

      if (payload?.downloadUrl) {
        triggerDownload(payload.downloadUrl, payload.fileName || "");
      }

      showToast("PDF를 재생성했습니다.");
      await loadGenerations();
    } catch (error) {
      appState.pdfGenerations.rerunErrorMessage = error.message;
      showToast(appState.pdfGenerations.rerunErrorMessage, { tone: "error" });
    } finally {
      rerunningIds.delete(normalizedGenerationId);
      setRerunningGenerationIds([...rerunningIds]);
      await onStateChange();
    }
  }

  async function retryGeneration(generationId) {
    if (!hasPermission("generatePdfs")) {
      return;
    }

    const normalizedGenerationId = String(generationId || "").trim();

    if (!normalizedGenerationId) {
      return;
    }

    appState.pdfGenerations.rerunErrorMessage = "";
    await onStateChange();

    try {
      await postJson(`/api/pdf-generations/${encodeURIComponent(normalizedGenerationId)}/retry`, {});
      showToast("PDF 생성 재시도를 요청했습니다.");
      await loadGenerations();
    } catch (error) {
      appState.pdfGenerations.rerunErrorMessage = error.message;
      showToast(appState.pdfGenerations.rerunErrorMessage, { tone: "error" });
      await onStateChange();
    }
  }

  return Object.freeze({
    downloadGeneratedBatchResult,
    downloadSelectedGenerationArchive,
    rerunGeneration,
    rerunSelectedGenerations,
    retryGeneration,
  });
}
