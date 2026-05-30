import { getObjectCandidateBlockVisualScale } from "./object-alignment-runtime.js";
import { templateEditorObjectMinimumSize } from "./object-toolbar-constants.js";
import { parseObjectSizePixelValue } from "./object-size-values.js";

export function getCandidateBlockModalContentSize(modalSurfaceElement) {
  if (!(modalSurfaceElement instanceof HTMLElement)) {
    return null;
  }

  const modalRect = modalSurfaceElement.getBoundingClientRect();
  const visualScale = getObjectCandidateBlockVisualScale(modalSurfaceElement);
  const scaleX = Math.max(visualScale.x || 1, 0.01);
  const scaleY = Math.max(visualScale.y || 1, 0.01);
  const width =
    parseObjectSizePixelValue(modalSurfaceElement.dataset?.candidateBlockLogicalContentWidth, 0) ||
    parseObjectSizePixelValue(modalSurfaceElement.dataset?.candidateBlockLogicalWidth, 0) ||
    modalSurfaceElement.clientWidth ||
    modalSurfaceElement.offsetWidth ||
    (modalRect.width > 0 ? modalRect.width / scaleX : 0);
  const height =
    parseObjectSizePixelValue(modalSurfaceElement.dataset?.candidateBlockLogicalContentHeight, 0) ||
    parseObjectSizePixelValue(modalSurfaceElement.dataset?.candidateBlockLogicalHeight, 0) ||
    modalSurfaceElement.clientHeight ||
    modalSurfaceElement.offsetHeight ||
    (modalRect.height > 0 ? modalRect.height / scaleY : 0);

  return {
    height: Math.max(templateEditorObjectMinimumSize, Math.floor(height || templateEditorObjectMinimumSize)),
    width: Math.max(templateEditorObjectMinimumSize, Math.floor(width || templateEditorObjectMinimumSize)),
  };
}
