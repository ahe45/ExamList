import { showToast } from "../../app/toast.js";
import {
  clampObjectAlignmentValue,
  getObjectAlignmentCanvasMetrics,
  getObjectAlignmentDocumentElement,
  getObjectElementSize,
  getObjectTableCellContentSize,
  getObjectTableCellElement,
  getSelectedObjectAlignmentElements,
  isObjectAlignmentTableElement,
  isObjectEditorReadOnly,
  prepareObjectAlignmentItems,
  setObjectAlignmentItemPosition,
  syncObjectAlignmentTableFlow,
  syncObjectAlignmentMutation,
} from "./object-alignment-runtime.js";
import { templateEditorObjectMinimumSize } from "./object-toolbar-constants.js";
import { createObjectSizeToolbar, insertObjectToolbarSection } from "./object-toolbar-ui.js";

function normalizeObjectSizeInputValue(value) {
  if (!String(value || "").trim()) {
    return null;
  }

  const numericValue = Math.round(Number(value));

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Math.max(templateEditorObjectMinimumSize, numericValue);
}

function lockObjectTableCellHeight(cellElement) {
  if (!(cellElement instanceof HTMLElement)) {
    return;
  }

  const cellRect = cellElement.getBoundingClientRect();
  const rowElement = cellElement.parentElement;
  const cellHeight = Math.max(templateEditorObjectMinimumSize, Math.round(cellRect.height || cellElement.offsetHeight || 0));

  if (cellHeight > 0) {
    cellElement.style.height = `${cellHeight}px`;
  }

  if (rowElement instanceof HTMLTableRowElement && Number(cellElement.rowSpan || 1) <= 1) {
    const rowRect = rowElement.getBoundingClientRect();
    const rowHeight = Math.max(cellHeight, Math.round(rowRect.height || rowElement.offsetHeight || 0));

    if (rowHeight > 0) {
      rowElement.style.height = `${rowHeight}px`;
      Array.from(rowElement.cells || []).forEach((rowCellElement) => {
        rowCellElement.style.height = `${rowHeight}px`;
      });
    }
  }
}

function getObjectTableUtils() {
  return window.ExamListEditorTableUtils || null;
}

function parseObjectSizePixelValue(value, fallback = 0) {
  const parsedValue = Number.parseFloat(String(value || "").trim());

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function parseObjectSizeInlinePixelValue(value, fallback = 0) {
  const rawValue = String(value || "").trim();

  return /^-?\d+(?:\.\d+)?px$/i.test(rawValue) ? parseObjectSizePixelValue(rawValue, fallback) : fallback;
}

function getObjectTableCollapsedBorderAdjustment(tableElement) {
  if (!(tableElement instanceof HTMLTableElement)) {
    return 0;
  }

  const tableStyle = window.getComputedStyle(tableElement);

  if (String(tableStyle.borderCollapse || "").trim().toLowerCase() !== "collapse") {
    return 0;
  }

  const rows = Array.from(tableElement.rows || []);
  const leftCell = rows.map((rowElement) => rowElement.cells?.[0]).find(Boolean);
  const rightCell = rows
    .map((rowElement) => rowElement.cells?.[Math.max(0, (rowElement.cells?.length || 1) - 1)])
    .find(Boolean);
  const leftStyle = leftCell ? window.getComputedStyle(leftCell) : null;
  const rightStyle = rightCell ? window.getComputedStyle(rightCell) : null;

  return Math.max(
    parseObjectSizePixelValue(tableStyle.borderLeftWidth),
    parseObjectSizePixelValue(tableStyle.borderRightWidth),
    parseObjectSizePixelValue(leftStyle?.borderLeftWidth),
    parseObjectSizePixelValue(rightStyle?.borderRightWidth),
  );
}

function getObjectTableRenderedTargetWidth(tableElement, targetWidth) {
  const inlineWidth = parseObjectSizeInlinePixelValue(tableElement?.style?.width, 0);
  const rectWidth = tableElement?.getBoundingClientRect?.().width || 0;
  const renderedWidthAdjustment = inlineWidth > 0 && rectWidth > inlineWidth
    ? Math.ceil(rectWidth - inlineWidth)
    : 0;

  return Math.max(
    templateEditorObjectMinimumSize,
    Math.round(targetWidth) -
      Math.max(
        renderedWidthAdjustment,
        Math.max(0, Math.ceil(getObjectTableCollapsedBorderAdjustment(tableElement))),
      ),
  );
}

function normalizeObjectTableSegmentSizes(sizes, targetSize, minimumSize = templateEditorObjectMinimumSize) {
  const itemCount = Math.max(1, sizes.length);
  const safeMinimumSize = Math.max(1, Math.round(minimumSize) || 1);
  const safeTargetSize = Math.max(safeMinimumSize * itemCount, Math.round(targetSize) || 0);
  const normalizedSizes = sizes.map((size) => Math.max(safeMinimumSize, Math.round(Number(size) || 0)));

  if (sizes.length === 0) {
    return [];
  }

  const isEvenSource =
    normalizedSizes.length > 0 &&
    Math.max(...normalizedSizes) - Math.min(...normalizedSizes) <= 1;

  if (isEvenSource) {
    const baseSize = Math.max(safeMinimumSize, Math.floor(safeTargetSize / itemCount));
    let remainder = safeTargetSize - baseSize * itemCount;

    return Array.from({ length: itemCount }, () => {
      const nextSize = baseSize + (remainder > 0 ? 1 : 0);

      remainder -= 1;
      return Math.max(safeMinimumSize, nextSize);
    });
  }

  const extraSizes = normalizedSizes.map((size) => Math.max(0, size - safeMinimumSize));
  const totalExtraSize = extraSizes.reduce((sum, size) => sum + size, 0);
  const targetExtraSize = safeTargetSize - safeMinimumSize * itemCount;
  let usedSize = 0;
  const nextSizes = normalizedSizes.map((_size, index) => {
    const isLast = index === normalizedSizes.length - 1;
    const nextSize = isLast
      ? safeTargetSize - usedSize
      : safeMinimumSize +
        Math.round(targetExtraSize * (totalExtraSize > 0 ? extraSizes[index] / totalExtraSize : 1 / itemCount));

    usedSize += nextSize;
    return Math.max(safeMinimumSize, nextSize);
  });
  let overflow = nextSizes.reduce((sum, size) => sum + size, 0) - safeTargetSize;

  for (let index = nextSizes.length - 1; index >= 0 && overflow > 0; index -= 1) {
    const reduction = Math.min(overflow, Math.max(0, nextSizes[index] - safeMinimumSize));

    nextSizes[index] -= reduction;
    overflow -= reduction;
  }

  const deficit = safeTargetSize - nextSizes.reduce((sum, size) => sum + size, 0);

  if (deficit > 0) {
    nextSizes[nextSizes.length - 1] += deficit;
  }

  return nextSizes;
}

function getObjectTableColumnWidths(tableElement, columns, cellMap, tableUtils) {
  return columns.map((columnElement, columnIndex) =>
    Math.max(
      templateEditorObjectMinimumSize,
      parseObjectSizePixelValue(
        columnElement.style.width,
        Math.round(tableUtils?.getTemplateEditorMeasuredColumnWidth?.(cellMap, columnIndex) || columnElement.getBoundingClientRect?.().width || 0),
      ),
    ),
  );
}

function getObjectTableRowHeights(tableElement) {
  return Array.from(tableElement?.rows || []).map((rowElement) =>
    Math.max(
      templateEditorObjectMinimumSize,
      parseObjectSizePixelValue(rowElement.style.height, Math.round(rowElement.getBoundingClientRect?.().height || 0)),
    ),
  );
}

function syncObjectTableRowGroupHeights(tableElement, rowHeights) {
  const rowIndexByElement = new Map(Array.from(tableElement.rows || []).map((rowElement, rowIndex) => [rowElement, rowIndex]));
  const rowGroups = [
    tableElement.tHead,
    ...Array.from(tableElement.tBodies || []),
    tableElement.tFoot,
  ].filter(Boolean);

  rowGroups.forEach((rowGroupElement) => {
    const rowGroupHeight = Array.from(rowGroupElement.rows || []).reduce((heightSum, rowElement) => {
      const rowIndex = rowIndexByElement.get(rowElement);

      return heightSum + Math.max(0, rowHeights[rowIndex] || 0);
    }, 0);

    if (rowGroupHeight > 0) {
      rowGroupElement.style.height = `${rowGroupHeight}px`;
    }
  });
}

function applyObjectTableWidth(tableElement, targetWidth) {
  const tableUtils = getObjectTableUtils();
  const renderedTargetWidth = getObjectTableRenderedTargetWidth(tableElement, targetWidth);

  if (!(tableElement instanceof HTMLTableElement) || !tableUtils?.ensureTemplateEditorTableColGroup) {
    tableElement.style.width = `${renderedTargetWidth}px`;
    tableElement.style.maxWidth = "none";
    return true;
  }

  const { columns, cellMap } = tableUtils.ensureTemplateEditorTableColGroup(tableElement);

  if (!columns.length) {
    tableElement.style.width = `${renderedTargetWidth}px`;
    tableElement.style.maxWidth = "none";
    return true;
  }

  const nextWidths = normalizeObjectTableSegmentSizes(
    getObjectTableColumnWidths(tableElement, columns, cellMap, tableUtils),
    renderedTargetWidth,
    templateEditorObjectMinimumSize,
  );

  columns.forEach((columnElement, columnIndex) => {
    columnElement.style.width = `${nextWidths[columnIndex] || templateEditorObjectMinimumSize}px`;
  });

  tableUtils.buildTemplateTableCellMap?.(tableElement)?.entries?.forEach((entry, cellElement) => {
    const cellWidth = nextWidths
      .slice(entry.colIndex, entry.colIndex + entry.colSpan)
      .reduce((widthSum, widthValue) => widthSum + Math.max(0, widthValue || 0), 0);

    if (cellWidth > 0) {
      cellElement.style.width = `${cellWidth}px`;
    }
  });

  tableUtils.syncTemplateEditorTableWidth?.(tableElement, columns);
  tableElement.style.maxWidth = "none";
  return true;
}

function applyObjectTableHeight(tableElement, targetHeight) {
  const tableUtils = getObjectTableUtils();
  const rows = Array.from(tableElement?.rows || []);

  if (!(tableElement instanceof HTMLTableElement) || !rows.length) {
    tableElement.style.height = `${Math.max(templateEditorObjectMinimumSize, Math.round(targetHeight) || 0)}px`;
    return true;
  }

  const nextHeights = normalizeObjectTableSegmentSizes(
    getObjectTableRowHeights(tableElement),
    targetHeight,
    templateEditorObjectMinimumSize,
  );

  rows.forEach((rowElement, rowIndex) => {
    rowElement.style.height = `${nextHeights[rowIndex] || templateEditorObjectMinimumSize}px`;
  });

  tableUtils?.buildTemplateTableCellMap?.(tableElement)?.entries?.forEach((entry, cellElement) => {
    const cellHeight = nextHeights
      .slice(entry.rowIndex, entry.rowIndex + entry.rowSpan)
      .reduce((heightSum, heightValue) => heightSum + Math.max(0, heightValue || 0), 0);

    if (cellHeight > 0) {
      cellElement.style.height = `${cellHeight}px`;
      cellElement.style.minHeight = `${cellHeight}px`;
    }
  });

  syncObjectTableRowGroupHeights(tableElement, nextHeights);
  tableElement.style.height = `${nextHeights.reduce((heightSum, heightValue) => heightSum + Math.max(0, heightValue || 0), 0)}px`;
  return true;
}

export function applyObjectTableSize(tableElement, { height = null, width = null } = {}) {
  let didApply = false;

  if (Number.isFinite(width)) {
    didApply = applyObjectTableWidth(tableElement, width) || didApply;
  }

  if (Number.isFinite(height)) {
    didApply = applyObjectTableHeight(tableElement, height) || didApply;
  }

  return didApply;
}

function applyObjectSizeToSelection(editor, surfaceElement, { height = null, width = null } = {}) {
  const selectedElements = getSelectedObjectAlignmentElements(surfaceElement);

  if (!selectedElements.length) {
    showToast("크기를 변경할 개체를 선택해 주세요.", "warning");
    return false;
  }

  const hasWidth = Number.isFinite(width);
  const hasHeight = Number.isFinite(height);

  if (!hasWidth && !hasHeight) {
    showToast("가로 또는 세로 크기를 입력해 주세요.", "warning");
    return false;
  }

  const documentElement = getObjectAlignmentDocumentElement(surfaceElement);

  if (!(documentElement instanceof HTMLElement)) {
    showToast("크기 기준이 되는 캔버스를 찾을 수 없습니다.", "warning");
    return false;
  }

  const canvasMetrics = getObjectAlignmentCanvasMetrics(documentElement);
  const cellElements = selectedElements.filter((element) => getObjectTableCellElement(element, surfaceElement));
  const canvasElements = selectedElements.filter((element) => !getObjectTableCellElement(element, surfaceElement));
  const items = prepareObjectAlignmentItems(canvasElements, documentElement, canvasMetrics);

  if (!items.length && !cellElements.length) {
    showToast("크기를 변경할 개체를 선택해 주세요.", "warning");
    return false;
  }

  cellElements.forEach((element) => {
    const cellElement = getObjectTableCellElement(element, surfaceElement);
    const cellSize = getObjectTableCellContentSize(element, surfaceElement, templateEditorObjectMinimumSize);
    const currentSize = getObjectElementSize(element, surfaceElement);
    const maxWidth = Math.max(templateEditorObjectMinimumSize, cellSize?.width || templateEditorObjectMinimumSize);
    const maxHeight = Math.max(templateEditorObjectMinimumSize, cellSize?.height || templateEditorObjectMinimumSize);
    const nextWidth = Math.min(
      maxWidth,
      Math.max(templateEditorObjectMinimumSize, hasWidth ? width : currentSize.width),
    );
    const nextHeight = Math.min(
      maxHeight,
      Math.max(templateEditorObjectMinimumSize, hasHeight ? height : currentSize.height),
    );

    lockObjectTableCellHeight(cellElement);
    element.style.display = "inline-block";
    element.style.width = `${nextWidth}px`;
    element.style.height = `${nextHeight}px`;
    element.style.maxWidth = "100%";
    element.style.maxHeight = "100%";
    element.style.margin = "0";

    if (!String(element.style.verticalAlign || "").trim()) {
      element.style.verticalAlign = "top";
    }
  });

  items.forEach((item) => {
    const nextWidth = hasWidth
      ? clampObjectAlignmentValue(width, Math.max(templateEditorObjectMinimumSize, canvasMetrics.width - item.left))
      : item.width;
    const nextHeight = hasHeight
      ? clampObjectAlignmentValue(height, Math.max(templateEditorObjectMinimumSize, canvasMetrics.height - item.top))
      : item.height;

    if (isObjectAlignmentTableElement(item.element, surfaceElement)) {
      applyObjectTableSize(item.element, {
        height: hasHeight ? Math.max(templateEditorObjectMinimumSize, nextHeight) : null,
        width: hasWidth ? Math.max(templateEditorObjectMinimumSize, nextWidth) : null,
      });

      const actualSize = getObjectElementSize(item.element, surfaceElement);

      item.width = actualSize.width;
      item.height = actualSize.height;
    } else {
      item.width = Math.max(templateEditorObjectMinimumSize, nextWidth);
      item.height = Math.max(templateEditorObjectMinimumSize, nextHeight);
      item.element.style.width = `${item.width}px`;
      item.element.style.height = `${item.height}px`;
    }

    setObjectAlignmentItemPosition(item, item.left, item.top, canvasMetrics);
    syncObjectAlignmentTableFlow(item.element, surfaceElement, {
      height: item.height,
      top: item.top,
    });
  });

  syncObjectAlignmentMutation(editor, surfaceElement, [
    ...cellElements,
    ...items.map((item) => item.element),
  ]);
  return true;
}


export function bindObjectSizeControls({ editor, surfaceElement, toolbarHost }) {
  if (!editor || !surfaceElement || !toolbarHost) {
    return null;
  }

  toolbarHost.querySelector(".examlist-object-size-control")?.remove();

  const sizeToolbar = createObjectSizeToolbar();
  insertObjectToolbarSection(toolbarHost, sizeToolbar, ".examlist-object-insert-control");

  const widthInput = sizeToolbar.querySelector('[data-examlist-object-size="width"]');
  const heightInput = sizeToolbar.querySelector('[data-examlist-object-size="height"]');
  const applyButton = sizeToolbar.querySelector("[data-examlist-object-size-apply]");
  const getInputs = () => [widthInput, heightInput].filter(Boolean);
  const setSizeFieldEmptyState = (input, isEmpty) => {
    const wrap = input?.closest?.(".examlist-object-size-input-wrap") || null;
    const unitElement = wrap?.querySelector("[data-examlist-object-size-unit]") || null;

    wrap?.classList.toggle("is-empty", Boolean(isEmpty));

    if (unitElement) {
      unitElement.textContent = "px";
    }
  };
  const setControlDisabled = (isDisabled) => {
    getInputs().forEach((input) => {
      input.disabled = isDisabled;
    });

    if (applyButton) {
      applyButton.disabled = isDisabled;
    }
  };
  const syncSizeControls = () => {
    const selectedElements = getSelectedObjectAlignmentElements(surfaceElement);
    const isDisabled = isObjectEditorReadOnly(surfaceElement) || selectedElements.length === 0;

    setControlDisabled(isDisabled);

    if (isDisabled) {
      getInputs().forEach((input) => {
        input.value = "";
        input.placeholder = "-";
        setSizeFieldEmptyState(input, true);
      });
      return;
    }

    getInputs().forEach((input) => {
      setSizeFieldEmptyState(input, false);
    });

    const sizes = selectedElements.map((element) => getObjectElementSize(element, surfaceElement));
    const firstSize = sizes[0] || { height: "", width: "" };
    const hasSameWidth = sizes.every((size) => size.width === firstSize.width);
    const hasSameHeight = sizes.every((size) => size.height === firstSize.height);

    if (widthInput && document.activeElement !== widthInput) {
      widthInput.value = hasSameWidth ? String(firstSize.width) : "";
      widthInput.placeholder = hasSameWidth ? "px" : "혼합";
    }

    if (heightInput && document.activeElement !== heightInput) {
      heightInput.value = hasSameHeight ? String(firstSize.height) : "";
      heightInput.placeholder = hasSameHeight ? "px" : "혼합";
    }
  };
  const scheduleSizeControlSync = () => {
    window.requestAnimationFrame(syncSizeControls);
  };
  const applyFromControls = (changedInput = null) => {
    if (isObjectEditorReadOnly(surfaceElement)) {
      return false;
    }

    const nextWidth = changedInput === heightInput ? null : normalizeObjectSizeInputValue(widthInput?.value);
    const nextHeight = changedInput === widthInput ? null : normalizeObjectSizeInputValue(heightInput?.value);
    const didApply = applyObjectSizeToSelection(editor, surfaceElement, {
      height: nextHeight,
      width: nextWidth,
    });

    if (didApply) {
      scheduleSizeControlSync();
    }

    return didApply;
  };
  const handleControlChange = (event) => {
    const input = event.target?.closest?.("[data-examlist-object-size]");

    if (!input || !sizeToolbar.contains(input)) {
      return;
    }

    applyFromControls(input);
  };
  const handleToolbarClick = (event) => {
    const button = event.target?.closest?.("[data-examlist-object-size-apply]");

    if (!button || !sizeToolbar.contains(button)) {
      return;
    }

    event.preventDefault();
    applyFromControls();
  };
  const handleKeyDown = (event) => {
    const input = event.target?.closest?.("[data-examlist-object-size]");

    if (!input || !sizeToolbar.contains(input) || event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    applyFromControls(input);
  };

  sizeToolbar.addEventListener("change", handleControlChange);
  sizeToolbar.addEventListener("click", handleToolbarClick);
  sizeToolbar.addEventListener("keydown", handleKeyDown);
  surfaceElement.addEventListener("pointerdown", scheduleSizeControlSync, true);
  surfaceElement.addEventListener("input", scheduleSizeControlSync);
  surfaceElement.addEventListener("keyup", scheduleSizeControlSync);
  document.addEventListener("selectionchange", scheduleSizeControlSync);
  window.addEventListener("pointerup", scheduleSizeControlSync);
  window.addEventListener("pointercancel", scheduleSizeControlSync);
  window.addEventListener("resize", scheduleSizeControlSync);
  syncSizeControls();

  return () => {
    sizeToolbar.removeEventListener("change", handleControlChange);
    sizeToolbar.removeEventListener("click", handleToolbarClick);
    sizeToolbar.removeEventListener("keydown", handleKeyDown);
    surfaceElement.removeEventListener("pointerdown", scheduleSizeControlSync, true);
    surfaceElement.removeEventListener("input", scheduleSizeControlSync);
    surfaceElement.removeEventListener("keyup", scheduleSizeControlSync);
    document.removeEventListener("selectionchange", scheduleSizeControlSync);
    window.removeEventListener("pointerup", scheduleSizeControlSync);
    window.removeEventListener("pointercancel", scheduleSizeControlSync);
    window.removeEventListener("resize", scheduleSizeControlSync);
    sizeToolbar.remove();
  };
}
