import {
  candidateBlockGridMinimumHeight,
  candidateBlockGridMinimumRowHeight,
  candidateBlockGridMinimumWidth,
} from "./candidate-block-grid-config.js";
import { getCandidateBlockGridTableMinimumSize } from "./candidate-block-grid-table-normalizer.js";
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

export function getCandidateBlockGridMinimumSize(gridElement) {
  const tableMinimumSize = getCandidateBlockGridTableMinimumSize(gridElement);
  const gridStyle = window.getComputedStyle(gridElement);
  const rowCount = Math.max(1, Math.round(Number(gridElement?.dataset?.candidateBlockRows) || 1));
  const rowGap = parseObjectSizePixelValue(gridStyle.rowGap || gridStyle.gap, 0);
  const rowMinimumHeight = Math.ceil(
    rowCount * candidateBlockGridMinimumRowHeight +
      Math.max(0, rowCount - 1) * rowGap,
  );

  return {
    height: Math.max(candidateBlockGridMinimumHeight, rowMinimumHeight, Math.floor(tableMinimumSize.height || 0)),
    width: Math.max(candidateBlockGridMinimumWidth, Math.floor(tableMinimumSize.width || 0)),
  };
}
