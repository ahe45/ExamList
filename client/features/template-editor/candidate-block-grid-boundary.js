import { getCandidateBlockGridElements } from "./candidate-block-grid-dom.js";

const TEXT_NODE = 3;
const CANDIDATE_BLOCK_GRID_SELECTOR = "[data-candidate-block-grid], .examlist-candidate-block-grid";

function getHtmlElementConstructor(node) {
  return (
    node?.ownerDocument?.defaultView?.HTMLElement ||
    (typeof HTMLElement !== "undefined" ? HTMLElement : null)
  );
}

export function isIgnorableCandidateBlockBoundaryNode(
  node,
  HtmlElementConstructor = getHtmlElementConstructor(node),
) {
  if (node?.nodeType === TEXT_NODE) {
    return !String(node.textContent || "").trim();
  }

  return Boolean(
    HtmlElementConstructor &&
      node instanceof HtmlElementConstructor &&
      node.tagName === "BR"
  );
}

export function getAdjacentCandidateBlockBoundaryNode(parentNode, startIndex, direction) {
  if (!parentNode?.childNodes) {
    return null;
  }

  const step = direction === "backward" ? -1 : 1;
  let index = startIndex;

  while (index >= 0 && index < parentNode.childNodes.length) {
    const node = parentNode.childNodes[index];

    if (!isIgnorableCandidateBlockBoundaryNode(node)) {
      return node;
    }

    index += step;
  }

  return null;
}

export function getCandidateBlockGridFromBoundaryNode(node, direction) {
  let currentNode = node || null;

  while (currentNode) {
    const HtmlElementConstructor = getHtmlElementConstructor(currentNode);
    const isHtmlElement = Boolean(HtmlElementConstructor && currentNode instanceof HtmlElementConstructor);

    if (isHtmlElement && currentNode.matches(CANDIDATE_BLOCK_GRID_SELECTOR)) {
      return currentNode;
    }

    if (!isHtmlElement || !currentNode.childNodes.length) {
      return null;
    }

    currentNode =
      direction === "backward"
        ? getAdjacentCandidateBlockBoundaryNode(currentNode, currentNode.childNodes.length - 1, "backward")
        : getAdjacentCandidateBlockBoundaryNode(currentNode, 0, "forward");
  }

  return null;
}

export function getCandidateBlockGridAdjacentToRange(range, direction, surfaceElement) {
  let currentNode = range?.startContainer || null;
  let currentOffset = range?.startOffset || 0;

  while (currentNode) {
    let adjacentNode = null;

    if (currentNode.nodeType === Node.TEXT_NODE) {
      const textLength = currentNode.textContent?.length || 0;
      const isBoundary = direction === "backward" ? currentOffset === 0 : currentOffset === textLength;

      if (!isBoundary) {
        return null;
      }

      adjacentNode = getAdjacentCandidateBlockBoundaryNode(
        currentNode.parentNode,
        Array.prototype.indexOf.call(currentNode.parentNode?.childNodes || [], currentNode) + (direction === "backward" ? -1 : 1),
        direction,
      );
    } else {
      adjacentNode = getAdjacentCandidateBlockBoundaryNode(
        currentNode,
        direction === "backward" ? currentOffset - 1 : currentOffset,
        direction,
      );
    }

    const adjacentGridElement = getCandidateBlockGridFromBoundaryNode(adjacentNode, direction);

    if (adjacentGridElement instanceof HTMLElement && surfaceElement.contains(adjacentGridElement)) {
      return adjacentGridElement;
    }

    if (adjacentNode) {
      return null;
    }

    if (currentNode === surfaceElement) {
      return null;
    }

    const parentNode = currentNode.parentNode;

    if (!parentNode || !surfaceElement.contains(parentNode)) {
      return null;
    }

    const currentIndex = Array.prototype.indexOf.call(parentNode.childNodes, currentNode);

    currentOffset = direction === "backward" ? currentIndex : currentIndex + 1;
    currentNode = parentNode;
  }

  return null;
}

export function doesRangeIncludeCandidateBlockGrid(range, surfaceElement) {
  if (!range || range.collapsed) {
    return false;
  }

  return getCandidateBlockGridElements(surfaceElement).some((gridElement) => {
    try {
      return range.intersectsNode(gridElement);
    } catch (error) {
      return false;
    }
  });
}

export function getCandidateBlockBoundaryHostElement(range, surfaceElement) {
  let currentNode = range?.startContainer || null;

  if (currentNode?.nodeType === Node.TEXT_NODE) {
    currentNode = currentNode.parentElement;
  }

  while (currentNode instanceof HTMLElement && currentNode !== surfaceElement) {
    if (currentNode.matches(CANDIDATE_BLOCK_GRID_SELECTOR)) {
      return null;
    }

    if (
      currentNode.matches("p, div, h1, h2, h3, blockquote, ul, ol") &&
      !currentNode.closest(CANDIDATE_BLOCK_GRID_SELECTOR)
    ) {
      return currentNode;
    }

    currentNode = currentNode.parentElement;
  }

  return null;
}

export function getCandidateBlockGridSibling(element, direction, surfaceElement) {
  const parentNode = element?.parentNode || null;

  if (!parentNode) {
    return null;
  }

  const currentIndex = Array.prototype.indexOf.call(parentNode.childNodes, element);
  const siblingNode = getAdjacentCandidateBlockBoundaryNode(
    parentNode,
    currentIndex + (direction === "backward" ? -1 : 1),
    direction,
  );
  const gridElement = getCandidateBlockGridFromBoundaryNode(siblingNode, direction);

  return gridElement instanceof HTMLElement && surfaceElement.contains(gridElement) ? gridElement : null;
}

export function isBlankBoundaryHostAdjacentToCandidateBlockGrid(range, surfaceElement) {
  const hostElement = getCandidateBlockBoundaryHostElement(range, surfaceElement);

  return Boolean(
    hostElement &&
      isBlankCandidateBlockBoundaryHost(hostElement) &&
      (
        getCandidateBlockGridSibling(hostElement, "backward", surfaceElement) ||
        getCandidateBlockGridSibling(hostElement, "forward", surfaceElement)
      )
  );
}

export function shouldPreventCandidateBlockGridNativeDeletion(event, surfaceElement) {
  const direction = event?.key === "Backspace" ? "backward" : event?.key === "Delete" ? "forward" : "";

  if (!direction || !(surfaceElement instanceof HTMLElement)) {
    return false;
  }

  const selection = window.getSelection?.();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;

  if (!range || !surfaceElement.contains(range.commonAncestorContainer)) {
    return false;
  }

  if (!range.collapsed) {
    return doesRangeIncludeCandidateBlockGrid(range, surfaceElement);
  }

  if (isBlankBoundaryHostAdjacentToCandidateBlockGrid(range, surfaceElement)) {
    return true;
  }

  return Boolean(getCandidateBlockGridAdjacentToRange(range, direction, surfaceElement));
}

export function normalizeCandidateBlockBoundaryHostHtml(value = "") {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, "")
    .replace(/\s+/g, "")
    .trim();
}

export function isBlankCandidateBlockBoundaryHost(element) {
  return normalizeCandidateBlockBoundaryHostHtml(element?.innerHTML || "") === "";
}
