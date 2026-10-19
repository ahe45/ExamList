import {
  getObjectAlignmentCanvasMetrics,
  getObjectAlignmentDocumentElement,
  getSelectedObjectAlignmentElements,
  isObjectEditorReadOnly,
  prepareObjectAlignmentItems,
} from "./object-alignment-runtime.js";
import { syncTemplateEditorObjectFlowObjects, reflowTemplateEditorObjectRows } from "./object-flow-reflow.js";
import { createObjectFlowToolbar, insertObjectToolbarSection } from "./object-toolbar-ui.js";

export function bindObjectFlowControls({ editor, surfaceElement, toolbarHost }) {
  if (!editor || !surfaceElement || !toolbarHost) return null;
  toolbarHost.querySelector(".examlist-object-flow-control")?.remove();
  const section = createObjectFlowToolbar();
  insertObjectToolbarSection(toolbarHost, section, ".examlist-object-align-control");
  const checkbox = section.querySelector("[data-examlist-object-inline]");
  const ownerDocument = surfaceElement.ownerDocument;
  const view = ownerDocument.defaultView;
  let frame = 0;
  const getSelection = () => [...new Set([
    ...getSelectedObjectAlignmentElements(surfaceElement),
    ...surfaceElement.querySelectorAll("[data-candidate-block-grid].is-selected-candidate-block-grid"),
  ])].filter(element => element.closest(".template-doc") &&
    !element.closest("td, th, [data-candidate-block-instance], [data-candidate-block-column-name], [data-candidate-block-modal-editor-surface]"));

  const sync = () => {
    frame = 0;
    const selected = getSelection();
    const checkedCount = selected.filter(element => element.dataset.templateObjectInline !== "false").length;
    checkbox.disabled = isObjectEditorReadOnly(surfaceElement) || !selected.length;
    checkbox.checked = selected.length > 0 && checkedCount === selected.length;
    checkbox.indeterminate = checkedCount > 0 && checkedCount < selected.length;
  };
  const schedule = () => { if (!frame) frame = view.requestAnimationFrame(sync); };
  const change = () => {
    if (isObjectEditorReadOnly(surfaceElement)) { sync(); return; }
    const selected = getSelection();
    if (!selected.length) return;
    const documentElement = getObjectAlignmentDocumentElement(surfaceElement);
    const metrics = getObjectAlignmentCanvasMetrics(documentElement);
    const items = prepareObjectAlignmentItems(selected, documentElement, metrics);
    items.forEach(({ element }) => { element.dataset.templateObjectInline = String(checkbox.checked); });
    // Remove the old reserved space before recalculating the remaining rows.
    syncTemplateEditorObjectFlowObjects(documentElement);
    if (checkbox.checked) {
      items.forEach(({ element, top, height }) => reflowTemplateEditorObjectRows(element, {
        documentElement, activeTop: top, activeHeight: height, reorderByPosition: true,
      }));
    }
    editor.sync?.({ preserveSelection: false });
    editor.updateImageSelectionOverlay?.();
    editor.updateTableObjectOverlay?.();
    schedule();
  };
  const observer = new view.MutationObserver(schedule);
  observer.observe(surfaceElement, { subtree: true, childList: true, attributes: true,
    attributeFilter: ["class", "data-template-object-inline", "contenteditable"] });
  checkbox.addEventListener("change", change);
  ownerDocument.addEventListener("selectionchange", schedule);
  sync();
  return () => {
    observer.disconnect();
    if (frame) view.cancelAnimationFrame(frame);
    ownerDocument.removeEventListener("selectionchange", schedule);
    checkbox.removeEventListener("change", change);
    section.remove();
  };
}
