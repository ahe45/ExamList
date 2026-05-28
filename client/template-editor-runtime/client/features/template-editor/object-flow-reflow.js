(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.ExamListTemplateEditorObjectFlowReflow = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const objectFlowLayoutChangeEventName = "examlist:object-flow-layoutchange";
  const flowObjectSelector = [
    "table",
  ].join(",");
  const transientSelector = [
    ".template-editor-image-selection",
    ".template-editor-image-resize-handle",
    ".examlist-object-selection",
    ".examlist-object-resize-handle",
    ".template-editor-table-selection",
    ".template-editor-table-handle",
    ".template-editor-table-move-handle",
    ".template-editor-table-select-handle",
    "[data-candidate-block-grid-resize-handle]",
    "[data-candidate-block-grid-move-handle]",
    "[data-candidate-block-focus-backdrop]",
    ".examlist-candidate-block-focus-backdrop",
    "[data-candidate-block-focus-layer]",
    ".examlist-candidate-block-focus-layer",
  ].join(",");
  const nonSplittableFlowTextBlockSelector = [
    "[data-candidate-block-grid]",
    ".examlist-candidate-block-grid",
    "[data-candidate-block-instance]",
    ".examlist-candidate-block",
  ].join(",");
  let objectFlowReflowIdCounter = 0;
  const flowObjectLayoutState = new WeakMap();

  function getOwnerWindow(element) {
    return element?.ownerDocument?.defaultView || (typeof window !== "undefined" ? window : null);
  }

  function isHtmlElement(element, ownerWindow = getOwnerWindow(element)) {
    return Boolean(ownerWindow?.HTMLElement && element instanceof ownerWindow.HTMLElement);
  }

  function parsePixelValue(value, fallback = 0) {
    const parsedValue = Number.parseFloat(String(value || ""));

    return Number.isFinite(parsedValue) ? parsedValue : fallback;
  }

  function getFlowObjectKind(objectElement) {
    if (!isHtmlElement(objectElement)) {
      return "";
    }

    return String(objectElement.tagName || "").toUpperCase() === "TABLE" ? "table" : "";
  }

  function isFlowObjectElement(objectElement, documentElement) {
    if (!isHtmlElement(objectElement) || !isHtmlElement(documentElement) || !documentElement.contains(objectElement)) {
      return false;
    }

    const kind = getFlowObjectKind(objectElement);

    if (!kind || objectElement.closest(transientSelector)) {
      return false;
    }

    if (kind === "table") {
      return !objectElement.closest("[data-candidate-block-instance]");
    }

    return false;
  }

  function getFlowObjectId(objectElement, documentElement) {
    const existingId = String(objectElement?.dataset?.templateObjectFlowId || "").trim();

    if (existingId) {
      return existingId;
    }

    const usedIds = new Set(
      Array.from(documentElement?.querySelectorAll?.("[data-template-object-flow-id]") || [])
        .map((element) => String(element.dataset?.templateObjectFlowId || "").trim())
        .filter(Boolean),
    );
    let nextId = "";

    do {
      objectFlowReflowIdCounter += 1;
      nextId = `template-object-flow-${Date.now().toString(36)}-${objectFlowReflowIdCounter}`;
    } while (usedIds.has(nextId));

    objectElement.dataset.templateObjectFlowId = nextId;
    return nextId;
  }

  function getFlowSpacer(documentElement, flowId) {
    const normalizedFlowId = String(flowId || "").trim();

    if (!normalizedFlowId) {
      return null;
    }

    return Array.from(documentElement?.querySelectorAll?.("[data-template-object-flow-spacer]") || [])
      .find((element) => String(element.dataset?.templateObjectFlowId || "").trim() === normalizedFlowId) || null;
  }

  function removeUnsupportedFlowSpacers(documentElement) {
    Array.from(documentElement?.querySelectorAll?.("[data-template-object-flow-spacer]") || [])
      .forEach((element) => {
        if (String(element.dataset?.templateObjectFlowKind || "").trim() === "candidate-block-grid") {
          element.remove();
        }
      });

    Array.from(documentElement?.querySelectorAll?.("[data-candidate-block-grid], .examlist-candidate-block-grid") || [])
      .forEach((element) => element.removeAttribute("data-template-object-flow-id"));
  }

  function applyFlowSpacerStyle(spacerElement, kind) {
    if (!isHtmlElement(spacerElement)) {
      return;
    }

    spacerElement.dataset.templateObjectFlowSpacer = "true";
    spacerElement.dataset.templateObjectFlowKind = kind || "object";
    spacerElement.setAttribute("contenteditable", "false");
    spacerElement.setAttribute("aria-hidden", "true");
    spacerElement.style.display = "block";
    spacerElement.style.margin = "0";
    spacerElement.style.padding = "0";
    spacerElement.style.border = "0";
    spacerElement.style.clear = "both";
    spacerElement.style.fontSize = "0";
    spacerElement.style.lineHeight = "0";
    spacerElement.style.minHeight = "0";
    spacerElement.style.overflow = "hidden";
    spacerElement.style.pointerEvents = "none";
    spacerElement.style.userSelect = "none";
  }

  function getTopLevelChild(element, documentElement) {
    let currentElement = element;

    while (currentElement?.parentElement && currentElement.parentElement !== documentElement) {
      currentElement = currentElement.parentElement;
    }

    return currentElement?.parentElement === documentElement ? currentElement : null;
  }

  function ensureFlowSpacer(objectElement, documentElement) {
    if (!isFlowObjectElement(objectElement, documentElement)) {
      return null;
    }

    const kind = getFlowObjectKind(objectElement);
    const flowId = getFlowObjectId(objectElement, documentElement);
    let spacerElement = getFlowSpacer(documentElement, flowId);

    if (!isHtmlElement(spacerElement)) {
      spacerElement = documentElement.ownerDocument.createElement("div");
      spacerElement.dataset.templateObjectFlowId = flowId;

      const referenceElement = getTopLevelChild(objectElement, documentElement);

      if (referenceElement?.parentElement === documentElement) {
        documentElement.insertBefore(spacerElement, referenceElement);
      } else {
        documentElement.append(spacerElement);
      }
    }

    applyFlowSpacerStyle(spacerElement, kind);
    return spacerElement;
  }

function getFlowObjectMetrics(objectElement, documentElement, geometry = {}, minimumHeight = 5) {
  const documentRect = documentElement.getBoundingClientRect();
  const objectRect = objectElement.getBoundingClientRect();
  const renderedTop = objectRect.top - documentRect.top;
  const renderedHeight = Math.max(0, objectRect.height || 0);
  const hasStrictGeometry = geometry.strictGeometry === true &&
    Number.isFinite(Number(geometry.top)) &&
    Number.isFinite(Number(geometry.height));
  const strictHeight = Math.max(
    Math.max(1, Math.round(Number(minimumHeight) || 1)),
    Math.round(Number(geometry.height) || 0),
  );

  if (hasStrictGeometry) {
    const top = Number(geometry.top);

    return {
      bottom: top + strictHeight,
      height: strictHeight,
      top,
    };
  }

  const styleTop = parsePixelValue(objectElement.style.top, renderedTop);
  const top = Number.isFinite(Number(geometry.top))
    ? Math.min(Number(geometry.top), renderedTop)
    : Math.min(styleTop, renderedTop);
    const height = Math.max(
      Math.max(1, Math.round(Number(minimumHeight) || 1)),
      Math.round(Number(geometry.height) || objectElement.offsetHeight || objectRect.height || parsePixelValue(objectElement.style.height, 0) || 0),
    );
    const bottom = Math.max(top + height, renderedTop + renderedHeight);

    return {
      bottom,
      height: Math.max(height, bottom - top),
      top,
    };
  }

  function syncFlowSpacer(objectElement, documentElement, geometry = {}, minimumHeight = 5) {
    const spacerElement = ensureFlowSpacer(objectElement, documentElement);

    if (!isHtmlElement(spacerElement)) {
      return null;
    }

    const documentRect = documentElement.getBoundingClientRect();
    const spacerRect = spacerElement.getBoundingClientRect();
    const metrics = getFlowObjectMetrics(objectElement, documentElement, geometry, minimumHeight);
    const spacerTop = Math.max(0, spacerRect.top - documentRect.top);
    const reservedHeight = Math.max(metrics.height, metrics.bottom - spacerTop);

    spacerElement.style.height = `${Math.max(0, Math.ceil(reservedHeight))}px`;
    rememberFlowObjectLayout(objectElement, documentElement, spacerElement, metrics);
    return spacerElement;
  }

  function rememberFlowObjectLayout(objectElement, documentElement, spacerElement = null, metrics = null) {
    if (!isHtmlElement(objectElement) || !isHtmlElement(documentElement)) {
      return null;
    }

    const resolvedSpacer = spacerElement || getFlowSpacer(
      documentElement,
      String(objectElement.dataset?.templateObjectFlowId || "").trim(),
    );

    if (!isHtmlElement(resolvedSpacer)) {
      return null;
    }

    const documentRect = documentElement.getBoundingClientRect();
    const spacerRect = resolvedSpacer.getBoundingClientRect();
    const resolvedMetrics = metrics || getFlowObjectMetrics(objectElement, documentElement);
    const spacerTop = Math.max(0, spacerRect.top - documentRect.top);
    const objectTop = Math.max(0, resolvedMetrics.top);

    const state = {
      height: Math.max(1, resolvedMetrics.height || 1),
      objectTop,
      offsetTop: objectTop - spacerTop,
      spacerTop,
    };

    flowObjectLayoutState.set(objectElement, state);
    return state;
  }

  function isAbsoluteFlowObjectChild(element, documentElement) {
    return isFlowObjectElement(element, documentElement) && String(element.style.position || "").trim() === "absolute";
  }

  function isFlowReferenceChild(element, documentElement, activeElement, activeSpacer) {
    if (!isHtmlElement(element) || element === activeElement || element === activeSpacer || element.closest(transientSelector)) {
      return false;
    }

    if (element.matches("[data-template-object-flow-spacer]")) {
      return true;
    }

    if (isAbsoluteFlowObjectChild(element, documentElement)) {
      return false;
    }

    const rects = Array.from(element.getClientRects?.() || []);
    const hasBox = rects.some((rect) => rect.width > 0 || rect.height > 0);
    const hasMeaningfulText = String(element.textContent || "").replace(/\u00a0/g, " ").trim().length > 0;
    const hasStructuredContent = Boolean(element.querySelector?.("img, table, hr, [data-template-tag-value], .template-token"));

    return hasBox || hasMeaningfulText || hasStructuredContent;
  }

  function isExplicitLineBreakElement(element) {
    return String(element?.tagName || "").toUpperCase() === "BR";
  }

  function cloneLineAncestor(element) {
    const clone = element.cloneNode(false);

    clone.removeAttribute?.("id");
    return clone;
  }

  function createLineFragmentState(ownerDocument) {
    return {
      cloneByAncestor: new Map(),
      fragment: ownerDocument.createDocumentFragment(),
    };
  }

  function ensureLineFragmentParent(lineState, ancestors = []) {
    let parent = lineState.fragment;

    ancestors.forEach((ancestor) => {
      let clone = lineState.cloneByAncestor.get(ancestor);

      if (!clone) {
        clone = cloneLineAncestor(ancestor);
        parent.append(clone);
        lineState.cloneByAncestor.set(ancestor, clone);
      }

      parent = clone;
    });

    return parent;
  }

  function createExplicitTextLineFragments(blockElement) {
    const ownerDocument = blockElement?.ownerDocument || document;
    const lines = [];
    let lineState = createLineFragmentState(ownerDocument);

    function finishLine() {
      lines.push(lineState.fragment);
      lineState = createLineFragmentState(ownerDocument);
    }

    function appendNodeToCurrentLine(node, ancestors = []) {
      if (node.nodeType === 3) {
        ensureLineFragmentParent(lineState, ancestors).append(node.cloneNode(true));
        return;
      }

      if (node.nodeType !== 1) {
        return;
      }

      if (isExplicitLineBreakElement(node)) {
        finishLine();
        return;
      }

      const childNodes = Array.from(node.childNodes || []);

      if (!childNodes.length) {
        ensureLineFragmentParent(lineState, ancestors).append(node.cloneNode(true));
        return;
      }

      childNodes.forEach((childNode) => appendNodeToCurrentLine(childNode, [...ancestors, node]));
    }

    Array.from(blockElement.childNodes || []).forEach((childNode) => appendNodeToCurrentLine(childNode));

    if (lineState.fragment.childNodes.length > 0) {
      lines.push(lineState.fragment);
    }

    return lines;
  }

  function isSplittableFlowTextBlock(element, documentElement, activeElement, activeSpacer) {
    if (!isFlowReferenceChild(element, documentElement, activeElement, activeSpacer)) {
      return false;
    }

    const tagName = String(element.tagName || "").toUpperCase();

    return (
      (tagName === "P" || tagName === "DIV") &&
      !element.matches("[data-template-object-flow-spacer]") &&
      !element.matches(nonSplittableFlowTextBlockSelector) &&
      !element.matches(flowObjectSelector) &&
      !element.querySelector(nonSplittableFlowTextBlockSelector) &&
      !element.querySelector(flowObjectSelector) &&
      Boolean(element.querySelector("br"))
    );
  }

  function createFlowTextLineBlock(blockElement, lineFragment, index, lineCount, marginBottom) {
    const ownerDocument = blockElement.ownerDocument || document;
    const lineElement = blockElement.cloneNode(false);

    if (index > 0) {
      lineElement.removeAttribute("id");
    }

    lineElement.style.margin = "0";
    if (index === lineCount - 1 && marginBottom && marginBottom !== "0px") {
      lineElement.style.marginBottom = marginBottom;
    }

    lineElement.append(lineFragment);
    if (!lineElement.childNodes.length) {
      lineElement.append(ownerDocument.createElement("br"));
    }

    return lineElement;
  }

  function splitFlowTextBlockIntoLines(blockElement) {
    const lineFragments = createExplicitTextLineFragments(blockElement);

    if (lineFragments.length < 2) {
      return [];
    }

    const ownerWindow = getOwnerWindow(blockElement);
    const marginBottom = ownerWindow?.getComputedStyle?.(blockElement)?.marginBottom || "";
    const lineElements = lineFragments.map((lineFragment, index) =>
      createFlowTextLineBlock(blockElement, lineFragment, index, lineFragments.length, marginBottom)
    );

    blockElement.replaceWith(...lineElements);
    return lineElements;
  }

  function splitFlowTextBlockAtTarget(documentElement, activeElement, activeSpacer, targetTop) {
    const documentRect = documentElement.getBoundingClientRect();
    const blockElement = Array.from(documentElement.children || [])
      .find((childElement) => {
        if (!isSplittableFlowTextBlock(childElement, documentElement, activeElement, activeSpacer)) {
          return false;
        }

        const rect = childElement.getBoundingClientRect();
        const top = rect.top - documentRect.top;
        const bottom = rect.bottom - documentRect.top;

        return targetTop >= top - 1 && targetTop < bottom - 1;
      });

    return blockElement ? splitFlowTextBlockIntoLines(blockElement) : [];
  }

  function findFlowReferenceChild(documentElement, activeElement, activeSpacer, activeMetrics, { movingDown = false } = {}) {
    const documentRect = documentElement.getBoundingClientRect();
    const participants = Array.from(documentElement.children || [])
      .filter((childElement) => isFlowReferenceChild(childElement, documentElement, activeElement, activeSpacer))
      .map((childElement) => {
        const rect = childElement.getBoundingClientRect();
        const top = Math.max(0, rect.top - documentRect.top);
        const height = childElement.matches("[data-template-object-flow-spacer]")
          ? Math.max(rect.height || 0, parsePixelValue(childElement.style.height, 0))
          : rect.height || 0;

        return {
          element: childElement,
          bottom: top + Math.max(0, height),
          top,
        };
      })
      .filter((entry) => Number.isFinite(entry.top) && Number.isFinite(entry.bottom));

    if (movingDown) {
      return participants.find((entry) => activeMetrics.top < entry.bottom - 1)?.element || null;
    }

    return participants.find((entry) => activeMetrics.top < entry.bottom - 1)?.element || null;
  }

  function getAbsoluteFlowObjects(documentElement, activeElement) {
    const seen = new Set();

    return Array.from(documentElement.querySelectorAll(flowObjectSelector))
      .filter((objectElement) => {
        if (
          !isFlowObjectElement(objectElement, documentElement) ||
          objectElement === activeElement ||
          seen.has(objectElement) ||
          String(objectElement.style.position || "").trim() !== "absolute"
        ) {
          return false;
        }

        seen.add(objectElement);
        return true;
      });
  }

  function dispatchObjectFlowLayoutChange(objectElement, detail = {}) {
    const ownerWindow = getOwnerWindow(objectElement);

    if (!ownerWindow?.CustomEvent || !isHtmlElement(objectElement, ownerWindow)) {
      return;
    }

    objectElement.dispatchEvent(new ownerWindow.CustomEvent(objectFlowLayoutChangeEventName, {
      bubbles: true,
      detail: {
        kind: getFlowObjectKind(objectElement),
        objectElement,
        ...detail,
      },
    }));
  }

  function syncAbsoluteFlowObjectToSpacer(objectElement, documentElement, options = {}) {
    if (!isAbsoluteFlowObjectChild(objectElement, documentElement)) {
      return null;
    }

    const spacerElement = ensureFlowSpacer(objectElement, documentElement);

    if (!isHtmlElement(spacerElement)) {
      return null;
    }

    const documentRect = documentElement.getBoundingClientRect();
    const spacerRect = spacerElement.getBoundingClientRect();
    const spacerTop = Math.max(0, spacerRect.top - documentRect.top);
    const metrics = getFlowObjectMetrics(objectElement, documentElement, {}, options.minimumHeight);
    const rememberedState = flowObjectLayoutState.get(objectElement);
    const styleTop = parsePixelValue(objectElement.style.top, metrics.top);
    const rememberedObjectTop = Number(rememberedState?.objectTop);
    const hasExplicitMovedTop =
      Number.isFinite(styleTop) &&
      Number.isFinite(rememberedObjectTop) &&
      Math.abs(styleTop - rememberedObjectTop) > 1;
    const fallbackOffset = hasExplicitMovedTop
      ? styleTop - spacerTop
      : metrics.top < spacerTop - 1
        ? 0
        : Math.max(0, metrics.top - spacerTop);
    const offsetTop = Number.isFinite(Number(rememberedState?.offsetTop)) && !hasExplicitMovedTop
      ? Number(rememberedState.offsetTop)
      : fallbackOffset;
    const nextTop = Math.max(0, Math.round(spacerTop + offsetTop));
    const didMove = Math.abs(metrics.top - nextTop) > 1;

    if (didMove) {
      objectElement.style.top = `${nextTop}px`;
    }

    syncFlowSpacer(objectElement, documentElement, {
      height: metrics.height,
      top: nextTop,
    }, options.minimumHeight);

    if (didMove) {
      dispatchObjectFlowLayoutChange(objectElement, {
        height: metrics.height,
        top: nextTop,
      });
      options.onObjectShift?.(objectElement, {
        height: metrics.height,
        top: nextTop,
      });
    }

    return {
      didMove,
      height: metrics.height,
      objectElement,
      spacerElement,
      top: nextTop,
    };
  }

  function syncTemplateEditorObjectFlowObjects(documentElement, options = {}) {
    if (!isHtmlElement(documentElement)) {
      return [];
    }

    removeUnsupportedFlowSpacers(documentElement);

    return getAbsoluteFlowObjects(documentElement, null)
      .map((objectElement) => syncAbsoluteFlowObjectToSpacer(objectElement, documentElement, options))
      .filter(Boolean);
  }

  function pushOverlappingFlowObjects(documentElement, activeElement, activeSpacer, activeMetrics, options = {}) {
    const shiftedObjects = [];
    let insertionAfter = activeSpacer;
    let currentBottom = activeMetrics.bottom;

    getAbsoluteFlowObjects(documentElement, activeElement)
      .map((objectElement) => ({
        element: objectElement,
        metrics: getFlowObjectMetrics(objectElement, documentElement, {}, options.minimumHeight),
      }))
      .sort((leftEntry, rightEntry) => leftEntry.metrics.top - rightEntry.metrics.top)
      .forEach((entry) => {
        const { element, metrics } = entry;

        if (metrics.bottom <= activeMetrics.top + 1) {
          return;
        }

        if (metrics.top >= currentBottom - 1) {
          currentBottom = metrics.bottom;
          return;
        }

        const nextTop = Math.max(0, Math.ceil(currentBottom));
        const spacerElement = ensureFlowSpacer(element, documentElement);

        if (isHtmlElement(spacerElement) && isHtmlElement(insertionAfter)) {
          documentElement.insertBefore(spacerElement, insertionAfter.nextSibling);
          insertionAfter = spacerElement;
        }

        element.style.top = `${nextTop}px`;
        syncFlowSpacer(element, documentElement, {
          height: metrics.height,
          top: nextTop,
        }, options.minimumHeight);
        currentBottom = nextTop + metrics.height;
        shiftedObjects.push(element);
        dispatchObjectFlowLayoutChange(element, {
          height: metrics.height,
          top: nextTop,
        });
        options.onObjectShift?.(element, {
          height: metrics.height,
          top: nextTop,
        });
      });

    return shiftedObjects;
  }

  function isBeforeElement(leftElement, rightElement) {
    return Boolean(leftElement?.compareDocumentPosition?.(rightElement) & 4);
  }

  function pullPrecedingFlowObjectsAboveActive(documentElement, activeElement, activeSpacer, activeMetrics, options = {}) {
    const shiftedObjects = [];
    const documentRect = documentElement.getBoundingClientRect();

    getAbsoluteFlowObjects(documentElement, activeElement)
      .map((objectElement) => ({
        element: objectElement,
        metrics: getFlowObjectMetrics(objectElement, documentElement, {}, options.minimumHeight),
        spacer: ensureFlowSpacer(objectElement, documentElement),
      }))
      .filter((entry) => isHtmlElement(entry.spacer) && isBeforeElement(entry.spacer, activeSpacer))
      .sort((leftEntry, rightEntry) => isBeforeElement(leftEntry.spacer, rightEntry.spacer) ? -1 : 1)
      .forEach((entry) => {
        const { element, metrics, spacer } = entry;
        const spacerRect = spacer.getBoundingClientRect();
        const nextTop = Math.max(0, Math.round(spacerRect.top - documentRect.top));

        if (Math.abs(metrics.top - nextTop) <= 1 && metrics.bottom <= activeMetrics.top + 1) {
          return;
        }

        element.style.top = `${nextTop}px`;
        syncFlowSpacer(element, documentElement, {
          height: metrics.height,
          top: nextTop,
        }, options.minimumHeight);
        shiftedObjects.push(element);
        dispatchObjectFlowLayoutChange(element, {
          height: metrics.height,
          top: nextTop,
        });
        options.onObjectShift?.(element, {
          height: metrics.height,
          top: nextTop,
        });
      });

    return shiftedObjects;
  }

  function reflowTemplateEditorObjectRows(activeElement, options = {}) {
    const documentElement = options.documentElement || activeElement?.closest?.(".template-doc") || null;

    if (!isFlowObjectElement(activeElement, documentElement)) {
      return {
        shiftedObjects: [],
        spacerElement: null,
      };
    }

    removeUnsupportedFlowSpacers(documentElement);

    const activeSpacer = ensureFlowSpacer(activeElement, documentElement);

    if (!isHtmlElement(activeSpacer)) {
      return {
        shiftedObjects: [],
        spacerElement: null,
      };
    }

  const activeMetrics = getFlowObjectMetrics(activeElement, documentElement, {
    height: options.activeHeight,
    strictGeometry: options.strictGeometry === true,
    top: options.activeTop,
  }, options.minimumHeight);
    const movementY = Number(options.movementY) || 0;
    const isMovingDown = movementY > 0.5;
    const shouldReorderByPosition =
      options.reorderByPosition === true ||
      (options.reorderByPosition !== false && Math.abs(movementY) > 0.5);
    const previousHeight = activeSpacer.style.height;

    if (shouldReorderByPosition) {
      activeSpacer.style.height = "0px";
    }

    splitFlowTextBlockAtTarget(
      documentElement,
      activeElement,
      activeSpacer,
      isMovingDown ? activeMetrics.bottom : activeMetrics.top,
    );

    const referenceElement = findFlowReferenceChild(documentElement, activeElement, activeSpacer, activeMetrics, {
      movingDown: isMovingDown,
    });

    if (referenceElement) {
      documentElement.insertBefore(activeSpacer, referenceElement);
    } else {
      documentElement.append(activeSpacer);
    }

    if (shouldReorderByPosition) {
      activeSpacer.style.height = previousHeight;
    }

    syncFlowSpacer(activeElement, documentElement, {
      height: activeMetrics.height,
      top: activeMetrics.top,
    }, options.minimumHeight);

    const shiftedObjects = isMovingDown
      ? pullPrecedingFlowObjectsAboveActive(documentElement, activeElement, activeSpacer, activeMetrics, options)
      : pushOverlappingFlowObjects(
          documentElement,
          activeElement,
          activeSpacer,
          activeMetrics,
          options,
        );
    return {
      activeTop: activeMetrics.top,
      shiftedObjects,
      spacerElement: activeSpacer,
    };
  }

  return Object.freeze({
    objectFlowLayoutChangeEventName,
    reflowTemplateEditorObjectRows,
    syncTemplateEditorObjectFlowObjects,
  });
});
