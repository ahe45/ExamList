export function createTemplateEditorReturnedActions({
  appConfig,
  appState,
  closeDataTagSampleModal,
  closeTemplatePreview,
  discardTemplateEditorChanges,
  getCurrentSchoolRouteKey,
  isDataTagSampleModalDirty,
  loadTemplateEditor,
  mountTemplateEditorRuntime,
  navigateToPath,
  openDataTagSampleModal,
  openTemplatePreview,
  resetDataTagSampleModal,
  saveDataTagSampleModal,
  saveTemplateLayout,
  syncTemplateEditorRuntimeToState,
  unmountTemplateEditorRuntime,
}) {
  return {
    loadTemplateEditor,
    closeDataTagSampleModal,
    closeTemplatePreview,
    discardTemplateEditorChanges,
    isDataTagSampleModalDirty,
    mountTemplateEditorRuntime: () =>
      mountTemplateEditorRuntime({
        access: appState.summary.access,
        appState,
      }),
    openDataTagSampleModal,
    openTemplatePreview,
    openTemplateEditor: (templateId) =>
      navigateToPath(appConfig.getViewRoutePath("templateEditor", { schoolId: getCurrentSchoolRouteKey(), templateId })),
    resetDataTagSampleModal,
    saveDataTagSampleModal,
    saveTemplateLayout,
    syncTemplateEditorRuntimeToState,
    unmountTemplateEditorRuntime,
  };
}
