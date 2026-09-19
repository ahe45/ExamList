import { postOperation } from "../../app/operation-client.js";
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
  loadArtifacts = async () => {},
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
    appState.pdfGenerations.artifactProgress = null;
    appState.pdfGenerations.isCreatingArchive = true;
    await onStateChange();

    try {
      const isMergeMode = downloadMode === "merge";
      const payload = await postOperation(isMergeMode ? "/api/pdf-generations/merge" : "/api/pdf-generations/archive", {
        generationIds,
      }, async job => {
        appState.pdfGenerations.artifactProgress = job;
        await onStateChange();
      });

      if (payload?.downloadUrl) {
        triggerDownload(payload.downloadUrl, payload.archiveFileName || payload.mergedFileName || "");
        await loadArtifacts();
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
    appState.pdfGenerations.artifactProgress = null;
    appState.pdfGenerations.isCreatingArchive = true;
    await onStateChange();

    try {
      const payload = await postOperation(isMergeMode ? "/api/pdf-generations/merge" : "/api/pdf-generations/archive", {
        generationIds,
      }, async job => {
        appState.pdfGenerations.artifactProgress = job;
        await onStateChange();
      });

      if (payload?.downloadUrl) {
        triggerDownload(payload.downloadUrl, payload.archiveFileName || payload.mergedFileName || "");
        await loadArtifacts();
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
    appState.pdfGenerations.rerunErrorMessage = "";
    await onStateChange();

    try {
      const payload = await postJson("/api/pdf-generations/rerun-batch", {
        generationIds,
        schoolId: getCurrentSchoolId(),
      });

      appState.pdfGenerations.lastBatchRerun = payload || null;
      appState.pdfGenerations.rerunErrorMessage = "";

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

  return Object.freeze({
    downloadGeneratedBatchResult,
    downloadSelectedGenerationArchive,
    rerunSelectedGenerations,
  });
}
