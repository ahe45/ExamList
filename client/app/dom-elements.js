export const dom = {
  authStatus: document.getElementById("authStatus"),
  appShell: document.querySelector(".app-shell"),
  brandHome: document.getElementById("brandHome"),
  globalModalHost: document.getElementById("globalModalHost"),
  panelsByView: {
    accountManagement: document.querySelector('[data-view-panel="accountManagement"]'),
    candidateLookup: document.querySelector('[data-view-panel="candidateLookup"]'),
    dataDeletion: document.querySelector('[data-view-panel="dataDeletion"]'),
    pdfGenerationDetail: document.querySelector('[data-view-panel="pdfGenerationDetail"]'),
    pdfGenerationHistory: document.querySelector('[data-view-panel="pdfGenerationHistory"]'),
    pdfHistoryManagement: document.querySelector('[data-view-panel="pdfHistoryManagement"]'),
    schoolManagement: document.querySelector('[data-view-panel="schoolManagement"]'),
    templateEditor: document.querySelector('[data-view-panel="templateEditor"]'),
    templateManagement: document.querySelector('[data-view-panel="templateManagement"]'),
  },
  workspaceNav: document.getElementById("workspaceNav"),
  workspaceSidebar: document.getElementById("workspaceSidebar"),
};
