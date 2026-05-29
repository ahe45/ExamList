import { escapeHtml } from "../../app/html-utils.js";
import { buildDocumentTokenHtml } from "./document-editor.js";
import { buildDocumentGeneratedObjectHtml } from "./document-generated-objects.js";
import { createDocumentTokenDeletionActions } from "./document-token-deletion-actions.js";

const documentObjectMinimumSize = 5;
const documentInsertedTokenSelector = [
  ".template-token[data-template-tag-value]",
  "[data-template-token='true']",
].join(",");
const documentInsertionStyleSourceSelector = [
  ".template-token[data-template-tag-value]",
  "[data-template-token='true']",
  "span",
  "font",
  "b",
  "strong",
  "em",
  "i",
  "u",
  "s",
  "small",
  "mark",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "blockquote",
  "div",
  "td",
  "th",
].join(",");

export function createDocumentInsertionActions({
  appState,
  getDocumentNodeMaxOffset,
  getDocumentSurfaceByPageId,
  getLastDocumentSelectionRange,
  moveDocumentCaretToEnd,
  rememberDocumentRange,
  rememberDocumentSelection,
  restoreDocumentSelection,
  syncSelectedPageDocumentHtml,
}) {
  function getDocumentInsertionCell(range, surface) {
    const startElement =
      range?.startContainer?.nodeType === Node.ELEMENT_NODE
        ? range.startContainer
        : range?.startContainer?.parentElement || null;
    const cellElement = startElement?.closest?.("td, th") || null;

    return cellElement && surface?.contains(cellElement) ? cellElement : null;
  }

  function getDocumentElementFromNode(node) {
    if (!node) {
      return null;
    }

    return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement || null;
  }

  function getDocumentInsertionStyleSource(range, insertionCell, surface) {
    const startElement = getDocumentElementFromNode(range?.startContainer);
    const sourceElement =
      startElement?.closest?.(documentInsertionStyleSourceSelector) ||
      insertionCell ||
      null;

    if (
      sourceElement instanceof HTMLElement &&
      sourceElement !== surface &&
      surface?.contains?.(sourceElement)
    ) {
      return sourceElement;
    }

    return insertionCell instanceof HTMLElement && surface?.contains?.(insertionCell) ? insertionCell : null;
  }

  function getDocumentInsertionStyleValue(sourceElement, propertyName) {
    const inlineValue = String(sourceElement?.style?.[propertyName] || "").trim();

    if (inlineValue) {
      return inlineValue;
    }

    return String(window.getComputedStyle(sourceElement)?.[propertyName] || "").trim();
  }

  function setDocumentInsertedTokenStyle(tokenElement, propertyName, value) {
    const normalizedValue = String(value || "").trim();

    if (!normalizedValue) {
      tokenElement.style.removeProperty(propertyName.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`));
      return;
    }

    tokenElement.style[propertyName] = normalizedValue;
  }

  function applyDocumentInsertedTokenContextStyle(fragment, range, insertionCell, surface) {
    if (!fragment?.querySelectorAll || !surface) {
      return;
    }

    const tokenElements = Array.from(fragment.querySelectorAll(documentInsertedTokenSelector));

    if (!tokenElements.length) {
      return;
    }

    const sourceElement = getDocumentInsertionStyleSource(range, insertionCell, surface);

    if (!sourceElement) {
      return;
    }

    tokenElements.forEach((tokenElement) => {
      ["fontFamily", "fontSize", "fontStyle", "fontWeight", "lineHeight", "color"].forEach((propertyName) => {
        setDocumentInsertedTokenStyle(
          tokenElement,
          propertyName,
          getDocumentInsertionStyleValue(sourceElement, propertyName),
        );
      });

      const textDecorationLine = getDocumentInsertionStyleValue(sourceElement, "textDecorationLine").toLowerCase();

      if (textDecorationLine && textDecorationLine !== "none") {
        setDocumentInsertedTokenStyle(tokenElement, "textDecorationLine", textDecorationLine);
        setDocumentInsertedTokenStyle(
          tokenElement,
          "textDecorationStyle",
          getDocumentInsertionStyleValue(sourceElement, "textDecorationStyle"),
        );
        setDocumentInsertedTokenStyle(
          tokenElement,
          "textDecorationColor",
          getDocumentInsertionStyleValue(sourceElement, "textDecorationColor"),
        );
      } else {
        tokenElement.style.removeProperty("text-decoration");
        tokenElement.style.removeProperty("text-decoration-line");
        tokenElement.style.removeProperty("text-decoration-style");
        tokenElement.style.removeProperty("text-decoration-color");
      }
    });
  }

  function createDocumentInsertionTableGeometrySnapshot(fragment, insertionCell) {
    if (!fragment?.querySelector?.(documentInsertedTokenSelector) || !(insertionCell instanceof HTMLTableCellElement)) {
      return null;
    }

    const table = insertionCell.closest("table");

    if (!(table instanceof HTMLTableElement)) {
      return null;
    }

    const rows = Array.from(table.rows || []).map((rowElement) => ({
      cells: Array.from(rowElement.cells || []).map((cellElement) => ({
        cellElement,
        height: cellElement.style.height,
      })),
      height: `${Math.max(1, Math.round(rowElement.getBoundingClientRect?.().height || rowElement.offsetHeight || 0))}px`,
      rowElement,
    }));
    const totalHeight = rows.reduce((heightSum, row) => heightSum + (Number.parseFloat(row.height) || 0), 0);

    return {
      rows,
      table,
      tableHeight: table.style.height || (totalHeight > 0 ? `${Math.round(totalHeight)}px` : ""),
    };
  }

  function restoreDocumentInsertionTableGeometrySnapshot(snapshot) {
    const table = snapshot?.table;

    if (!(table instanceof HTMLTableElement) || !table.isConnected) {
      return false;
    }

    snapshot.rows.forEach(({ cells, height, rowElement }) => {
      if (!rowElement?.isConnected || !String(height || "").trim()) {
        return;
      }

      rowElement.style.height = height;
      cells.forEach(({ cellElement, height: cellHeight }) => {
        if (!cellElement?.isConnected) {
          return;
        }

        if (String(cellHeight || "").trim()) {
          cellElement.style.height = cellHeight;
        } else {
          cellElement.style.removeProperty("height");
        }
      });
    });

    if (String(snapshot.tableHeight || "").trim()) {
      table.style.height = snapshot.tableHeight;
    }

    return true;
  }

  function getDocumentRangeRect(range) {
    if (!range) {
      return null;
    }

    const isUsableRect = (rect) =>
      rect &&
      Number.isFinite(rect.left) &&
      Number.isFinite(rect.right) &&
      (rect.left !== 0 || rect.right !== 0 || rect.top !== 0 || rect.bottom !== 0 || rect.width > 0 || rect.height > 0);
    const firstClientRect = Array.from(range.getClientRects?.() || []).find((rect) =>
      isUsableRect(rect),
    );

    if (firstClientRect) {
      return firstClientRect;
    }

    const boundingRect = range.getBoundingClientRect?.();

    return isUsableRect(boundingRect) ? boundingRect : null;
  }

  function getDocumentCellObjectSize(cellElement, range = null) {
    const computedStyle = window.getComputedStyle(cellElement);
    const paddingLeft = Number.parseFloat(computedStyle.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(computedStyle.paddingRight) || 0;
    const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;
    const borderLeft = Number.parseFloat(computedStyle.borderLeftWidth) || 0;
    const borderRight = Number.parseFloat(computedStyle.borderRightWidth) || 0;
    const borderTop = Number.parseFloat(computedStyle.borderTopWidth) || 0;
    const borderBottom = Number.parseFloat(computedStyle.borderBottomWidth) || 0;
    const paddingX =
      paddingLeft +
      paddingRight;
    const paddingY =
      paddingTop +
      paddingBottom;
    const borderX =
      borderLeft +
      borderRight;
    const borderY =
      borderTop +
      borderBottom;
    const cellRect = cellElement.getBoundingClientRect();
    const resolveSize = (candidates) => {
      const value = candidates.find((candidate) => Number.isFinite(candidate) && candidate > 0);

      return Math.max(documentObjectMinimumSize, Math.floor(value || documentObjectMinimumSize));
    };
    const contentWidth = resolveSize([
      cellElement.clientWidth - paddingX,
      cellRect.width - paddingX - borderX,
      cellRect.width,
    ]);
    const contentHeight = resolveSize([
      cellElement.clientHeight - paddingY,
      cellRect.height - paddingY - borderY,
      cellRect.height,
    ]);
    const contentLeft = cellRect.left + borderLeft + paddingLeft;
    const contentRight = Math.max(contentLeft, contentLeft + contentWidth);
    const rangeRect = getDocumentRangeRect(range);
    const caretLeft = rangeRect && Number.isFinite(rangeRect.left)
      ? Math.min(Math.max(rangeRect.left, contentLeft), contentRight)
      : contentLeft;
    const remainingWidth = rangeRect ? Math.floor(contentRight - caretLeft) : contentWidth;

    return {
      height: contentHeight,
      width: Math.max(
        documentObjectMinimumSize,
        Math.min(contentWidth, remainingWidth > 0 ? remainingWidth : documentObjectMinimumSize),
      ),
    };
  }

  function removeBlankDocumentObjectCompanions(fragment) {
    Array.from(fragment.childNodes || []).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && !String(node.textContent || "").replace(/\u00a0/g, " ").trim()) {
        node.remove();
      }
    });

    fragment.querySelectorAll?.("p, div").forEach((element) => {
      const text = String(element.textContent || "").replace(/\u00a0/g, " ").trim();
      const hasOnlyLineBreaks = Array.from(element.childNodes).every((node) =>
        node.nodeType === Node.TEXT_NODE
          ? !String(node.textContent || "").replace(/\u00a0/g, " ").trim()
          : node.nodeType === Node.ELEMENT_NODE && String(node.tagName || "").toLowerCase() === "br",
      );

      if (!text && hasOnlyLineBreaks) {
        element.remove();
      }
    });
  }

  function fitDocumentImagesToInsertionCell(fragment, cellElement, range = null) {
    if (!cellElement || !fragment?.querySelectorAll) {
      return;
    }

    const imageElements = Array.from(fragment.querySelectorAll("img"));

    if (!imageElements.length) {
      return;
    }

    const { height, width } = getDocumentCellObjectSize(cellElement, range);

    imageElements.forEach((imageElement) => {
      imageElement.style.width = `${width}px`;
      imageElement.style.height = `${height}px`;
      imageElement.style.maxWidth = "100%";
      imageElement.style.maxHeight = `${height}px`;
      imageElement.style.display = "inline-block";
      imageElement.style.margin = "0";
      imageElement.style.verticalAlign = "top";

      if (!String(imageElement.style.objectFit || "").trim()) {
        imageElement.style.objectFit = imageElement.classList.contains("template-generated-object")
          ? "fill"
          : "contain";
      }
    });
    removeBlankDocumentObjectCompanions(fragment);
  }

  function insertHtmlAtDocumentSelection(html) {
    const surface = restoreDocumentSelection();

    if (!surface) {
      return;
    }

    let selection = window.getSelection();

    if (!selection) {
      return;
    }

    if (!selection.rangeCount) {
      moveDocumentCaretToEnd(surface);
      selection = window.getSelection();
    }

    if (!selection || !selection.rangeCount) {
      return;
    }

    const range = selection.getRangeAt(0);
    const fragment = range.createContextualFragment(html);
    const insertionCell = getDocumentInsertionCell(range, surface);

    fitDocumentImagesToInsertionCell(fragment, insertionCell, range);
    applyDocumentInsertedTokenContextStyle(fragment, range, insertionCell, surface);
    const tableGeometrySnapshot = createDocumentInsertionTableGeometrySnapshot(fragment, insertionCell);
    const lastNode = fragment.lastChild;

    range.deleteContents();
    range.insertNode(fragment);
    restoreDocumentInsertionTableGeometrySnapshot(tableGeometrySnapshot);

    const nextRange = document.createRange();

    if (lastNode) {
      nextRange.setStartAfter(lastNode);
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      rememberDocumentRange(nextRange, surface.dataset.pageId || "");
    }

    syncSelectedPageDocumentHtml({ render: false });
  }

  function applyDocumentCommand(command, value = "") {
    const surface = restoreDocumentSelection();

    if (!surface || typeof document.execCommand !== "function") {
      return;
    }

    if (command === "formatBlock") {
      document.execCommand(command, false, `<${String(value || "p").trim().toLowerCase()}>`);
    } else {
      document.execCommand(command, false, value);
    }

    rememberDocumentSelection();
    syncSelectedPageDocumentHtml({ render: false });
  }

  function insertDocumentTable(rowCount = 3, columnCount = 2) {
    const normalizedRowCount = Math.min(Math.max(Math.round(Number(rowCount) || 3), 1), 20);
    const normalizedColumnCount = Math.min(Math.max(Math.round(Number(columnCount) || 2), 1), 8);
    const cellPlacementStyle = ' style="border: 1pt solid #000000; vertical-align: middle;"';
    const headerMarkup = Array.from({ length: normalizedColumnCount }, (_item, index) => `<th${cellPlacementStyle}>항목 ${index + 1}</th>`).join("");
    const bodyMarkup = Array.from({ length: normalizedRowCount }, () =>
      `<tr>${Array.from({ length: normalizedColumnCount }, () => `<td${cellPlacementStyle}>내용</td>`).join("")}</tr>`,
    ).join("");

    insertHtmlAtDocumentSelection(`
      <table>
        <thead>
          <tr>${headerMarkup}</tr>
        </thead>
        <tbody>
          ${bodyMarkup}
        </tbody>
      </table>
      <p><br /></p>
    `);
  }

  function insertDocumentDivider() {
    insertHtmlAtDocumentSelection("<hr /><p><br /></p>");
  }

  function insertDocumentImage(sourceValue = "", caption = "이미지") {
    const normalizedSource = String(sourceValue || "").trim();

    if (!normalizedSource) {
      return;
    }

    insertHtmlAtDocumentSelection(`
      <img src="${escapeHtml(normalizedSource)}" alt="${escapeHtml(caption)}" title="${escapeHtml(caption)}" />
      <p><br /></p>
    `);
  }

  function triggerDocumentImageSelection() {
    document.getElementById("templateEditorImageInput")?.click();
  }

  function insertDocumentImageFile(file) {
    if (!file) {
      return;
    }

    const fileReader = new FileReader();

    fileReader.addEventListener("load", () => {
      insertDocumentImage(String(fileReader.result || ""), String(file.name || "이미지"));
    });
    fileReader.readAsDataURL(file);
  }

  function insertDocumentPhoto() {
    insertDocumentImage("{{candidate.photoUrl}}", "수험생 사진");
  }

  function insertDocumentBarcode() {
    insertHtmlAtDocumentSelection(`${buildDocumentGeneratedObjectHtml("barcode")}<p><br /></p>`);
  }

  function insertDocumentQrCode() {
    insertHtmlAtDocumentSelection(`${buildDocumentGeneratedObjectHtml("qrcode")}<p><br /></p>`);
  }

  function insertDataTag(tagKey, displayLabel = "", iconMarkup = "") {
    const tokenHtml = buildDocumentTokenHtml(tagKey, displayLabel, { iconMarkup });

    if (!tokenHtml) {
      return;
    }

    insertHtmlAtDocumentSelection(tokenHtml);
  }

  function getActiveDocumentRange(surface) {
    if (!surface) {
      return null;
    }

    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0 && surface.contains(selection.anchorNode)) {
      return selection.getRangeAt(0);
    }

    const lastDocumentSelectionRange = getLastDocumentSelectionRange();

    if (lastDocumentSelectionRange && surface.contains(lastDocumentSelectionRange.startContainer)) {
      return lastDocumentSelectionRange;
    }

    return null;
  }

  const { handleDocumentTokenDeletion } = createDocumentTokenDeletionActions({
    appState,
    getActiveDocumentRange,
    getDocumentNodeMaxOffset,
    getDocumentSurfaceByPageId,
    rememberDocumentRange,
    syncSelectedPageDocumentHtml,
  });

  return {
    applyDocumentCommand,
    getActiveDocumentRange,
    handleDocumentTokenDeletion,
    insertDataTag,
    insertDocumentBarcode,
    insertDocumentDivider,
    insertDocumentImage,
    insertDocumentImageFile,
    insertDocumentPhoto,
    insertDocumentQrCode,
    insertDocumentTable,
    triggerDocumentImageSelection,
  };
}
