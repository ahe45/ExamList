const stableBusyOverlayHostId = "stableBusyOverlayHost";

function createElementFromHtml(ownerDocument, html = "") {
  const template = ownerDocument.createElement("template");

  template.innerHTML = String(html || "").trim();
  return template.content.firstElementChild || null;
}

function getStableBusyOverlayKey(overlayElement) {
  if (!overlayElement?.classList?.contains("busy-overlay")) {
    return "";
  }

  return Array.from(overlayElement.classList)
    .filter((className) => className !== "busy-overlay")
    .sort()
    .join(".");
}

function copyElementAttributes(targetElement, sourceElement) {
  if (!targetElement || !sourceElement) {
    return;
  }

  Array.from(targetElement.attributes).forEach((attribute) => {
    if (!sourceElement.hasAttribute(attribute.name)) {
      targetElement.removeAttribute(attribute.name);
    }
  });
  Array.from(sourceElement.attributes).forEach((attribute) => {
    if (targetElement.getAttribute(attribute.name) !== attribute.value) {
      targetElement.setAttribute(attribute.name, attribute.value);
    }
  });
}

function isDirectElementMatch(node, className) {
  return node?.nodeType === 1 && node.classList?.contains(className);
}

function findDirectChildByClass(parentElement, className) {
  return Array.from(parentElement?.children || []).find((child) => child.classList?.contains(className)) || null;
}

function ensureChildOrder(parentElement, orderedNodes = []) {
  if (!parentElement) {
    return;
  }

  let referenceNode = parentElement.firstChild;

  orderedNodes.filter(Boolean).forEach((node) => {
    if (node === referenceNode) {
      referenceNode = node.nextSibling;
      return;
    }

    parentElement.insertBefore(node, referenceNode);
  });
}

function patchBusyOverlayPanel(existingPanelElement, nextPanelElement) {
  if (!existingPanelElement || !nextPanelElement) {
    return nextPanelElement?.cloneNode(true) || null;
  }

  copyElementAttributes(existingPanelElement, nextPanelElement);

  let spinnerElement = findDirectChildByClass(existingPanelElement, "busy-spinner");
  const nextSpinnerElement = findDirectChildByClass(nextPanelElement, "busy-spinner");

  if (spinnerElement && nextSpinnerElement) {
    copyElementAttributes(spinnerElement, nextSpinnerElement);
  }

  Array.from(existingPanelElement.childNodes).forEach((childNode) => {
    if (childNode !== spinnerElement) {
      childNode.remove();
    }
  });

  Array.from(nextPanelElement.childNodes).forEach((nextChildNode) => {
    if (isDirectElementMatch(nextChildNode, "busy-spinner")) {
      if (!spinnerElement) {
        spinnerElement = nextChildNode.cloneNode(true);
      }

      return;
    }

    existingPanelElement.append(nextChildNode.cloneNode(true));
  });

  if (spinnerElement && !nextSpinnerElement) {
    spinnerElement.remove();
    spinnerElement = null;
  }

  if (spinnerElement) {
    const orderedPanelNodes = Array.from(nextPanelElement.childNodes).map((nextChildNode) =>
      isDirectElementMatch(nextChildNode, "busy-spinner") ? spinnerElement : null,
    );

    ensureChildOrder(existingPanelElement, orderedPanelNodes);
  }

  return existingPanelElement;
}

function patchStableBusyOverlay(existingOverlayElement, nextOverlayElement) {
  copyElementAttributes(existingOverlayElement, nextOverlayElement);

  let backdropElement = findDirectChildByClass(existingOverlayElement, "busy-overlay-backdrop");
  let panelElement = findDirectChildByClass(existingOverlayElement, "busy-overlay-panel");
  const nextBackdropElement = findDirectChildByClass(nextOverlayElement, "busy-overlay-backdrop");
  const nextPanelElement = findDirectChildByClass(nextOverlayElement, "busy-overlay-panel");
  const retainedElements = new Set();

  if (nextBackdropElement) {
    if (!backdropElement) {
      backdropElement = nextBackdropElement.cloneNode(true);
    } else {
      copyElementAttributes(backdropElement, nextBackdropElement);
      backdropElement.replaceChildren();
    }

    retainedElements.add(backdropElement);
  }

  if (nextPanelElement) {
    panelElement = patchBusyOverlayPanel(panelElement, nextPanelElement);
    retainedElements.add(panelElement);
  }

  Array.from(existingOverlayElement.childNodes).forEach((childNode) => {
    if (!retainedElements.has(childNode)) {
      childNode.remove();
    }
  });

  ensureChildOrder(existingOverlayElement, Array.from(nextOverlayElement.childNodes).map((nextChildNode) => {
    if (isDirectElementMatch(nextChildNode, "busy-overlay-backdrop")) {
      return backdropElement;
    }

    if (isDirectElementMatch(nextChildNode, "busy-overlay-panel")) {
      return panelElement;
    }

    return null;
  }));
}

function ensureStableBusyOverlayHost(ownerDocument) {
  let hostElement = ownerDocument.getElementById(stableBusyOverlayHostId);

  if (hostElement) {
    return hostElement;
  }

  hostElement = ownerDocument.createElement("div");
  hostElement.id = stableBusyOverlayHostId;
  hostElement.setAttribute("aria-live", "off");
  ownerDocument.body.append(hostElement);
  return hostElement;
}

export function syncStableBusyOverlays(overlayHtmlList = [], ownerDocument = document) {
  if (!ownerDocument?.body) {
    return;
  }

  const hostElement = ensureStableBusyOverlayHost(ownerDocument);
  const nextOverlays = overlayHtmlList
    .map((html) => createElementFromHtml(ownerDocument, html))
    .filter((overlayElement) => overlayElement?.classList?.contains("busy-overlay"));
  const nextKeys = new Set(nextOverlays.map(getStableBusyOverlayKey).filter(Boolean));

  Array.from(hostElement.children).forEach((existingOverlayElement) => {
    const existingKey = getStableBusyOverlayKey(existingOverlayElement);

    if (!nextKeys.has(existingKey)) {
      existingOverlayElement.remove();
    }
  });

  const syncedOverlayElements = [];

  nextOverlays.forEach((nextOverlayElement) => {
    const overlayKey = getStableBusyOverlayKey(nextOverlayElement);

    if (!overlayKey) {
      return;
    }

    const existingOverlayElement = Array.from(hostElement.children).find(
      (child) => getStableBusyOverlayKey(child) === overlayKey,
    );

    if (!existingOverlayElement) {
      syncedOverlayElements.push(nextOverlayElement);
      return;
    }

    patchStableBusyOverlay(existingOverlayElement, nextOverlayElement);
    syncedOverlayElements.push(existingOverlayElement);
  });

  ensureChildOrder(hostElement, syncedOverlayElements);
}
