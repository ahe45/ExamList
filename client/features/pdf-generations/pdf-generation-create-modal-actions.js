import { getJson, postJson } from "../../app/api-client.js";
import { showToast } from "../../app/toast.js";
import { toQueryString } from "./pdf-generation-action-utils.js";
import {
  clampPdfGenerationCreateStepIndex,
  createEmptyPdfGenerationFilters,
  getPdfGenerationSelectedFilterKeysAfterSelection,
  getPdfGenerationVisibleFilterSteps,
  isPdfGenerationCreateConditionComplete,
  normalizePdfGenerationSelectedFilterKeys,
  pdfGenerationCreateSteps,
  pdfGenerationFilterSteps,
  resetPdfGenerationFiltersAfterSelection,
  resetPdfGenerationUnitLowerFilters,
} from "./pdf-generation-flow.js";

const pdfGenerationCreateOptionFields = Object.freeze([
  ...new Set([
    ...pdfGenerationFilterSteps.map((step) => step.key),
    "admissionCode",
    "buildingCode",
    "periodCode",
    "roomCode",
    "seriesCode",
    "unitCode",
  ]),
]);

export function createPdfGenerationCreateModalActions({
  appState,
  closeActiveGenerationOverlay,
  closePdfGenerationCreateModalAfterActiveGeneration,
  getCreateModalState,
  getCurrentSchoolId,
  hasPermission,
  loadGenerations,
  onStateChange,
  pollActiveGenerationBatch,
  resetPdfGenerationTemplatePreview,
  scheduleActiveGenerationClock,
  updateActiveGenerationFromBatch,
  updateActiveGenerationOverlayDom,
}) {
  function getSelectedCreateTemplate() {
    const modal = getCreateModalState();

    return (Array.isArray(modal.templates) ? modal.templates : []).find(
      (template) => String(template.id || "") === String(modal.selectedTemplateId || ""),
    ) || null;
  }

  function buildCreateModalFilterPayload() {
    const modal = getCreateModalState();
    const selectedTemplate = getSelectedCreateTemplate();
    const visibleFilterKeys = new Set(
      getPdfGenerationVisibleFilterSteps(selectedTemplate?.generationUnit || "").map((step) => step.key),
    );
    const selectedFilterKeys = new Set(
      normalizePdfGenerationSelectedFilterKeys(modal.selectedFilterKeys, selectedTemplate?.generationUnit || ""),
    );

    return Object.fromEntries(
      pdfGenerationFilterSteps
        .filter((step) => visibleFilterKeys.has(step.key) && selectedFilterKeys.has(step.key))
        .map((step) => [step.key, String(modal.filters?.[step.key] || "").trim()])
        .filter(([, value]) => value),
    );
  }

  function isCreateModalConditionComplete() {
    const modal = getCreateModalState();
    const selectedTemplate = getSelectedCreateTemplate();
    const selectedFilterKeys = normalizePdfGenerationSelectedFilterKeys(
      modal.selectedFilterKeys,
      selectedTemplate?.generationUnit || "",
    );

    return (
      Boolean(selectedTemplate) &&
      isPdfGenerationCreateConditionComplete(selectedFilterKeys, selectedTemplate?.generationUnit || "")
    );
  }

  async function loadCreateModalTemplates() {
    const modal = getCreateModalState();
    const queryString = toQueryString({
      limit: 100,
      schoolId: getCurrentSchoolId(),
    });
    const payload = await getJson(`/api/pdf-templates${queryString ? `?${queryString}` : ""}`);

    modal.templates = Array.isArray(payload?.items) ? payload.items : [];

    if (!modal.templates.some((template) => String(template.id || "") === String(modal.selectedTemplateId || ""))) {
      modal.selectedTemplateId = "";
    }
  }

  async function loadCreateModalTargetEstimate() {
    const modal = getCreateModalState();
    const selectedTemplate = getSelectedCreateTemplate();

    if (!selectedTemplate) {
      modal.targetEstimate = null;
      return;
    }

    try {
      const queryString = toQueryString({
        ...buildCreateModalFilterPayload(),
        generationUnit: selectedTemplate.generationUnit || "",
        schoolId: getCurrentSchoolId(),
        templateId: selectedTemplate.id || "",
      });
      const payload = await getJson(`/api/pdf-generations/targets${queryString ? `?${queryString}` : ""}`);
      const items = Array.isArray(payload?.items) ? payload.items : [];

      modal.targetEstimate = {
        candidateCount: items.reduce((total, item) => total + (Number(item?.candidateCount) || 0), 0),
        generationUnit: String(payload?.generationUnit || selectedTemplate.generationUnit || ""),
        pdfCount: Number(payload?.total) || items.length,
        templateId: String(selectedTemplate.id || ""),
      };
    } catch (_error) {
      modal.targetEstimate = null;
    }
  }

  async function loadCreateModalOptions(options = {}) {
    const modal = getCreateModalState();

    modal.isLoadingOptions = true;
    modal.targetEstimate = null;
    if (!options.silent) {
      await onStateChange();
    }

    try {
      const queryString = toQueryString({
        ...buildCreateModalFilterPayload(),
        excludeSelfFilters: "1",
        fields: pdfGenerationCreateOptionFields.join(","),
        schoolId: getCurrentSchoolId(),
      });
      const payload = await getJson(`/api/candidates/filter-options${queryString ? `?${queryString}` : ""}`);

      modal.options = payload?.options && typeof payload.options === "object" ? payload.options : {};
      await loadCreateModalTargetEstimate();
      modal.errorMessage = "";
    } catch (error) {
      modal.options = {};
      modal.targetEstimate = null;
      modal.errorMessage = "";
    } finally {
      modal.isLoadingOptions = false;
      await onStateChange();
    }
  }

  async function openPdfGenerationCreateModal() {
    if (!hasPermission("generatePdfs")) {
      return;
    }

    const modal = getCreateModalState();

    modal.errorMessage = "";
    modal.activeStepIndex = 0;
    modal.filters = createEmptyPdfGenerationFilters();
    modal.isOpen = true;
    modal.isSubmitting = false;
    modal.options = {};
    modal.selectedFilterKeys = [];
    modal.selectedTemplateId = "";
    modal.targetEstimate = null;
    resetPdfGenerationTemplatePreview();
    await onStateChange();

    try {
      modal.isLoadingOptions = true;
      await loadCreateModalTemplates();
      modal.filters = resetPdfGenerationUnitLowerFilters(
        modal.filters,
        getSelectedCreateTemplate()?.generationUnit || "",
      );
      modal.selectedFilterKeys = normalizePdfGenerationSelectedFilterKeys(
        modal.selectedFilterKeys,
        getSelectedCreateTemplate()?.generationUnit || "",
      );
      await loadCreateModalOptions({ silent: true });
    } catch (error) {
      modal.errorMessage = error.message;
      showToast(modal.errorMessage, { tone: "error" });
    } finally {
      modal.isLoadingOptions = false;
      await onStateChange();
    }
  }

  async function closePdfGenerationCreateModal() {
    const modal = getCreateModalState();

    modal.isOpen = false;
    modal.errorMessage = "";
    modal.isSubmitting = false;
    resetPdfGenerationTemplatePreview();
    await onStateChange();
  }

  async function openPdfGenerationTemplatePreview() {
    if (!hasPermission("previewTemplates")) {
      return;
    }

    const modal = getCreateModalState();
    const selectedTemplate = getSelectedCreateTemplate();

    if (!selectedTemplate) {
      modal.errorMessage = "미리보기할 양식을 선택하세요.";
      showToast(modal.errorMessage, { tone: "warning" });
      await onStateChange();
      return;
    }

    modal.templatePreview = {
      errorMessage: "",
      isLoading: true,
      isOpen: true,
      pdfUrl: "",
      previewHtml: "",
      templateId: String(selectedTemplate.id || ""),
      templateName: String(selectedTemplate.name || "수험생확인대장"),
    };
    await onStateChange();

    try {
      const payload = await postJson("/api/pdf-preview", {
        sampleLimit: 60,
        schoolId: getCurrentSchoolId(),
        templateId: selectedTemplate.id,
      });

      modal.templatePreview = {
        ...modal.templatePreview,
        errorMessage: "",
        isLoading: false,
        pdfUrl: "",
        previewHtml: String(payload?.previewHtml || ""),
      };
    } catch (error) {
      modal.templatePreview = {
        ...modal.templatePreview,
        errorMessage: error.message,
        isLoading: false,
        pdfUrl: "",
        previewHtml: "",
      };
      showToast(error.message, { tone: "error" });
    } finally {
      await onStateChange();
    }
  }

  async function openPdfGenerationFirstResultPreview() {
    if (!hasPermission("generatePdfs") || !hasPermission("previewTemplates")) {
      return;
    }

    const modal = getCreateModalState();
    const selectedTemplate = getSelectedCreateTemplate();

    if (!selectedTemplate) {
      modal.errorMessage = "미리보기할 양식을 선택하세요.";
      showToast(modal.errorMessage, { tone: "warning" });
      await onStateChange();
      return;
    }

    if (!isCreateModalConditionComplete()) {
      modal.errorMessage = "모집시기, 전형까지 선택한 뒤 미리보기를 진행하세요.";
      showToast(modal.errorMessage, { tone: "warning" });
      await onStateChange();
      return;
    }

    modal.templatePreview = {
      errorMessage: "",
      isLoading: true,
      isOpen: true,
      pdfUrl: "",
      previewHtml: "",
      templateId: String(selectedTemplate.id || ""),
      templateName: `${String(selectedTemplate.name || "수험생확인대장")} 첫 번째 PDF`,
    };
    await onStateChange();

    try {
      const payload = await postJson("/api/pdf-generations/preview", {
        candidatePage: 1,
        filters: buildCreateModalFilterPayload(),
        generationUnit: selectedTemplate.generationUnit || "",
        previewFirstTarget: true,
        previewMode: "generation",
        renderActualCandidates: true,
        sampleLimit: 500,
        schoolId: getCurrentSchoolId(),
        templateId: selectedTemplate.id,
      });

      modal.templatePreview = {
        ...modal.templatePreview,
        errorMessage: "",
        isLoading: false,
        pdfUrl: String(payload?.pdfUrl || ""),
        previewHtml: "",
      };
    } catch (error) {
      modal.templatePreview = {
        ...modal.templatePreview,
        errorMessage: error.message,
        isLoading: false,
        pdfUrl: "",
        previewHtml: "",
      };
      showToast(error.message, { tone: "error" });
    } finally {
      await onStateChange();
    }
  }

  async function closePdfGenerationTemplatePreview() {
    const modal = getCreateModalState();

    modal.templatePreview = {
      ...modal.templatePreview,
      isLoading: false,
      isOpen: false,
    };
    await onStateChange();
  }

  async function setPdfGenerationCreateStep(stepIndex) {
    const modal = getCreateModalState();

    modal.activeStepIndex = clampPdfGenerationCreateStepIndex(stepIndex);
    modal.errorMessage = "";
    await onStateChange();
  }

  async function movePdfGenerationCreateStep(direction) {
    const modal = getCreateModalState();
    const nextStepIndex = clampPdfGenerationCreateStepIndex(
      modal.activeStepIndex + (direction === "previous" ? -1 : 1),
    );

    if (modal.activeStepIndex === 0 && nextStepIndex > 0 && !modal.selectedTemplateId) {
      modal.errorMessage = "PDF를 생성할 양식을 선택하세요.";
      showToast(modal.errorMessage, { tone: "warning" });
      await onStateChange();
      return;
    }

    modal.activeStepIndex = nextStepIndex;
    modal.errorMessage = "";
    await onStateChange();
  }

  async function updatePdfGenerationCreateTemplate(templateId) {
    const modal = getCreateModalState();

    modal.selectedTemplateId = String(templateId || "").trim();
    modal.errorMessage = "";
    modal.targetEstimate = null;
    resetPdfGenerationTemplatePreview();
    modal.filters = resetPdfGenerationUnitLowerFilters(
      modal.filters,
      getSelectedCreateTemplate()?.generationUnit || "",
    );
    modal.selectedFilterKeys = [];
    await loadCreateModalOptions();
  }

  async function updatePdfGenerationCreateFilter(filterKey, value) {
    const modal = getCreateModalState();
    const normalizedFilterKey = String(filterKey || "").trim();

    if (!pdfGenerationFilterSteps.some((step) => step.key === normalizedFilterKey)) {
      return;
    }

    if (String(value || "").trim() === "__pdf_generation_unselected__") {
      return;
    }

    const selectedTemplate = getSelectedCreateTemplate();

    if (!selectedTemplate) {
      return;
    }

    const generationUnit = selectedTemplate?.generationUnit || "";
    const selectedFilterKeys = normalizePdfGenerationSelectedFilterKeys(modal.selectedFilterKeys, generationUnit);

    if (normalizedFilterKey === "series" && !selectedFilterKeys.includes("admission")) {
      return;
    }

    modal.filters[normalizedFilterKey] = String(value || "").trim();
    modal.filters = resetPdfGenerationFiltersAfterSelection(modal.filters, normalizedFilterKey, generationUnit);
    modal.selectedFilterKeys = getPdfGenerationSelectedFilterKeysAfterSelection({
      generationUnit,
      selectedFilterKeys: modal.selectedFilterKeys,
      stepKey: normalizedFilterKey,
      value,
    });
    await loadCreateModalOptions();
  }

  async function submitPdfGenerationCreate() {
    if (!hasPermission("generatePdfs")) {
      return;
    }

    const modal = getCreateModalState();
    const selectedTemplate = getSelectedCreateTemplate();

    if (!selectedTemplate) {
      modal.errorMessage = "PDF를 생성할 양식을 선택하세요.";
      modal.activeStepIndex = 0;
      showToast(modal.errorMessage, { tone: "warning" });
      await onStateChange();
      return;
    }

    if (!isCreateModalConditionComplete()) {
      modal.errorMessage = "모집시기, 전형까지 선택한 뒤 PDF를 생성하세요.";
      showToast(modal.errorMessage, { tone: "warning" });
      await onStateChange();
      return;
    }

    modal.activeStepIndex = pdfGenerationCreateSteps.length - 1;

    modal.isSubmitting = true;
    modal.errorMessage = "";
    appState.pdfGenerations.activeGeneration = {
      batchId: "",
      canCancel: false,
      completedCount: 0,
      errorMessage: "",
      estimatedSeconds: 0,
      elapsedSeconds: 0,
      failedCount: 0,
      isOpen: true,
      isCancelling: false,
      label: "수험생확인대장 PDF 생성 준비 중",
      progressPercent: 1,
      queuedCount: 0,
      runningCount: 0,
      startedAtMs: Date.now(),
      statusText: "생성 요청을 등록하고 있습니다.",
      succeededCount: 0,
      totalRequested: 0,
    };
    scheduleActiveGenerationClock();
    await onStateChange();

    try {
      const payload = await postJson("/api/pdf-generations/batch/jobs", {
        filters: buildCreateModalFilterPayload(),
        schoolId: getCurrentSchoolId(),
        templateId: selectedTemplate.id,
      });
      const batchId = String(payload?.batchId || "").trim();

      modal.isSubmitting = Boolean(batchId);
      updateActiveGenerationFromBatch(payload || {});
      updateActiveGenerationOverlayDom();
      showToast("PDF 생성을 요청했습니다.");

      if (batchId) {
        await pollActiveGenerationBatch(batchId);
      } else {
        closePdfGenerationCreateModalAfterActiveGeneration();
        await loadGenerations();
      }
    } catch (error) {
      modal.errorMessage = error.message;
      modal.isSubmitting = false;
      closeActiveGenerationOverlay();
      showToast(error.message, { tone: "error" });
      await onStateChange();
    }
  }

  return {
    buildCreateModalFilterPayload,
    closePdfGenerationCreateModal,
    closePdfGenerationTemplatePreview,
    getSelectedCreateTemplate,
    isCreateModalConditionComplete,
    loadCreateModalOptions,
    movePdfGenerationCreateStep,
    openPdfGenerationCreateModal,
    openPdfGenerationFirstResultPreview,
    openPdfGenerationTemplatePreview,
    setPdfGenerationCreateStep,
    submitPdfGenerationCreate,
    updatePdfGenerationCreateFilter,
    updatePdfGenerationCreateTemplate,
  };
}
