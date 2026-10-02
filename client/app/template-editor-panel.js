// Nested dialogs must not destroy the live block editor or its uncommitted draft.
export function renderTemplateEditorPanel(panel, html) {
  const next = panel.ownerDocument.createElement("template");
  next.innerHTML = html;
  const currentHost = panel.querySelector("#templateEditorRuntimeHost");
  const nextHost = next.content.querySelector("#templateEditorRuntimeHost");
  const hasNestedEditorDialog = currentHost?.querySelector("[data-candidate-block-modal-editor-surface]") ||
    panel.querySelector(".data-tag-format-modal-overlay") || next.content.querySelector(".data-tag-format-modal-overlay");
  if (
    currentHost && hasNestedEditorDialog && nextHost &&
    currentHost.dataset.templateId === nextHost.dataset.templateId &&
    currentHost.dataset.pageId === nextHost.dataset.pageId
  ) {
    currentHost.classList.toggle("is-template-editor-modal-open", nextHost.classList.contains("is-template-editor-modal-open"));
    for (const attribute of ["inert", "aria-hidden"]) {
      if (nextHost.hasAttribute(attribute)) currentHost.setAttribute(attribute, nextHost.getAttribute(attribute));
      else currentHost.removeAttribute(attribute);
    }
    nextHost.replaceWith(currentHost);
  }
  panel.replaceChildren(next.content);
}
