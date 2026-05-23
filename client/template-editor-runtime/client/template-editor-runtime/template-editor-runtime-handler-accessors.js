(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.ExamListTemplateEditorRuntimeHandlerAccessors = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const handlerNames = Object.freeze([
    "appendMergedTemplateCellContent",
    "applyTemplateTableSize",
    "clearTemplateEditorImageSelection",
    "clearTemplateEditorTableHoverState",
    "clearTemplateEditorTableObjectHoverState",
    "clearTemplateEditorTableObjectSelection",
    "clearTemplateEditorTableSelection",
    "createTemplateTableCell",
    "decorateTemplateEditorImages",
    "focusTemplateEditorCell",
    "getTemplateEditorActiveTableSelection",
    "getTemplateEditorCellShadingValue",
    "getTemplateEditorFormattingTargetCells",
    "getTemplateEditorImageTarget",
    "getTemplateEditorMedianValue",
    "getTemplateEditorPixelValue",
    "getTemplateEditorSelectedCell",
    "getTemplateEditorSelectedTable",
    "getTemplateEditorTableLogicalColumnWidth",
    "getTemplateEditorTableLogicalRowHeight",
    "handleTemplateEditorTableObjectPointerDown",
    "handleTemplateEditorTablePointerDown",
    "handleTemplatePageSettingChange",
    "handleTemplateTableAction",
    "insertTemplateCellAtAbsoluteColumn",
    "isTemplateEditorTableObjectElement",
    "isTemplateTableCellEmpty",
    "releaseTemplateEditorImageMoveSession",
    "releaseTemplateEditorImageResizeSession",
    "releaseTemplateEditorTableObjectMoveSession",
    "releaseTemplateEditorTableObjectResizeSession",
    "releaseTemplateEditorTableResizeSession",
    "releaseTemplateEditorTableSelectionSession",
    "replaceTemplateEditorTableWithCaretHost",
    "selectTemplateEditorImage",
    "setTemplateEditorTableLogicalRowHeight",
    "startTemplateEditorImageMoveSession",
    "syncTemplatePageSettingsFromDocument",
    "updateTemplateEditorFormattingControls",
    "updateTemplateEditorImageSelectionOverlay",
    "updateTemplateEditorTableHoverState",
    "updateTemplateEditorTableObjectHoverState",
    "updateTemplateEditorTableObjectOverlay",
    "updateTemplateTableControls",
  ]);

  function createTemplateEditorRuntimeHandlerAccessors(callRuntimeHandler) {
    return Object.freeze(
      handlerNames.reduce((accessors, handlerName) => {
        accessors[handlerName] = callRuntimeHandler(handlerName);
        return accessors;
      }, {}),
    );
  }

  return Object.freeze({
    createTemplateEditorRuntimeHandlerAccessors,
  });
});
