export function getDocumentContentRoot(surface) {
  if (!surface) {
    return null;
  }

  return surface.querySelector(".template-doc") || surface;
}

function getDocumentContentRectBoundary(documentRoot) {
  const boundary = {
    bottom: 0,
    hasRect: false,
    left: Number.POSITIVE_INFINITY,
    right: 0,
    top: Number.POSITIVE_INFINITY,
  };

  function includeRect(rect) {
    if (!rect || (!rect.width && !rect.height)) {
      return;
    }

    boundary.bottom = Math.max(boundary.bottom, rect.bottom);
    boundary.hasRect = true;
    boundary.left = Math.min(boundary.left, rect.left);
    boundary.right = Math.max(boundary.right, rect.right);
    boundary.top = Math.min(boundary.top, rect.top);
  }

  const transientMeasurementSelector =
    ".template-editor-image-selection, .template-editor-image-resize-handle, .examlist-object-selection, .examlist-object-resize-handle, .template-editor-table-selection, .template-editor-table-handle, .template-editor-table-move-handle, .template-editor-table-select-handle, [data-candidate-block-grid-resize-handle], [data-candidate-block-grid-move-handle]";
  const candidateBlockGridMeasurementSelector = "[data-candidate-block-grid], .examlist-candidate-block-grid";
  const excludedTextMeasurementSelector = `${transientMeasurementSelector}, ${candidateBlockGridMeasurementSelector}`;

  function isEmptyTrailingBlockElement(element) {
    if (!(element instanceof Element) || !element.matches("p")) {
      return false;
    }

    const hasOnlyEmptyInlineContent = Array.from(element.childNodes || []).every((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return !String(node.textContent || "").replace(/\u00a0/g, " ").trim();
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return true;
      }

      return node.matches("br");
    });

    if (!hasOnlyEmptyInlineContent) {
      return false;
    }

    let nextNode = element.nextSibling;

    while (nextNode) {
      if (nextNode.nodeType === Node.TEXT_NODE) {
        if (String(nextNode.textContent || "").replace(/\u00a0/g, " ").trim()) {
          return false;
        }
        nextNode = nextNode.nextSibling;
        continue;
      }

      if (nextNode.nodeType !== Node.ELEMENT_NODE) {
        nextNode = nextNode.nextSibling;
        continue;
      }

      if (
        nextNode.matches("br") ||
        nextNode.matches(transientMeasurementSelector) ||
        nextNode.matches(candidateBlockGridMeasurementSelector) ||
        isEmptyTrailingBlockElement(nextNode)
      ) {
        nextNode = nextNode.nextSibling;
        continue;
      }

      return false;
    }

    return true;
  }

  try {
    const ownerDocument = documentRoot.ownerDocument || document;
    const nodeFilter = ownerDocument.defaultView?.NodeFilter || NodeFilter;
    const range = ownerDocument.createRange();
    const textWalker = ownerDocument.createTreeWalker(
      documentRoot,
      nodeFilter.SHOW_TEXT,
      {
        acceptNode(textNode) {
          if (!String(textNode.textContent || "").replace(/\u00a0/g, " ").trim()) {
            return nodeFilter.FILTER_REJECT;
          }

          if (textNode.parentElement?.closest?.(excludedTextMeasurementSelector)) {
            return nodeFilter.FILTER_REJECT;
          }

          return nodeFilter.FILTER_ACCEPT;
        },
      },
    );

    while (textWalker.nextNode()) {
      range.selectNodeContents(textWalker.currentNode);
      Array.from(range.getClientRects()).forEach(includeRect);
    }

    range.detach?.();
  } catch (_error) {
    // Detached or test-double roots can skip range measurement and use element rects below.
  }

  documentRoot
    .querySelectorAll?.(
      "blockquote, figure, h1, h2, h3, hr, img, li, ol, p, table, ul, .template-generated-object, .template-token",
    )
    .forEach((element) => {
      if (element.closest(transientMeasurementSelector)) {
        return;
      }

      if (isEmptyTrailingBlockElement(element)) {
        return;
      }

      const candidateBlockGridElement = element.closest(candidateBlockGridMeasurementSelector);

      if (candidateBlockGridElement && candidateBlockGridElement !== element) {
        return;
      }

      Array.from(element.getClientRects?.() || []).forEach(includeRect);
    });

  if (!Number.isFinite(boundary.left)) {
    boundary.left = 0;
  }

  if (!Number.isFinite(boundary.top)) {
    boundary.top = 0;
  }

  return boundary;
}

export function getDocumentSurfaceOverflowInfo(surface) {
  if (!surface) {
    return {
      hasOverflow: false,
      heightOverflow: 0,
      widthOverflow: 0,
    };
  }

  const documentRoot = getDocumentContentRoot(surface);

  if (documentRoot && typeof documentRoot.getBoundingClientRect === "function") {
    const rootRect = documentRoot.getBoundingClientRect();
    const contentBoundary = getDocumentContentRectBoundary(documentRoot);
    const heightOverflow = contentBoundary.hasRect
      ? Math.max(0, Math.ceil(contentBoundary.bottom - rootRect.bottom))
      : 0;
    const widthOverflow = contentBoundary.hasRect
      ? Math.max(
          Math.max(0, Math.ceil(rootRect.left - contentBoundary.left)),
          Math.max(0, Math.ceil(contentBoundary.right - rootRect.right)),
        )
      : 0;

    return {
      hasOverflow: heightOverflow > 4 || widthOverflow > 4,
      heightOverflow,
      widthOverflow,
    };
  }

  const surfaceHeightOverflow = Math.max(0, Math.ceil(surface.scrollHeight - surface.clientHeight));
  const surfaceWidthOverflow = Math.max(0, Math.ceil(surface.scrollWidth - surface.clientWidth));
  const rootHeightOverflow = documentRoot
    ? Math.max(0, Math.ceil(documentRoot.scrollHeight - documentRoot.clientHeight))
    : 0;
  const rootWidthOverflow = documentRoot
    ? Math.max(0, Math.ceil(documentRoot.scrollWidth - documentRoot.clientWidth))
    : 0;
  const heightOverflow = Math.max(surfaceHeightOverflow, rootHeightOverflow);
  const widthOverflow = Math.max(surfaceWidthOverflow, rootWidthOverflow);

  return {
    hasOverflow: heightOverflow > 4 || widthOverflow > 4,
    heightOverflow,
    widthOverflow,
  };
}

export function getDocumentOverflowMessage(overflowInfo) {
  if (!overflowInfo?.hasOverflow) {
    return "";
  }

  const details = [
    overflowInfo.heightOverflow > 4 ? `세로 ${overflowInfo.heightOverflow}px` : "",
    overflowInfo.widthOverflow > 4 ? `가로 ${overflowInfo.widthOverflow}px` : "",
  ].filter(Boolean);

  return `A4 용지 영역을 초과했습니다${details.length ? ` (${details.join(", ")})` : ""}. 초과된 내용은 저장할 수 없습니다.`;
}
