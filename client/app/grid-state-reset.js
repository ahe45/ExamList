function resetCandidateGridTable(table = {}) {
  return {
    ...table,
    filterMenuKey: "",
    filterMenuPosition: null,
    filterMenuSearch: "",
    filters: {},
    page: 1,
    pageSize: Math.max(0, Number(table.pageSize) || 30),
    pageSizeMenuOpen: false,
    sortRules: [],
  };
}

function resetPdfGenerationGridTable(table = {}) {
  return {
    ...table,
    filterMenuKey: "",
    filterMenuPosition: null,
    filterMenuSearch: "",
    filters: {},
    page: 1,
    pageSize: Math.max(0, Number(table.pageSize) || 30),
    pageSizeMenuOpen: false,
    sortRules: [{ key: "sequenceNumber", direction: "asc" }],
  };
}

function shouldResetGridState(previousRoute = null, nextRoute = null) {
  const previousPath = String(previousRoute?.path || "").trim();
  const nextPath = String(nextRoute?.path || "").trim();

  return Boolean(previousPath && nextPath && previousPath !== nextPath);
}

export function resetGridStateForRouteNavigation(appState = {}, previousRoute = null, nextRoute = null) {
  if (!shouldResetGridState(previousRoute, nextRoute)) {
    return false;
  }

  if (appState.candidates) {
    appState.candidates.table = resetCandidateGridTable(appState.candidates.table || {});
  }

  if (appState.pdfGenerations) {
    appState.pdfGenerations.table = resetPdfGenerationGridTable(appState.pdfGenerations.table || {});
    appState.pdfGenerations.selectedGenerationIds = [];
    appState.pdfGenerations.selectionAnchorGenerationId = "";
  }

  return true;
}
