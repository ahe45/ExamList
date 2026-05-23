(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.ExamListTemplateEditorRuntimeApi = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createTemplateEditorRuntimePublicApi({
    applyTemplateEditorCommand,
    clearTemplateEditorImageSelection,
    clearTemplateEditorTableHoverState,
    clearTemplateEditorTableObjectHoverState,
    clearTemplateEditorTableObjectSelection,
    clearTemplateEditorTableSelection,
    getHtml,
    insertTemplateHtml,
    insertTemplateImage,
    insertTemplateImageSource,
    insertTemplateTag,
    redoTemplateEditorHistory,
    releaseTemplateEditorImageMoveSession,
    releaseTemplateEditorImageResizeSession,
    releaseTemplateEditorTableObjectMoveSession,
    releaseTemplateEditorTableObjectResizeSession,
    releaseTemplateEditorTableResizeSession,
    releaseTemplateEditorTableSelectionSession,
    render,
    renderInto,
    renderPagePropertiesPanel,
    renderTagPanel,
    renderToolbar,
    setHtml,
    state,
    syncTemplateEditorContent,
    unbindEvents,
    undoTemplateEditorHistory,
    updateTemplateEditorImageSelectionOverlay,
    updateTemplateEditorTableObjectOverlay,
  }) {
    function destroy() {
      unbindEvents();
      clearTemplateEditorImageSelection();
      clearTemplateEditorTableSelection();
      clearTemplateEditorTableHoverState();
      clearTemplateEditorTableObjectSelection({ updateOverlay: false });
      clearTemplateEditorTableObjectHoverState({ updateOverlay: false });
      releaseTemplateEditorImageMoveSession({ sync: false });
      releaseTemplateEditorImageResizeSession({ sync: false });
      releaseTemplateEditorTableResizeSession({ sync: false });
      releaseTemplateEditorTableObjectMoveSession({ sync: false });
      releaseTemplateEditorTableObjectResizeSession({ sync: false });
      releaseTemplateEditorTableSelectionSession({ keepSelection: false });
    }

    return Object.freeze({
      applyCommand: applyTemplateEditorCommand,
      destroy,
      getHtml,
      insertHtml: insertTemplateHtml,
      insertImage: insertTemplateImage,
      insertImageSource: insertTemplateImageSource,
      insertTag: insertTemplateTag,
      redo: redoTemplateEditorHistory,
      render,
      renderInto,
      renderPagePropertiesPanel,
      renderTagPanel,
      renderToolbar,
      setHtml,
      state,
      sync: syncTemplateEditorContent,
      updateImageSelectionOverlay: updateTemplateEditorImageSelectionOverlay,
      updateTableObjectOverlay: updateTemplateEditorTableObjectOverlay,
      undo: undoTemplateEditorHistory,
    });
  }

  return Object.freeze({
    createTemplateEditorRuntimePublicApi,
  });
});
