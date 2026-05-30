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
