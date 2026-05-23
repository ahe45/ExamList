export function createTemplateEditorPageSelection({
  appState,
  clearDocumentImageSelection,
  getDocumentHistoryState,
  setLastDocumentSelectionPage,
}) {
  return function setSelectedPage(pageId) {
    clearDocumentImageSelection({ pageId: appState.templateEditor.selectedPageId });
    appState.templateEditor.selectedPageId = pageId;
    getDocumentHistoryState(pageId);
    setLastDocumentSelectionPage(pageId);
  };
}
