import { deleteJson } from "../../app/api-client.js";
import { formatCount } from "../../app/number-format.js";
import { showToast } from "../../app/toast.js";
import {
  getSelectedDownloadableGenerationIds,
  setSelectedGenerationIds,
} from "./pdf-generation-selection-actions.js";

function summarizePdfGenerationDeleteItem(item = {}) {
  return {
    candidateCount: Number(item.candidateCount) || 0,
    fileName: String(item.fileName || ""),
    id: String(item.id || ""),
    pageCount: Number(item.pageCount) || 0,
    targetName: String(item.targetName || item.fileName || item.id || ""),
  };
}

export function createPdfGenerationDeleteActions({
  appState,
  getDeleteConfirmState,
  hasPermission,
  loadAuditLogs,
  loadGenerations,
  onStateChange,
}) {
  function getSelectedPdfGenerationDeleteItems() {
    const selectedIdSet = new Set(getSelectedDownloadableGenerationIds(appState));

    return appState.pdfGenerations.items.filter((item) => selectedIdSet.has(String(item.id || "")));
  }

  async function openPdfGenerationDeleteConfirm() {
    if (!hasPermission("generatePdfs")) {
      return;
    }

    const deleteItems = getSelectedPdfGenerationDeleteItems();

    if (!deleteItems.length) {
      showToast("삭제할 PDF를 선택하세요.", { tone: "warning" });
      return;
    }

    const modal = getDeleteConfirmState();

    modal.candidateCount = deleteItems.reduce((total, item) => total + (Number(item.candidateCount) || 0), 0);
    modal.count = deleteItems.length;
    modal.errorMessage = "";
    modal.fileSizeBytes = deleteItems.reduce((total, item) => total + (Number(item.fileSizeBytes) || 0), 0);
    modal.generationIds = deleteItems.map((item) => String(item.id || "")).filter(Boolean);
    modal.isDeleting = false;
    modal.isOpen = true;
    modal.items = deleteItems.slice(0, 5).map(summarizePdfGenerationDeleteItem);
    modal.pageCount = deleteItems.reduce((total, item) => total + (Number(item.pageCount) || 0), 0);
    await onStateChange();
  }

  async function closePdfGenerationDeleteConfirm() {
    const modal = getDeleteConfirmState();

    if (modal.isDeleting) {
      return;
    }

    appState.pdfGenerations.deleteConfirm = {
      candidateCount: 0,
      count: 0,
      errorMessage: "",
      fileSizeBytes: 0,
      generationIds: [],
      isDeleting: false,
      isOpen: false,
      items: [],
      pageCount: 0,
    };
    await onStateChange();
  }

  async function confirmPdfGenerationDelete() {
    if (!hasPermission("generatePdfs")) {
      return;
    }

    const modal = getDeleteConfirmState();
    const generationIds = [...new Set((Array.isArray(modal.generationIds) ? modal.generationIds : [])
      .map((generationId) => String(generationId || "").trim())
      .filter(Boolean))];

    if (!generationIds.length) {
      modal.errorMessage = "삭제할 PDF를 선택하세요.";
      showToast(modal.errorMessage, { tone: "warning" });
      await onStateChange();
      return;
    }

    modal.isDeleting = true;
    modal.errorMessage = "";
    await onStateChange();

    try {
      const payload = await deleteJson("/api/pdf-generations", { generationIds });
      const deletedCount = Number(payload?.deletedCount) || 0;
      const deletedIdSet = new Set(generationIds);

      setSelectedGenerationIds(
        appState,
        appState.pdfGenerations.selectedGenerationIds.filter((generationId) => !deletedIdSet.has(String(generationId || ""))),
      );
      appState.pdfGenerations.deleteConfirm = {
        candidateCount: 0,
        count: 0,
        errorMessage: "",
        fileSizeBytes: 0,
        generationIds: [],
        isDeleting: false,
        isOpen: false,
        items: [],
        pageCount: 0,
      };
      showToast(`PDF 생성 결과 ${formatCount(deletedCount)}건을 삭제했습니다.`);
      await loadGenerations();
      await loadAuditLogs();
    } catch (error) {
      modal.errorMessage = error.message;
      modal.isDeleting = false;
      showToast(error.message, { tone: "error" });
      await onStateChange();
    }
  }

  return {
    closePdfGenerationDeleteConfirm,
    confirmPdfGenerationDelete,
    openPdfGenerationDeleteConfirm,
  };
}
