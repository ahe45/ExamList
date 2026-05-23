import { renderAccountManagementView } from "../features/accounts/renderers.js";
import { renderAuthStatus } from "../features/auth/renderers.js";
import { renderCandidateView } from "../features/candidates/renderers.js";
import { renderDataDeletionModal, renderDataDeletionView } from "../features/data-deletion/renderers.js";
import {
  renderPdfGenerationCreateModal,
  renderPdfGenerationDeleteConfirmModal,
  renderPdfGenerationDetailModal,
  renderPdfGenerationDetailView,
  renderPdfGenerationDownloadModal,
  renderPdfGenerationDownloadProgressOverlay,
  renderPdfGenerationGeneratedResultModal,
  renderPdfHistoryManagementView,
  renderPdfGenerationProgressOverlay,
  renderPdfGenerationView,
} from "../features/pdf-generations/renderers.js";
import { renderSchoolManagementView } from "../features/schools/renderers.js";
import { renderTemplateEditorView } from "../features/template-editor/renderers.js";
import { renderTemplateListView } from "../features/templates/renderers.js";
import { getActiveSchoolId } from "./school-context.js";
import { syncViewShell } from "./view-shell.js";

export function createAppRenderer({ appState, dom, getEditorActions, renderModalClosePrompt }) {
  return async function renderApp() {
    syncViewShell({
      activeSchoolId: getActiveSchoolId(appState) || appState.route?.params?.schoolId || "",
      activeTemplateId: appState.ui.activeTemplateId || appState.route?.params?.templateId || "",
      currentView: appState.currentView,
      dom,
      summary: appState.summary,
    });
    dom.authStatus.innerHTML = renderAuthStatus({
      access: appState.summary.access,
      auth: appState.auth,
      currentView: appState.currentView,
      school: appState.schools.detail,
    });
    dom.panelsByView.accountManagement.innerHTML = renderAccountManagementView({
      access: appState.summary.access,
      accounts: appState.accounts,
    });
    dom.panelsByView.templateManagement.innerHTML = renderTemplateListView({
      access: appState.summary.access,
      school: appState.schools.detail,
      templates: appState.templates,
    });
    dom.panelsByView.schoolManagement.innerHTML = renderSchoolManagementView({
      access: appState.summary.access,
      schools: appState.schools,
    });
    dom.panelsByView.pdfGenerationHistory.innerHTML = renderPdfGenerationView({
      access: appState.summary.access,
      pdfGenerations: appState.pdfGenerations,
    });
    dom.panelsByView.pdfGenerationDetail.innerHTML = renderPdfGenerationDetailView({
      access: appState.summary.access,
      detail: appState.pdfGenerationDetail,
      pdfGenerations: appState.pdfGenerations,
    });
    dom.panelsByView.pdfHistoryManagement.innerHTML = renderPdfHistoryManagementView({
      access: appState.summary.access,
      pdfGenerations: appState.pdfGenerations,
    });
    dom.panelsByView.candidateLookup.innerHTML = renderCandidateView({
      access: appState.summary.access,
      candidates: appState.candidates,
    });
    dom.panelsByView.dataDeletion.innerHTML = renderDataDeletionView({
      access: appState.summary.access,
      dataDeletion: appState.dataDeletion,
      school: appState.schools.detail,
    });
    dom.panelsByView.templateEditor.innerHTML = renderTemplateEditorView({
      access: appState.summary.access,
      editor: appState.templateEditor,
    });

    if (dom.globalModalHost) {
      dom.globalModalHost.innerHTML = [
        renderPdfGenerationCreateModal(appState.pdfGenerations),
        renderPdfGenerationDetailModal({
          access: appState.summary.access,
          detail: appState.pdfGenerationDetail,
          pdfGenerations: appState.pdfGenerations,
        }),
        renderPdfGenerationDeleteConfirmModal(appState.pdfGenerations),
        renderPdfGenerationDownloadModal(appState.pdfGenerations),
        renderPdfGenerationGeneratedResultModal(appState.pdfGenerations),
        renderPdfGenerationDownloadProgressOverlay(appState.pdfGenerations),
        renderPdfGenerationProgressOverlay(appState.pdfGenerations),
        renderDataDeletionModal(appState.dataDeletion, {
          access: appState.summary.access,
          school: appState.schools.detail,
        }),
        renderModalClosePrompt(appState.ui.modalClosePrompt),
      ].join("");
    }

    const editorActions = getEditorActions?.();

    if (appState.currentView === "templateEditor") {
      await editorActions?.mountTemplateEditorRuntime?.();
    } else {
      editorActions?.unmountTemplateEditorRuntime?.();
    }
  };
}
