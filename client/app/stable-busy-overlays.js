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

function patchBusyOverlayPanel(existingPanelElement, nextPanelElement) {
  if (!existingPanelElement || !nextPanelElement) {
    return nextPanelElement?.cloneNode(true) || null;
  }

  copyElementAttributes(existingPanelElement, nextPanelElement);

  let spinnerElement = Array.from(existingPanelElement.children).find((child) => child.classList?.contains("busy-spinner"));
  const nextSpinnerElement = Array.from(nextPanelElement.children).find((child) => child.classList?.contains("busy-spinner"));

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

      existingPanelElement.append(spinnerElement);
      return;
    }

    existingPanelElement.append(nextChildNode.cloneNode(true));
  });

  return existingPanelElement;
}

function patchStableBusyOverlay(existingOverlayElement, nextOverlayElement) {
  copyElementAttributes(existingOverlayElement, nextOverlayElement);

  let backdropElement = Array.from(existingOverlayElement.children).find((child) =>
    child.classList?.contains("busy-overlay-backdrop"),
  );
  let panelElement = Array.from(existingOverlayElement.children).find((child) =>
    child.classList?.contains("busy-overlay-panel"),
  );
  const nextBackdropElement = Array.from(nextOverlayElement.children).find((child) =>
    child.classList?.contains("busy-overlay-backdrop"),
  );
  const nextPanelElement = Array.from(nextOverlayElement.children).find((child) =>
    child.classList?.contains("busy-overlay-panel"),
  );
  const retainedElements = new Set([backdropElement, panelElement].filter(Boolean));

  Array.from(existingOverlayElement.childNodes).forEach((childNode) => {
    if (!retainedElements.has(childNode)) {
      childNode.remove();
    }
  });

  Array.from(nextOverlayElement.childNodes).forEach((nextChildNode) => {
    if (isDirectElementMatch(nextChildNode, "busy-overlay-backdrop")) {
      if (!backdropElement) {
        backdropElement = nextChildNode.cloneNode(true);
      } else {
        copyElementAttributes(backdropElement, nextBackdropElement);
        backdropElement.replaceChildren();
      }

      existingOverlayElement.append(backdropElement);
      return;
    }

    if (isDirectElementMatch(nextChildNode, "busy-overlay-panel")) {
      panelElement = patchBusyOverlayPanel(panelElement, nextPanelElement);
      existingOverlayElement.append(panelElement);
      return;
    }

    existingOverlayElement.append(nextChildNode.cloneNode(true));
  });
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

  nextOverlays.forEach((nextOverlayElement) => {
    const overlayKey = getStableBusyOverlayKey(nextOverlayElement);

    if (!overlayKey) {
      return;
    }

    const existingOverlayElement = Array.from(hostElement.children).find(
      (child) => getStableBusyOverlayKey(child) === overlayKey,
    );

    if (!existingOverlayElement) {
      hostElement.append(nextOverlayElement);
      return;
    }

    patchStableBusyOverlay(existingOverlayElement, nextOverlayElement);
    hostElement.append(existingOverlayElement);
  });
}
