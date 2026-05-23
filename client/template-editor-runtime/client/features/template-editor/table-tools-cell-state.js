(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.ExamListTemplateEditorTableToolsCellState = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createTemplateEditorTableCellStateController({
    TEMPLATE_EDITOR_DEFAULT_TABLE_HEADER_BACKGROUND,
    applyTemplateTableCellPresentation,
    getTemplateEditorSurface,
    normalizeTemplateEditorColorValue,
    placeCaretAtEnd,
    state,
    updateTemplateEditorActiveCell,
    updateTemplateEditorFormattingControls,
  }) {
    function getTemplateEditorPixelValue(element, property) {
      if (!element) {
        return "";
      }

      const rect = element.getBoundingClientRect();
      const pixelValue = property === "height" ? rect.height : rect.width;

      if (!Number.isFinite(pixelValue) || pixelValue <= 0) {
        return "";
      }

      return String(Math.round(pixelValue));
    }

    function getTemplateEditorCellShadingValue(cell) {
      if (!cell) {
        return "#ffffff";
      }

      const fallbackValue = cell.tagName === "TH" ? TEMPLATE_EDITOR_DEFAULT_TABLE_HEADER_BACKGROUND : "#ffffff";
      return normalizeTemplateEditorColorValue(cell.style.backgroundColor || window.getComputedStyle(cell).backgroundColor, fallbackValue);
    }

    function focusTemplateEditorCell(cell) {
      const templateEditorSurface = getTemplateEditorSurface();

      if (!templateEditorSurface) {
        return;
      }

      if (!cell) {
        placeCaretAtEnd(templateEditorSurface);
        return;
      }

      if (!String(cell.innerHTML || "").trim()) {
        cell.innerHTML = "<br />";
      }

      const selection = window.getSelection();
      const range = document.createRange();

      range.selectNodeContents(cell);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      state.templateEditor.savedRange = range.cloneRange();
      updateTemplateEditorActiveCell();
      updateTemplateEditorFormattingControls();
    }

    function createTemplateTableCell(tagName, sourceCell = null) {
      const cell = document.createElement(tagName.toLowerCase());
      cell.innerHTML = tagName.toUpperCase() === "TH" ? "제목" : "<br />";
      applyTemplateTableCellPresentation(cell, sourceCell);
      return cell;
    }

    return Object.freeze({
      createTemplateTableCell,
      focusTemplateEditorCell,
      getTemplateEditorCellShadingValue,
      getTemplateEditorPixelValue,
    });
  }

  return Object.freeze({
    createTemplateEditorTableCellStateController,
  });
});
