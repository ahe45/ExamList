(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.ExamListTemplateEditorTableSizing = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const tableSizingScopeModule = globalThis.ExamListTemplateEditorTableSizingScope;
  const tableSizingValuesModule = globalThis.ExamListTemplateEditorTableSizingValues;

  if (!tableSizingScopeModule?.createTemplateEditorTableSizingScopeController) {
    throw new Error("client/features/template-editor/table-sizing-scope.js must be loaded before table-sizing.js.");
  }

  if (!tableSizingValuesModule?.createTemplateEditorTableSizingValueController) {
    throw new Error("client/features/template-editor/table-sizing-values.js must be loaded before table-sizing.js.");
  }

  const { createTemplateEditorTableSizingScopeController } = tableSizingScopeModule;
  const { createTemplateEditorTableSizingValueController } = tableSizingValuesModule;

  function createTemplateEditorTableSizingController({
    TEMPLATE_EDITOR_TABLE_MIN_SIZE,
    buildTemplateTableCellMap,
    ensureTemplateEditorTableColGroup,
    focusTemplateEditorCell,
    getTemplateEditorClampedColumnGroupWidth,
    getTemplateEditorActiveTableSelection,
    getTemplateEditorCellShadingInput,
    getTemplateEditorCellWidthInput,
    getTemplateEditorRowHeightInput,
    getTemplateEditorSelectedCell,
    getTemplateEditorSizeScopeInput,
    getTemplateEditorTableLogicalColumnWidth,
    getTemplateEditorTableLogicalRowHeight,
    normalizeTemplateEditorColorValue,
    restoreTemplateEditorSelection,
    setTemplateEditorStatus,
    setTemplateEditorTableLogicalColumnWidth,
    setTemplateEditorTableLogicalRowHeight,
    syncTemplateEditorContent,
    updateTemplateTableControls,
  }) {
    const {
      getTemplateEditorEqualizeColumnIndexes,
      getTemplateEditorEqualizeRowIndexes,
      getTemplateEditorShadingTargetCells,
      getTemplateEditorSizeScopeCells,
      getTemplateEditorSizeScopeColumnIndexes,
    } = createTemplateEditorTableSizingScopeController({
      buildTemplateTableCellMap,
      getTemplateEditorActiveTableSelection,
    });
    const {
      distributeTemplateEditorTotalSize,
      getTemplateEditorMedianValue,
    } = createTemplateEditorTableSizingValueController({
      TEMPLATE_EDITOR_TABLE_MIN_SIZE,
    });

    function applyTemplateEditorTableCellWidth(cell, width) {
      const table = cell?.closest("table");

      if (!table || !cell) {
        return false;
      }

      const { entries } = buildTemplateTableCellMap(table);
      const entry = entries.get(cell);

      if (!entry) {
        return false;
      }

      const { columns } = ensureTemplateEditorTableColGroup(table);
      const targetColumnIndexes = Array.from({ length: entry.colSpan }, (_, offset) => entry.colIndex + offset);
      const safeWidth = getTemplateEditorClampedColumnGroupWidth(table, columns, targetColumnIndexes, width);
      const baseWidth = Math.floor(safeWidth / entry.colSpan);
      const remainder = safeWidth - baseWidth * entry.colSpan;

      for (let offset = 0; offset < entry.colSpan; offset += 1) {
        const nextWidth = baseWidth + (offset === entry.colSpan - 1 ? remainder : 0);
        setTemplateEditorTableLogicalColumnWidth(table, entry.colIndex + offset, nextWidth);
      }

      cell.style.width = `${safeWidth}px`;
      return true;
    }

    function equalizeTemplateTableColumnWidths() {
      const selectedCell = getTemplateEditorSelectedCell();

      if (!selectedCell) {
        setTemplateEditorStatus("표 안의 셀을 선택한 뒤 열 너비를 맞추세요.", "warning");
        return null;
      }

      const table = selectedCell.closest("table");
      const targetColumnIndexes = getTemplateEditorEqualizeColumnIndexes(table, selectedCell);

      if (targetColumnIndexes.length === 0) {
        setTemplateEditorStatus("같은 너비로 맞출 열을 찾을 수 없습니다.", "warning");
        return selectedCell;
      }

      const currentWidths = targetColumnIndexes.map((columnIndex) =>
        getTemplateEditorTableLogicalColumnWidth(table, columnIndex),
      );
      const equalizedWidths = distributeTemplateEditorTotalSize(
        currentWidths.reduce((totalWidth, width) => totalWidth + (Number(width) || TEMPLATE_EDITOR_TABLE_MIN_SIZE), 0),
        targetColumnIndexes.length,
      );

      targetColumnIndexes.forEach((columnIndex, index) => {
        setTemplateEditorTableLogicalColumnWidth(table, columnIndex, equalizedWidths[index]);
      });

      return selectedCell;
    }

    function getTemplateEditorRenderedTableHeight(table) {
      const renderedHeight = Math.round(table?.getBoundingClientRect?.().height || 0);

      return Number.isFinite(renderedHeight) ? Math.max(0, renderedHeight) : 0;
    }

    function getTemplateEditorEqualizeRowTotalHeight(table, targetRowIndexes, currentHeights) {
      const currentTotalHeight = currentHeights.reduce(
        (totalHeight, height) => totalHeight + (Number(height) || TEMPLATE_EDITOR_TABLE_MIN_SIZE),
        0,
      );
      const allRowIndexes = Array.from({ length: table?.rows?.length || 0 }, (_item, rowIndex) => rowIndex);
      const targetRowIndexSet = new Set(targetRowIndexes);
      const targetsEveryRow =
        allRowIndexes.length > 0 &&
        allRowIndexes.length === targetRowIndexes.length &&
        allRowIndexes.every((rowIndex) => targetRowIndexSet.has(rowIndex));
      const renderedTableHeight = getTemplateEditorRenderedTableHeight(table);

      if (targetsEveryRow && renderedTableHeight > currentTotalHeight + 1) {
        return renderedTableHeight;
      }

      return currentTotalHeight;
    }

    function applyTemplateEditorEqualizedRowHeights(table, rowHeightEntries = []) {
      if (!table?.rows?.length || !Array.isArray(rowHeightEntries) || rowHeightEntries.length === 0) {
        return false;
      }

      const minimumRowHeight = table.closest?.("[data-candidate-block-instance]") ? 1 : TEMPLATE_EDITOR_TABLE_MIN_SIZE;
      const normalizedEntries = rowHeightEntries
        .map((entry) => ({
          height: Math.max(minimumRowHeight, Math.round(Number(entry?.height) || minimumRowHeight)),
          rowIndex: Math.round(Number(entry?.rowIndex)),
        }))
        .filter((entry) => Number.isInteger(entry.rowIndex) && entry.rowIndex >= 0 && entry.rowIndex < table.rows.length);

      if (normalizedEntries.length === 0) {
        return false;
      }

      const nextHeightByRowIndex = new Map(normalizedEntries.map((entry) => [entry.rowIndex, entry.height]));
      const { matrix, entries } = buildTemplateTableCellMap(table);

      nextHeightByRowIndex.forEach((height, rowIndex) => {
        const rowElement = table.rows[rowIndex];
        const rowCells = new Set();

        (matrix[rowIndex] || []).forEach((cell) => {
          const entry = cell ? entries.get(cell) : null;

          if (entry && entry.rowIndex === rowIndex) {
            rowCells.add(cell);
          }
        });

        rowElement.style.height = `${height}px`;
        rowCells.forEach((cell) => {
          cell.style.height = `${height}px`;
        });
      });

      const totalHeight = Array.from(table.rows || []).reduce((heightSum, rowElement, rowIndex) => {
        const configuredHeight = nextHeightByRowIndex.has(rowIndex)
          ? nextHeightByRowIndex.get(rowIndex)
          : getTemplateEditorTableLogicalRowHeight(table, rowIndex);

        return heightSum + Math.max(minimumRowHeight, Math.round(Number(configuredHeight) || minimumRowHeight));
      }, 0);

      if (totalHeight > 0) {
        table.style.height = `${Math.round(totalHeight)}px`;
      }

      if (table.closest?.("[data-candidate-block-instance]")) {
        table.style.maxHeight = "100%";
      }

      return true;
    }

    function equalizeTemplateTableRowHeights() {
      const selectedCell = getTemplateEditorSelectedCell();

      if (!selectedCell) {
        setTemplateEditorStatus("표 안의 셀을 선택한 뒤 행 높이를 맞추세요.", "warning");
        return null;
      }

      const table = selectedCell.closest("table");
      const targetRowIndexes = getTemplateEditorEqualizeRowIndexes(table, selectedCell);

      if (targetRowIndexes.length === 0) {
        setTemplateEditorStatus("같은 높이로 맞출 행을 찾을 수 없습니다.", "warning");
        return selectedCell;
      }

      const currentHeights = targetRowIndexes.map((rowIndex) =>
        getTemplateEditorTableLogicalRowHeight(table, rowIndex),
      );
      const targetTotalHeight = getTemplateEditorEqualizeRowTotalHeight(table, targetRowIndexes, currentHeights);
      const equalizedHeights = distributeTemplateEditorTotalSize(
        targetTotalHeight,
        targetRowIndexes.length,
      );

      applyTemplateEditorEqualizedRowHeights(
        table,
        targetRowIndexes.map((rowIndex, index) => ({
          height: equalizedHeights[index],
          rowIndex,
        })),
      );

      return selectedCell;
    }

    function applyTemplateEditorCellShading(colorValue = "") {
      const selectedCell = getTemplateEditorSelectedCell() || getTemplateEditorActiveTableSelection()?.anchorCell || null;

      if (!selectedCell) {
        setTemplateEditorStatus("표 안의 셀을 선택한 뒤 음영을 적용하세요.", "warning");
        return null;
      }

      const shadingValue = normalizeTemplateEditorColorValue(
        colorValue || getTemplateEditorCellShadingInput()?.value || "",
        "#ffffff",
      );
      const targetCells = getTemplateEditorShadingTargetCells(selectedCell);

      if (targetCells.length === 0) {
        setTemplateEditorStatus("음영을 적용할 셀을 찾을 수 없습니다.", "warning");
        return selectedCell;
      }

      targetCells.forEach((cell) => {
        cell.style.backgroundColor = shadingValue;
      });

      syncTemplateEditorContent();
      updateTemplateTableControls();
      return selectedCell;
    }

    function applyTemplateTableSize() {
      restoreTemplateEditorSelection();

      const selectedCell = getTemplateEditorSelectedCell();

      if (!selectedCell) {
        setTemplateEditorStatus("표 안의 셀을 선택한 뒤 크기를 조정하세요.", "warning");
        return;
      }

      const scope = String(getTemplateEditorSizeScopeInput()?.value || "cell");
      const targetCells = getTemplateEditorSizeScopeCells(selectedCell, scope);

      if (targetCells.length === 0) {
        setTemplateEditorStatus("적용할 셀을 찾을 수 없습니다.", "warning");
        return;
      }

      const widthInput = String(getTemplateEditorCellWidthInput()?.value || "").trim();
      const heightInput = String(getTemplateEditorRowHeightInput()?.value || "").trim();
      const widthValue = widthInput ? Number(widthInput) : null;
      const heightValue = heightInput ? Number(heightInput) : null;

      if (widthValue === null && heightValue === null) {
        setTemplateEditorStatus("셀 가로 또는 세로 값을 입력하세요.", "warning");
        return;
      }

      if (widthValue !== null) {
        if (!Number.isFinite(widthValue) || widthValue < TEMPLATE_EDITOR_TABLE_MIN_SIZE) {
          setTemplateEditorStatus(`셀 가로 길이는 ${TEMPLATE_EDITOR_TABLE_MIN_SIZE}px 이상으로 입력하세요.`, "warning");
          return;
        }

        if (scope === "cell") {
          applyTemplateEditorTableCellWidth(selectedCell, widthValue);
        } else {
          const targetColumnIndexes = getTemplateEditorSizeScopeColumnIndexes(selectedCell, scope);

          if (targetColumnIndexes.length === 0) {
            setTemplateEditorStatus("적용할 열을 찾을 수 없습니다.", "warning");
            return;
          }

          targetColumnIndexes.forEach((columnIndex) => {
            setTemplateEditorTableLogicalColumnWidth(selectedCell.closest("table"), columnIndex, widthValue);
          });
        }
      }

      if (heightValue !== null) {
        if (!Number.isFinite(heightValue) || heightValue < TEMPLATE_EDITOR_TABLE_MIN_SIZE) {
          setTemplateEditorStatus(`셀 세로 길이는 ${TEMPLATE_EDITOR_TABLE_MIN_SIZE}px 이상으로 입력하세요.`, "warning");
          return;
        }

        const rowIndexesByTable = new Map();

        targetCells.forEach((cell) => {
          const table = cell.closest?.("table") || null;
          const rowElement = cell.parentElement;
          const rowIndex = table && rowElement ? Array.from(table.rows || []).indexOf(rowElement) : -1;

          if (table && rowIndex >= 0) {
            const rowIndexes = rowIndexesByTable.get(table) || new Set();

            rowIndexes.add(rowIndex);
            rowIndexesByTable.set(table, rowIndexes);
            return;
          }

          cell.style.height = `${heightValue}px`;
          if (rowElement) {
            rowElement.style.height = `${heightValue}px`;
          }
        });

        rowIndexesByTable.forEach((rowIndexes, table) => {
          rowIndexes.forEach((rowIndex) => {
            setTemplateEditorTableLogicalRowHeight(table, rowIndex, heightValue);
          });
        });
      }

      focusTemplateEditorCell(selectedCell);
      syncTemplateEditorContent();
      updateTemplateTableControls();
    }

    return Object.freeze({
      applyTemplateEditorCellShading,
      applyTemplateTableSize,
      equalizeTemplateTableColumnWidths,
      equalizeTemplateTableRowHeights,
      getTemplateEditorMedianValue,
    });
  }

  return Object.freeze({
    createTemplateEditorTableSizingController,
  });
});
