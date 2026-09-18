import { renderPartialHtml, clearPartialHtml } from "./partial-render.js";
import { renderAuthStatus } from "../features/auth/renderers.js";
import { syncStableBusyOverlays } from "./stable-busy-overlays.js";
import { getActiveSchoolId } from "./school-context.js";
import { syncViewShell } from "./view-shell.js";

const loaders = {
  accounts: () => import("../features/accounts/renderers.js"),
  schools: () => import("../features/schools/renderers.js"),
  templates: () => import("../features/templates/renderers.js"),
  candidates: async () => Object.assign({}, ...await Promise.all([
    import("../features/candidates/renderers.js"), import("../features/candidates/candidate-upload-renderer.js"),
  ])),
  pdf: () => import("../features/pdf-generations/renderers.js"),
  deletion: () => import("../features/data-deletion/renderers.js"),
  editor: () => import("../features/template-editor/renderers.js"),
};
const viewFeatures = {
  accountManagement: "accounts", schoolManagement: "schools", templateManagement: "templates",
  candidateLookup: "candidates", pdfGenerationHistory: "pdf", pdfGenerationDetail: "pdf",
  pdfHistoryManagement: "pdf", dataDeletion: "deletion", templateEditor: "editor",
};

export function createAppRenderer({ appState, dom, getEditorActions, renderModalClosePrompt }) {
  const modules = {};
  const pending = {};
  let renderSequence = 0;
  return async function renderApp() {
    const sequence = ++renderSequence;
    const view = appState.currentView;
    const feature = viewFeatures[view];
    if (view !== "templateEditor") getEditorActions?.()?.unmountTemplateEditorRuntime?.();
    if (feature && !modules[feature]) {
      pending[feature] ||= loaders[feature]().then(module => { modules[feature] = module; }).catch(error => { delete pending[feature]; throw error; });
      await pending[feature];
    }
    if (sequence !== renderSequence || view !== appState.currentView) return;
    syncViewShell({
      activeSchoolId: getActiveSchoolId(appState) || appState.route?.params?.schoolId || "",
      activeTemplateId: appState.ui.activeTemplateId || appState.route?.params?.templateId || "",
      currentView: view, dom, summary: appState.summary,
    });
    const access = appState.summary.access;
    const school = appState.schools.detail;
    const pdfGenerations = appState.pdfGenerations;
    renderPartialHtml(dom.authStatus, renderAuthStatus({ access, auth: appState.auth, currentView: view, school }));
    const module = modules[feature];
    const renderView = {
      accountManagement: () => module.renderAccountManagementView({ access, accounts: appState.accounts }),
      schoolManagement: () => module.renderSchoolManagementView({ access, schools: appState.schools }, { includeBusyOverlays: false }),
      templateManagement: () => module.renderTemplateListView({ access, school, templates: appState.templates }),
      candidateLookup: () => module.renderCandidateView({ access, candidates: appState.candidates }, { includeBusyOverlays: false }),
      pdfGenerationHistory: () => module.renderPdfGenerationView({ access, pdfGenerations }),
      pdfGenerationDetail: () => module.renderPdfGenerationDetailView({ access, detail: appState.pdfGenerationDetail, pdfGenerations }),
      pdfHistoryManagement: () => module.renderPdfHistoryManagementView({ access, pdfGenerations }),
      dataDeletion: () => module.renderDataDeletionView({ access, dataDeletion: appState.dataDeletion, school }),
      templateEditor: () => module.renderTemplateEditorView({ access, editor: appState.templateEditor }),
    };
    for (const [name, panel] of Object.entries(dom.panelsByView)) {
      if (name === view) {
        if (view === "templateEditor") panel.innerHTML = renderView[view]?.() || "";
        else renderPartialHtml(panel, renderView[view]?.() || "");
      } else if (panel.childNodes.length) clearPartialHtml(panel);
    }
    const pdf = modules.pdf;
    const deletion = modules.deletion;
    if (dom.globalModalHost) {
      renderPartialHtml(dom.globalModalHost, [
        pdf?.renderPdfGenerationCreateModal(pdfGenerations),
        pdf?.renderPdfGenerationDetailModal({ access, detail: appState.pdfGenerationDetail, pdfGenerations }),
        pdf?.renderPdfGenerationDeleteConfirmModal(pdfGenerations),
        pdf?.renderPdfGenerationDownloadModal(pdfGenerations),
        pdf?.renderPdfGenerationGeneratedResultModal(pdfGenerations),
        deletion?.renderDataDeletionModal(appState.dataDeletion, { access, school }),
        renderModalClosePrompt(appState.ui.modalClosePrompt),
      ].filter(Boolean).join(""));
    }
    syncStableBusyOverlays([
      modules.candidates?.renderCandidatePreviewProgressOverlay(appState.candidates.upload?.previewProgress),
      modules.candidates?.renderCandidateUploadProgressOverlay(appState.candidates),
      pdf?.renderPdfGenerationDownloadProgressOverlay(pdfGenerations),
      pdf?.renderPdfGenerationProgressOverlay(pdfGenerations),
      deletion?.renderDataDeletionProgressOverlay(appState.dataDeletion),
      modules.schools?.renderSchoolDeletionProgressOverlay(appState.schools),
    ].filter(Boolean), dom.globalModalHost?.ownerDocument || document);
    if (view === "templateEditor") await getEditorActions?.()?.mountTemplateEditorRuntime?.();
  };
}
