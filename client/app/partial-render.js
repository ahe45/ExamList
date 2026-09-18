const renderedHtml = new WeakMap();
function compatible(left, right) {
  return left.nodeType === right.nodeType && left.nodeName === right.nodeName && (left.nodeType !== 1 || left.id === right.id);
}
function patchNode(target, source) {
  if (target.isEqualNode(source)) return;
  if (target.nodeType !== 1) { target.nodeValue = source.nodeValue; return; }
  for (const attribute of Array.from(target.attributes)) if (!source.hasAttribute(attribute.name)) target.removeAttribute(attribute.name);
  for (const attribute of Array.from(source.attributes)) if (target.getAttribute(attribute.name) !== attribute.value) target.setAttribute(attribute.name, attribute.value);
  patchChildren(target, source);
  if (target.tagName === "INPUT") {
    target.checked = source.checked;
    if (target.type !== "file" && target.value !== source.value) target.value = source.value;
  } else if (target.tagName === "SELECT") {
    if (target.value !== source.value) target.value = source.value;
  } else if (target.tagName === "TEXTAREA") {
    if (target.value !== source.value) target.value = source.value;
  }
}
function patchChildren(target, source) {
  let existing = target.firstChild;
  for (const next of Array.from(source.childNodes)) {
    if (!existing) { target.append(next.cloneNode(true)); continue; }
    if (!compatible(existing, next)) {
      const replacement = next.cloneNode(true);
      const following = existing.nextSibling;
      target.replaceChild(replacement, existing);
      existing = following;
    } else { patchNode(existing, next); existing = existing.nextSibling; }
  }
  while (existing) { const following = existing.nextSibling; existing.remove(); existing = following; }
}
// Event handlers are delegated to document. Retaining unchanged nodes preserves focus and scroll.
export function renderPartialHtml(target, html) {
  const value = String(html || "");
  if (renderedHtml.get(target) === value) return false;
  const template = target.ownerDocument.createElement("template");
  template.innerHTML = value;
  patchChildren(target, template.content);
  renderedHtml.set(target, value);
  return true;
}
export function clearPartialHtml(target) {
  renderedHtml.delete(target);
  target.replaceChildren();
}
