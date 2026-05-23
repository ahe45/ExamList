(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.ExamListTemplateEditorTableResizeSession = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createTemplateEditorTableResizeSessionController({
    TEMPLATE_EDITOR_TABLE_MIN_SIZE,
    applyTemplateEditorTableResizeValue,
    clearTemplateEditorTableHoverState,
    clearTemplateEditorTableSelection,
    createTemplateEditorCellOnlyColumnLayout,
    createTemplateEditorCellOnlyRowLayout,
    finalizeTemplateEditorTableResizeSession,
    focusTemplateEditorCell,
    getTemplateEditorSurface,
    getTemplateEditorTableColumnCount,
    getTemplateEditorTableLineCells,
    getTemplateEditorTableLogicalColumnWidth,
    state,
    syncTemplateEditorContent,
    updateTemplateTableControls,
  }) {
    function getCandidateBlockFocusScale(element) {
      const focusBlock = element?.closest?.("[data-candidate-block-instance].is-candidate-block-focus-editor") || null;

      if (!(focusBlock instanceof HTMLElement)) {
        return 1;
      }

      const computedStyle = window.getComputedStyle(focusBlock);
      const scale = Number.parseFloat(
        computedStyle.getPropertyValue("--examlist-candidate-block-focus-editor-scale") ||
          computedStyle.getPropertyValue("--examlist-candidate-block-focus-scale"),
      );

      return Number.isFinite(scale) && scale > 0 ? scale : 1;
    }

    function handleTemplateEditorTableResizeMove(event) {
      const resizeSession = state.templateEditor.tableResizeSession;

      if (!resizeSession || resizeSession.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();

      const pointerDelta =
        (resizeSession.kind === "column" ? event.clientX - resizeSession.startX : event.clientY - resizeSession.startY) /
        Math.max(resizeSession.focusScale || 1, 0.01);
      const delta = resizeSession.cellOnly && (resizeSession.edge === "left" || resizeSession.edge === "top")
        ? -pointerDelta
        : pointerDelta;
      const nextSize = Math.max(TEMPLATE_EDITOR_TABLE_MIN_SIZE, Math.round(resizeSession.startSize + delta));

      if (nextSize === resizeSession.lastSize) {
        return;
      }

      const appliedSize = applyTemplateEditorTableResizeValue(resizeSession, nextSize, pointerDelta);

      if (appliedSize === resizeSession.lastSize) {
        return;
      }

      resizeSession.lastSize = appliedSize;
      resizeSession.didChange = true;
      updateTemplateTableControls();
    }

    function releaseTemplateEditorTableResizeSession({ sync = true } = {}) {
      const resizeSession = state.templateEditor.tableResizeSession;
      const templateEditorSurface = getTemplateEditorSurface();

      if (!resizeSession) {
        return;
      }

      window.removeEventListener("pointermove", handleTemplateEditorTableResizeMove, true);
      window.removeEventListener("pointerup", handleTemplateEditorTableResizeEnd, true);
      window.removeEventListener("pointercancel", handleTemplateEditorTableResizeEnd, true);
      finalizeTemplateEditorTableResizeSession(resizeSession);
      state.templateEditor.tableResizeSession = null;
      templateEditorSurface?.classList.remove("is-table-resizing", "is-table-column-resizing", "is-table-row-resizing");
      clearTemplateEditorTableHoverState();

      if (sync && resizeSession.didChange) {
        focusTemplateEditorCell(resizeSession.cell);
        syncTemplateEditorContent();
        updateTemplateTableControls();
        return;
      }

      updateTemplateTableControls();
    }

    function handleTemplateEditorTableResizeEnd(event) {
      const resizeSession = state.templateEditor.tableResizeSession;

      if (!resizeSession || resizeSession.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      releaseTemplateEditorTableResizeSession({ sync: true });
    }

    function startTemplateEditorTableResizeSession(resizeHit, event) {
      const templateEditorSurface = getTemplateEditorSurface();
      const cellOnly = Boolean(event.shiftKey);
      const targetCells =
        !cellOnly && resizeHit.kind === "row" ? getTemplateEditorTableLineCells(resizeHit.table, resizeHit.kind, resizeHit.lineIndex) : [];

      if (!cellOnly && resizeHit.kind === "row" && targetCells.length === 0) {
        return false;
      }

      const cellOnlyColumnLayout =
        cellOnly && resizeHit.kind === "column"
          ? createTemplateEditorCellOnlyColumnLayout(resizeHit.table, resizeHit.rowIndex, resizeHit.lineIndex)
          : null;
      const cellOnlyRowLayout =
        cellOnly && resizeHit.kind === "row"
          ? createTemplateEditorCellOnlyRowLayout(resizeHit.table, resizeHit.colIndex, resizeHit.lineIndex)
          : null;

      if (cellOnly && resizeHit.kind === "column" && !cellOnlyColumnLayout) {
        return false;
      }

      if (cellOnly && resizeHit.kind === "row" && !cellOnlyRowLayout) {
        return false;
      }

      const cellRect = resizeHit.cell.getBoundingClientRect();
      const focusScale = getCandidateBlockFocusScale(resizeHit.cell);
      const startSize =
        cellOnly
          ? Math.max(
              Math.round((resizeHit.kind === "column" ? cellRect.width : cellRect.height) / focusScale),
              TEMPLATE_EDITOR_TABLE_MIN_SIZE,
            )
          : resizeHit.kind === "column"
          ? getTemplateEditorTableLogicalColumnWidth(resizeHit.table, resizeHit.lineIndex)
          : Math.max(Math.round(resizeHit.cell.getBoundingClientRect().height / focusScale), TEMPLATE_EDITOR_TABLE_MIN_SIZE);
      const columnCount = !cellOnly && resizeHit.kind === "column" ? getTemplateEditorTableColumnCount(resizeHit.table) : 0;
      const nextLineIndex = !cellOnly && resizeHit.kind === "column" && resizeHit.lineIndex + 1 < columnCount ? resizeHit.lineIndex + 1 : null;
      const nextStartSize = !cellOnly && Number.isInteger(nextLineIndex)
        ? getTemplateEditorTableLogicalColumnWidth(resizeHit.table, nextLineIndex)
        : 0;

      clearTemplateEditorTableSelection();
      state.templateEditor.tableResizeSession = {
        pointerId: event.pointerId,
        cellOnly,
        edge: resizeHit.edge,
        kind: resizeHit.kind,
        table: resizeHit.table,
        cell: resizeHit.cell,
        lineIndex: resizeHit.lineIndex,
        rowIndex: resizeHit.rowIndex,
        colIndex: resizeHit.colIndex,
        nextLineIndex,
        nextStartSize,
        focusScale,
        targetCells,
        cellOnlyColumnLayout,
        cellOnlyRowLayout,
        cellOnlyPlan: null,
        cellOnlyConsumedDelta: 0,
        startX: event.clientX,
        startY: event.clientY,
        startSize,
        lastSize: startSize,
        didChange: false,
      };

      templateEditorSurface?.classList.add(
        "is-table-resizing",
        resizeHit.kind === "column" ? "is-table-column-resizing" : "is-table-row-resizing",
      );
      clearTemplateEditorTableHoverState();
      window.addEventListener("pointermove", handleTemplateEditorTableResizeMove, true);
      window.addEventListener("pointerup", handleTemplateEditorTableResizeEnd, true);
      window.addEventListener("pointercancel", handleTemplateEditorTableResizeEnd, true);
      return true;
    }

    return Object.freeze({
      releaseTemplateEditorTableResizeSession,
      startTemplateEditorTableResizeSession,
    });
  }

  return Object.freeze({
    createTemplateEditorTableResizeSessionController,
  });
});
