import { showToast } from "../../app/toast.js";
import {
  collapseCandidateBlockGridForStorage,
  removeCandidateBlockGridRuntimeControls,
} from "./candidate-block-grid-dom.js";
import { hydrateCandidateBlockGridObjects } from "./candidate-block-grid-object-controls.js";
import {
  serializeEditableDocumentRoot,
  syncEditableDocumentRoot,
} from "./document-editor.js";
import { syncCandidateBlockTemplateFromSurface } from "./candidate-block-grid-surface.js";
import { getDocumentSurfaceOverflowInfo } from "./document-overflow.js";
import { syncTemplateEditorObjectFlowObjects } from "./object-flow-reflow.js";
import { getEditorPages } from "./state.js";

const documentOverflowAutoRevertThresholdPx = 700;

function getDocumentSyncPageById(appState, pageId) {
  return getEditorPages(appState?.templateEditor).find((page) => page.id === pageId) || null;
}

function getRuntimeLastValidDocumentHtml() {
  return String(
    window.ExamListTemplateEditorRuntime?.state?.templateEditor?.lastValidHtml ||
      "",
  );
}

function removeDocumentTransientEditorOverlays(surface) {
  surface
    ?.querySelectorAll?.(
      [
        ".template-editor-image-selection",
        ".template-editor-image-resize-handle",
        ".examlist-object-selection",
        ".examlist-object-resize-handle",
        ".template-editor-table-selection",
        ".template-editor-table-handle",
        ".template-editor-table-move-handle",
        ".template-editor-table-select-handle",
        "[data-candidate-block-grid-resize-handle]",
        "[data-candidate-block-grid-move-handle]",
      ].join(", "),
    )
    .forEach((element) => element.remove());
}

function normalizeCandidateBlockGridDocumentHtmlForStorage(html) {
  const template = document.createElement("template");

  template.innerHTML = String(html || "");
  removeCandidateBlockGridRuntimeControls(template.content);
  collapseCandidateBlockGridForStorage(template.content);
  return template.innerHTML;
}

function shouldAutoRevertDocumentOverflow(overflowInfo) {
  return Math.max(
    Number(overflowInfo?.heightOverflow) || 0,
    Number(overflowInfo?.widthOverflow) || 0,
  ) >= documentOverflowAutoRevertThresholdPx;
}

function syncLiveDocumentRoot(surface) {
  syncEditableDocumentRoot(surface);
  hydrateCandidateBlockGridObjects(surface);
}

export function createSelectedPageDocumentHtmlSync({
  appState,
  clearTemplateEditorRuntimeDirtyState = () => {},
  createDocumentSelectionSnapshot,
  getDocumentSurfaceByPageId,
  getLastValidDocumentHtml,
  moveDocumentCaretToEnd,
  recordDocumentHistorySnapshot,
  refreshDocumentEditorRuntime,
  rememberDocumentSelection,
  rememberValidDocumentHtml,
  restoreDocumentSelectionSnapshot,
  setDocumentOverflowState,
  updateSelectedPageDocumentHtml,
}) {
  function scheduleDeferredOverflowRecheck(pageId, options = {}) {
    if (
      options.deferredOverflowCheck === true ||
      options.revertOnOverflow !== true ||
      typeof window === "undefined" ||
      typeof window.requestAnimationFrame !== "function"
    ) {
      return;
    }

    window.requestAnimationFrame(() => {
      syncSelectedPageDocumentHtml({
        ...options,
        deferredOverflowCheck: true,
        forceHistory: false,
        history: false,
        pageId,
      });
    });
  }

  function syncSelectedPageDocumentHtml(options = {}) {
    const pageId = options.pageId || appState.templateEditor.selectedPageId;
    const surface = getDocumentSurfaceByPageId(pageId);

    if (!surface) {
      return;
    }

    const preserveSelection = options.preserveSelection !== false;
    const selectionSnapshot = preserveSelection ? createDocumentSelectionSnapshot(pageId) : null;
    const page = getDocumentSyncPageById(appState, pageId);
    let postSyncToastMessage = "";
    let postSyncToastOptions = {};
    let revertedOverflowToLastValidHtml = false;

    if (page && surface.querySelector("[data-candidate-block-grid], .examlist-candidate-block-grid")) {
      syncCandidateBlockTemplateFromSurface(surface, page, null, { allowFallback: true });
    }
    syncLiveDocumentRoot(surface);
    syncTemplateEditorObjectFlowObjects(surface.querySelector(".template-doc") || surface);

    let normalizedHtml = serializeEditableDocumentRoot(surface);
    const overflowInfo = getDocumentSurfaceOverflowInfo(surface);

    if (overflowInfo.hasOverflow) {
      const lastValidHtml = getRuntimeLastValidDocumentHtml() || getLastValidDocumentHtml(pageId);

      if (
        lastValidHtml &&
        lastValidHtml !== normalizedHtml &&
        options.revertOnOverflow === true &&
        shouldAutoRevertDocumentOverflow(overflowInfo)
      ) {
        const overflowRevertMessage = "A4 용지 영역을 초과하여 마지막 정상 내용으로 되돌렸습니다.";

        surface.innerHTML = lastValidHtml;
        removeDocumentTransientEditorOverlays(surface);
        syncLiveDocumentRoot(surface);
        normalizedHtml = serializeEditableDocumentRoot(surface);

        if (!restoreDocumentSelectionSnapshot(selectionSnapshot, pageId)) {
          moveDocumentCaretToEnd(surface);
        }

        setDocumentOverflowState(
          pageId,
          { hasOverflow: false, heightOverflow: 0, widthOverflow: 0 },
          overflowRevertMessage,
        );
        postSyncToastMessage = overflowRevertMessage;
        postSyncToastOptions = { tone: "error" };
        revertedOverflowToLastValidHtml = true;
      } else {
        setDocumentOverflowState(pageId, overflowInfo);
        scheduleDeferredOverflowRecheck(pageId, options);
      }
    } else {
      rememberValidDocumentHtml(pageId, normalizedHtml);
      setDocumentOverflowState(pageId, overflowInfo, "");
    }

    const restoredSelection = selectionSnapshot ? restoreDocumentSelectionSnapshot(selectionSnapshot, pageId) : false;

    if (!restoredSelection && preserveSelection) {
      moveDocumentCaretToEnd(surface);
    } else if (!preserveSelection) {
      rememberDocumentSelection();
    }

    const nextSelection = createDocumentSelectionSnapshot(pageId);
    const storedHtml = options.collapseCandidateBlockGridForStorage === true
      ? normalizeCandidateBlockGridDocumentHtmlForStorage(normalizedHtml)
      : normalizedHtml;

    updateSelectedPageDocumentHtml(storedHtml, {
      pageId,
      render: options.render,
    });

    if (revertedOverflowToLastValidHtml) {
      clearTemplateEditorRuntimeDirtyState();
    }

    if (options.history !== false) {
      recordDocumentHistorySnapshot(pageId, {
        force: Boolean(options.forceHistory),
        html: normalizedHtml,
        selection: nextSelection,
      });
    }

    refreshDocumentEditorRuntime(pageId);

    if (postSyncToastMessage) {
      showToast(postSyncToastMessage, postSyncToastOptions);
    }
  }

  return syncSelectedPageDocumentHtml;
}
