export function getActiveDocumentTableCell() {
  const selection = window.getSelection();

  if (!selection || !selection.rangeCount) {
    return null;
  }

  const selectionContainer = selection.getRangeAt(0).commonAncestorContainer;
  const selectionElement =
    selectionContainer?.nodeType === Node.ELEMENT_NODE
      ? selectionContainer
      : selectionContainer?.parentElement || null;
  const selectionCell = selectionElement?.closest?.("td, th") || null;

  if (selectionCell) {
    return selectionCell;
  }

  const runtimeState = window.ExamListTemplateEditorRuntime?.state?.templateEditor || null;
  const surfaceElement = document.getElementById("templateEditorSurface");
  const runtimeActiveCell = runtimeState?.activeCellElement || runtimeState?.tableSelection?.anchorCell || null;

  if (
    runtimeState?.suppressToolbarSelectionChange &&
    selectionContainer === surfaceElement &&
    runtimeActiveCell?.nodeType === Node.ELEMENT_NODE &&
    surfaceElement?.contains(runtimeActiveCell)
  ) {
    return runtimeActiveCell;
  }

  return null;
}

function getActiveDocumentTableRow() {
  return getActiveDocumentTableCell()?.closest("tr") || null;
}

function getActiveDocumentTable() {
  return getActiveDocumentTableCell()?.closest("table") || null;
}

function getDocumentTableColumnIndex(cellElement) {
  const rowElement = cellElement?.closest("tr");

  if (!rowElement || !cellElement) {
    return -1;
  }

  return Array.from(rowElement.children).indexOf(cellElement);
}

function getDocumentTableRowIndex(rowElement) {
  const tableElement = rowElement?.closest("table");

  if (!tableElement || !rowElement) {
    return -1;
  }

  return Array.from(tableElement.querySelectorAll("tr")).indexOf(rowElement);
}

function getSelectedDocumentTableCells(tableElement, fallbackCell) {
  const selection = window.getSelection();

  if (!tableElement || !selection || !selection.rangeCount) {
    return fallbackCell ? [fallbackCell] : [];
  }

  const range = selection.getRangeAt(0);
  const cells = Array.from(tableElement.querySelectorAll("th, td")).filter((tableCell) => {
    try {
      return range.intersectsNode(tableCell);
    } catch (_error) {
      return false;
    }
  });

  return cells.length ? cells : fallbackCell ? [fallbackCell] : [];
}

function isDocumentTableCellOwnedElement(cellElement, element) {
  const ElementConstructor = cellElement?.ownerDocument?.defaultView?.Element || globalThis.Element;

  return Boolean(ElementConstructor && element instanceof ElementConstructor && element.closest("td, th") === cellElement);
}

function isDocumentTableMergeProtectedElement(element) {
  return Boolean(
    element?.matches?.(
      "table, img, hr, .template-token, .template-generated-object, [data-template-tag-value], [data-template-object-type], [data-candidate-block-grid], [data-candidate-block-instance]",
    ) ||
      element?.closest?.(
        ".template-token, .template-generated-object, [data-template-tag-value], [data-template-object-type], [data-candidate-block-grid], [data-candidate-block-instance]",
      ),
  );
}

function removeDocumentTableCellLineBreaks(cellElement) {
  if (!cellElement) {
    return;
  }

  Array.from(cellElement.querySelectorAll("br")).forEach((lineBreak) => {
    if (isDocumentTableCellOwnedElement(cellElement, lineBreak) && !isDocumentTableMergeProtectedElement(lineBreak)) {
      lineBreak.remove();
    }
  });

  Array.from(cellElement.querySelectorAll("p, div"))
    .reverse()
    .forEach((blockElement) => {
      if (
        !isDocumentTableCellOwnedElement(cellElement, blockElement) ||
        isDocumentTableMergeProtectedElement(blockElement)
      ) {
        return;
      }

      const fragment = blockElement.ownerDocument.createDocumentFragment();

      while (blockElement.firstChild) {
        fragment.appendChild(blockElement.firstChild);
      }

      blockElement.replaceWith(fragment);
    });
}

function isDocumentTableCellEmpty(cellElement) {
  if (!cellElement) {
    return true;
  }

  const normalizedHtml = String(cellElement.innerHTML || "")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, "")
    .trim();

  return normalizedHtml === "" && !cellElement.querySelector("img, table, hr, [data-template-tag-value]");
}

function appendDocumentMergedCellContent(targetCell, sourceCell) {
  if (!targetCell || !sourceCell) {
    return;
  }

  removeDocumentTableCellLineBreaks(targetCell);
  removeDocumentTableCellLineBreaks(sourceCell);

  if (isDocumentTableCellEmpty(sourceCell)) {
    return;
  }

  if (isDocumentTableCellEmpty(targetCell)) {
    targetCell.innerHTML = "";
  }

  Array.from(sourceCell.childNodes).forEach((node) => {
    targetCell.appendChild(node);
  });

  removeDocumentTableCellLineBreaks(targetCell);
}

function distributeDocumentTableTotalSize(totalSize, targetCount) {
  const safeCount = Math.max(1, Number(targetCount) || 1);
  const safeTotalSize = Math.max(0, Number(totalSize) || 0);
  const baseSize = safeTotalSize / safeCount;

  return Array.from({ length: safeCount }, () => baseSize);
}

function equalizeDocumentTableColumnWidths(tableElement, cellElement) {
  const selectedCells = getSelectedDocumentTableCells(tableElement, cellElement);
  const targetColumnIndexes = Array.from(
    new Set(selectedCells.map((tableCell) => getDocumentTableColumnIndex(tableCell)).filter((index) => index >= 0)),
  ).sort((leftIndex, rightIndex) => leftIndex - rightIndex);

  if (!targetColumnIndexes.length) {
    return;
  }

  const firstRowElement = tableElement.querySelector("tr");
  const currentWidths = targetColumnIndexes.map((columnIndex) => {
    const referenceCell = firstRowElement?.children?.[columnIndex] || selectedCells.find((tableCell) => getDocumentTableColumnIndex(tableCell) === columnIndex);

    return referenceCell ? referenceCell.getBoundingClientRect().width : 0;
  });
  const equalizedWidths = distributeDocumentTableTotalSize(
    currentWidths.reduce((totalWidth, width) => totalWidth + width, 0),
    targetColumnIndexes.length,
  );

  targetColumnIndexes.forEach((columnIndex, index) => {
    const nextWidth = `${equalizedWidths[index].toFixed(2)}px`;

    tableElement.querySelectorAll("tr").forEach((tableRow) => {
      const tableCell = tableRow.children[columnIndex];

      if (tableCell) {
        tableCell.style.width = nextWidth;
      }
    });
  });
}

function equalizeDocumentTableRowHeights(tableElement, cellElement) {
  const selectedCells = getSelectedDocumentTableCells(tableElement, cellElement);
  const targetRowIndexes = Array.from(
    new Set(selectedCells.map((tableCell) => getDocumentTableRowIndex(tableCell.closest("tr"))).filter((index) => index >= 0)),
  ).sort((leftIndex, rightIndex) => leftIndex - rightIndex);
  const rows = Array.from(tableElement.querySelectorAll("tr"));

  if (!targetRowIndexes.length) {
    return;
  }

  const equalizedHeights = distributeDocumentTableTotalSize(
    targetRowIndexes.reduce((totalHeight, rowIndex) => totalHeight + (rows[rowIndex]?.getBoundingClientRect().height || 0), 0),
    targetRowIndexes.length,
  );

  targetRowIndexes.forEach((rowIndex, index) => {
    const tableRow = rows[rowIndex];

    if (tableRow) {
      tableRow.style.height = `${equalizedHeights[index].toFixed(2)}px`;
    }
  });
}

function placeCaretInsideElement(element, onSelectionChange = null) {
  if (!element) {
    return;
  }

  const selection = window.getSelection();

  if (!selection) {
    return;
  }

  const range = document.createRange();

  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  onSelectionChange?.();
}

function getDocumentTableCellVerticalAlign(cellElement) {
  const verticalAlignValue = String(
    cellElement?.style?.verticalAlign || (cellElement ? window.getComputedStyle(cellElement).verticalAlign : "") || "",
  ).trim().toLowerCase();

  return ["top", "middle", "bottom"].includes(verticalAlignValue) ? verticalAlignValue : "middle";
}

export function applyDocumentTableAction(action, { onMutate = null, onSelectionChange = null } = {}) {
  const tableElement = getActiveDocumentTable();
  const rowElement = getActiveDocumentTableRow();
  const cellElement = getActiveDocumentTableCell();

  if (!tableElement || !rowElement || !cellElement) {
    return;
  }

  const columnIndex = getDocumentTableColumnIndex(cellElement);

  if (action === "insert-row-before" || action === "insert-row-after") {
    const nextRowElement = rowElement.cloneNode(true);

    nextRowElement.querySelectorAll("th, td").forEach((cell) => {
      const verticalAlignValue = getDocumentTableCellVerticalAlign(cell);

      cell.innerHTML = "내용";
      cell.removeAttribute("style");
      cell.style.verticalAlign = verticalAlignValue;
    });

    rowElement[action === "insert-row-before" ? "before" : "after"](nextRowElement);
    placeCaretInsideElement(nextRowElement.querySelector("th, td"), onSelectionChange);
    onMutate?.();
    return;
  }

  if (action === "insert-column-before" || action === "insert-column-after") {
    tableElement.querySelectorAll("tr").forEach((tableRow) => {
      const referenceCell = tableRow.children[columnIndex];
      const nextCell = document.createElement(referenceCell?.tagName === "TH" ? "th" : "td");

      nextCell.innerHTML = referenceCell?.tagName === "TH" ? `항목 ${columnIndex + (action === "insert-column-before" ? 1 : 2)}` : "내용";
      nextCell.style.verticalAlign = getDocumentTableCellVerticalAlign(referenceCell);
      if (referenceCell) {
        referenceCell[action === "insert-column-before" ? "before" : "after"](nextCell);
      } else {
        tableRow.append(nextCell);
      }
    });
    onMutate?.();
    return;
  }

  if (action === "delete-row") {
    if (tableElement.querySelectorAll("tr").length <= 1) {
      return;
    }

    const nextFocusCell = rowElement.nextElementSibling?.querySelector("th, td") || rowElement.previousElementSibling?.querySelector("th, td");

    rowElement.remove();
    placeCaretInsideElement(nextFocusCell, onSelectionChange);
    onMutate?.();
    return;
  }

  if (action === "delete-column") {
    const headerRowLength = Math.max(...Array.from(tableElement.querySelectorAll("tr")).map((tableRow) => tableRow.children.length));

    if (headerRowLength <= 1) {
      return;
    }

    tableElement.querySelectorAll("tr").forEach((tableRow) => {
      tableRow.children[columnIndex]?.remove();
    });
    onMutate?.();
    return;
  }

  if (action === "merge-selection") {
    const nextCell = cellElement.nextElementSibling;

    if (!nextCell) {
      return;
    }

    const currentColSpan = Number(cellElement.getAttribute("colspan")) || 1;

    cellElement.setAttribute("colspan", String(currentColSpan + (Number(nextCell.getAttribute("colspan")) || 1)));
    appendDocumentMergedCellContent(cellElement, nextCell);
    removeDocumentTableCellLineBreaks(cellElement);
    nextCell.remove();
    onMutate?.();
    return;
  }

  if (action === "equalize-column-widths") {
    equalizeDocumentTableColumnWidths(tableElement, cellElement);
    onMutate?.();
    return;
  }

  if (action === "equalize-row-heights") {
    equalizeDocumentTableRowHeights(tableElement, cellElement);
    onMutate?.();
    return;
  }

  if (action === "cell-vertical-align-top" || action === "cell-vertical-align-middle" || action === "cell-vertical-align-bottom") {
    const verticalAlignValue = action === "cell-vertical-align-top" ? "top" : action === "cell-vertical-align-middle" ? "middle" : "bottom";

    cellElement.style.verticalAlign = verticalAlignValue;
    onMutate?.();
  }
}

export function splitCurrentDocumentCell({ onMutate = null } = {}) {
  const cellElement = getActiveDocumentTableCell();
  const rowElement = getActiveDocumentTableRow();
  const splitCountInput = document.getElementById("templateEditorCellSplitCount");
  const axisElement = document.querySelector('input[name="templateEditorCellSplitAxis"]:checked');

  if (!cellElement || !rowElement || !splitCountInput) {
    return;
  }

  const splitCount = Math.min(Math.max(Math.round(Number(splitCountInput.value) || 2), 2), 12);
  const axis = axisElement?.value === "row" ? "row" : "column";

  if (axis === "column") {
    cellElement.removeAttribute("colspan");
    cellElement.innerHTML = "내용";

    for (let index = 1; index < splitCount; index += 1) {
      const nextCell = document.createElement(cellElement.tagName.toLowerCase());

      nextCell.innerHTML = "내용";
      nextCell.style.verticalAlign = getDocumentTableCellVerticalAlign(cellElement);
      cellElement.after(nextCell);
    }
  } else {
    for (let index = 1; index < splitCount; index += 1) {
      const newRow = document.createElement("tr");

      Array.from(rowElement.children).forEach((sourceCell, cellIndex) => {
        const nextCell = document.createElement(sourceCell.tagName.toLowerCase());

        nextCell.innerHTML = cellIndex === getDocumentTableColumnIndex(cellElement) ? "내용" : "&nbsp;";
        nextCell.style.verticalAlign = getDocumentTableCellVerticalAlign(sourceCell);
        newRow.append(nextCell);
      });
      rowElement.after(newRow);
    }
  }

  onMutate?.();
}
