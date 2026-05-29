const TEXT_NODE = 3;

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
