(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.ExamListTemplateEditorRuntimeApi = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createTemplateEditorRuntimePublicApi({
    applyTemplateEditorCommand,
    clearTemplateEditorActiveCell,
    clearTemplateEditorImageHoverState,
    clearTemplateEditorImageSelection,
    clearTemplateEditorTableHoverState,
    clearTemplateEditorTableObjectHoverState,
    clearTemplateEditorTableObjectSelection,
    clearTemplateEditorTableSelection,
    getHtml,
    handleTemplateEditorImageResizeStart,
    insertTemplateHtml,
    insertTemplateImage,
    insertTemplateImageSource,
    insertTemplateTag,
    ownerWindow,
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
    updateTemplateEditorFormattingControls,
    updateTemplateEditorImageSelectionOverlay,
    updateTemplateEditorTableObjectOverlay,
    updateTemplateTableControls,
  }) {
    function clearObjectSelection() {
      clearTemplateEditorImageHoverState();
      clearTemplateEditorImageSelection();
      clearTemplateEditorTableHoverState();
      clearTemplateEditorTableObjectHoverState({ updateOverlay: false });
      clearTemplateEditorTableObjectSelection();
      clearTemplateEditorTableSelection();
      clearTemplateEditorActiveCell();
      ownerWindow.getSelection?.()?.removeAllRanges();
      state.templateEditor.savedRange = null;
      updateTemplateEditorFormattingControls();
      updateTemplateTableControls();
    }

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
      clearObjectSelection,
      clearTableObjectHoverState: clearTemplateEditorTableObjectHoverState,
      clearTableObjectSelection: clearTemplateEditorTableObjectSelection,
      destroy,
      getHtml,
      handleImageResizeStart: handleTemplateEditorImageResizeStart,
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
