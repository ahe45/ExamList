import { canUseAccess } from "../../app/access.js";
import { getActiveSchoolId, getActiveSchoolRouteKey } from "../../app/school-context.js";
import { getDocumentContentRoot } from "./document-overflow.js";
import { createDocumentCompositionRuntime } from "./document-composition-runtime.js";
import { createDocumentOverflowRuntime } from "./document-overflow-runtime.js";
import { createDocumentSurfaceRuntime } from "./document-surface-runtime.js";
import {
  clearTemplateEditorRuntimeDirtyStateIfAtBaseline,
  mountTemplateEditorRuntime,
  syncTemplateEditorRuntimeToState,
  unmountTemplateEditorRuntime,
} from "./editor-runtime-adapter.js";
import { getActiveDocumentTableCell } from "./document-table-actions.js";
import { bindTemplateEditorEventHandlers } from "./template-editor-event-bindings.js";
import { createDocumentImageRuntime } from "./document-image-runtime.js";
import { createDocumentHistoryRuntime } from "./document-history-runtime.js";
import { createDocumentInsertionActions } from "./document-insertion-actions.js";
import { createDocumentToolbarActions } from "./document-toolbar-actions.js";
import { createDataTagSampleActions } from "./data-tag-sample-actions.js";
import { createDataTagFormatActions } from "./data-tag-format-actions.js";
import { createGenerationUnitSettingsActions } from "./generation-unit-settings-actions.js";
import { createTemplateEditorPersistenceActions } from "./template-editor-persistence-actions.js";
import { createTemplateEditorStateActions } from "./template-editor-state-actions.js";
import { createTemplateEditorDocumentRefresh } from "./template-editor-document-refresh.js";
import { createSelectedPageDocumentHtmlSync } from "./template-editor-document-sync.js";
import { createTemplateEditorPageSelection } from "./template-editor-page-selection.js";
import { createDocumentEditorRuntimeReset } from "./template-editor-reset-runtime.js";
import { createTemplateEditorReturnedActions } from "./template-editor-return-actions.js";

const appConfig = window.ExamListAppConfig;

export function setupTemplateEditorActions({
  appState,
  navigateToPath,
  onStateChange,
  requestUnsavedTemplateEditorAction = async (action) => {
    await action?.();
    return true;
  },
  templatesActions,
}) {
  let syncSelectedPageDocumentHtml = () => {
    throw new Error("Template editor document HTML sync is not initialized.");
  };

  function hasPermission(permissionKey) {
    return canUseAccess(appState.summary, permissionKey);
  }

  function getCurrentSchoolId() {
    return getActiveSchoolId(appState);
  }

  function getCurrentSchoolRouteKey() {
    return getActiveSchoolRouteKey(appState);
  }

  function canManageTemplates() {
    return hasPermission("manageTemplates");
  }

  const {
    clearDocumentActiveCell,
    getClosestDocumentSurface,
    getDocumentScaleBoxByPageId,
    getDocumentSurfaceByPageId,
    getDocumentSurfacePageId,
    updateDocumentActiveCell,
  } = createDocumentSurfaceRuntime({
    appState,
    getActiveDocumentTableCell,
  });

  const {
    clearDocumentOverflowRuntime,
    getLastValidDocumentHtml,
    rememberValidDocumentHtml,
    setDocumentOverflowState,
    syncDocumentOverflowUi,
  } = createDocumentOverflowRuntime({
    appState,
    getDocumentSurfaceByPageId,
  });

  const {
    clearPendingDocumentCompositionSync,
    isDocumentSurfaceComposing,
    resetDocumentCompositionRuntime,
    scheduleDocumentCompositionSync,
    setDocumentCompositionState,
  } = createDocumentCompositionRuntime({
    appState,
    getDocumentSurfaceByPageId,
    getDocumentSurfacePageId,
    syncSelectedPageDocumentHtml: (...args) => syncSelectedPageDocumentHtml(...args),
  });

  const documentImageRuntime = createDocumentImageRuntime({
    appState,
    clearDocumentActiveCell,
    getClosestDocumentSurface,
    getDocumentContentRoot,
    getDocumentScaleBoxByPageId,
    getDocumentSurfaceByPageId,
    syncSelectedPageDocumentHtml: (...args) => syncSelectedPageDocumentHtml(...args),
  });
  const {
    clearDocumentImageSelection,
    decorateDocumentSurfaceImages,
    getDocumentImageTarget,
    handleDocumentImageMove,
    handleDocumentImageResize,
    releaseDocumentImageMoveSession,
    releaseDocumentImageResizeSession,
    selectDocumentImage,
    startDocumentImageMoveSession,
    startDocumentImageResizeSession,
    updateDocumentImageSelectionOverlay,
  } = documentImageRuntime;
  let documentToolbarActions = null;
  const refreshDocumentEditorRuntime = createTemplateEditorDocumentRefresh({
    appState,
    clearDocumentImageSelection,
    decorateDocumentSurfaceImages,
    getDocumentSurfaceByPageId,
    getUpdateDocumentFormattingControls: () => documentToolbarActions?.updateDocumentFormattingControls,
    rememberValidDocumentHtml,
    setDocumentOverflowState,
    updateDocumentActiveCell,
    updateDocumentImageSelectionOverlay,
  });

  const {
    updateSelectedPageDocumentHtml,
    updateSelectedPageField,
    updateSelectedPageMarginField,
    updateTemplateField,
  } = createTemplateEditorStateActions({
    appState,
    canManageTemplates,
    onStateChange,
  });

  const {
    createDocumentSelectionSnapshot,
    getDocumentHistoryState,
    getDocumentNodeMaxOffset,
    getLastDocumentSelectionRange,
    initializeDocumentHistoryForPage,
    moveDocumentCaretToEnd,
    recordDocumentHistorySnapshot,
    redoDocumentHistory,
    rememberDocumentRange,
    rememberDocumentSelection,
    resetDocumentHistoryRuntime,
    restoreDocumentSelection,
    restoreDocumentSelectionSnapshot,
    setLastDocumentSelectionPage,
    undoDocumentHistory,
  } = createDocumentHistoryRuntime({
    appState,
    getClosestDocumentSurface,
    getDocumentSurfaceByPageId,
    refreshDocumentEditorRuntime,
    updateSelectedPageDocumentHtml,
  });
  const resetDocumentEditorRuntime = createDocumentEditorRuntimeReset({
    appState,
    clearDocumentOverflowRuntime,
    resetDocumentCompositionRuntime,
    resetDocumentHistoryRuntime,
  });

  const setSelectedPage = createTemplateEditorPageSelection({
    appState,
    clearDocumentImageSelection,
    getDocumentHistoryState,
    setLastDocumentSelectionPage,
  });
  syncSelectedPageDocumentHtml = createSelectedPageDocumentHtmlSync({
    appState,
    clearTemplateEditorRuntimeDirtyState: () => clearTemplateEditorRuntimeDirtyStateIfAtBaseline({ appState }),
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
  });

  const {
    closeTemplatePreview,
    discardTemplateEditorChanges,
    loadTemplateEditor,
    openTemplatePreview,
    saveDataTagSettings,
    saveTemplateLayout,
  } = createTemplateEditorPersistenceActions({
    appState,
    canManageTemplates,
    getCurrentSchoolId,
    hasPermission,
    initializeDocumentHistoryForPage,
    onStateChange,
    refreshDocumentEditorRuntime,
    resetDocumentEditorRuntime,
    setLastDocumentSelectionPage,
    syncDocumentOverflowUi,
    syncSelectedPageDocumentHtml,
    templatesActions,
  });

  const {
    closeDataTagSampleModal,
    isDataTagSampleModalDirty,
    openDataTagSampleModal,
    resetDataTagSampleModal,
    saveDataTagSampleModal,
    updateDataTagSampleDraftValue,
  } = createDataTagSampleActions({
    appState,
    onSaveDataTagSettings: saveDataTagSettings,
    onStateChange,
  });
  const {
    closeDataTagFormatModal,
    openDataTagFormatModal,
    saveDataTagFormatModal,
    updateDataTagFormatDraftValue,
  } = createDataTagFormatActions({
    appState,
    canManageTemplates,
    onStateChange,
    syncSelectedPageDocumentHtml,
  });
  const {
    closeGenerationUnitSettingsModal,
    openGenerationUnitSettingsModal,
    saveGenerationUnitSettingsModal,
    syncGenerationUnitPriorityRows,
  } = createGenerationUnitSettingsActions({
    appState,
    canManageTemplates,
    onStateChange,
  });

  const {
    applyDocumentCommand,
    getActiveDocumentRange,
    handleDocumentTokenDeletion,
    insertDataTag,
    insertDocumentBarcode,
    insertDocumentDivider,
    insertDocumentImageFile,
    insertDocumentPhoto,
    insertDocumentQrCode,
    insertDocumentTable,
    triggerDocumentImageSelection,
  } = createDocumentInsertionActions({
    appState,
    getDocumentNodeMaxOffset,
    getDocumentSurfaceByPageId,
    getLastDocumentSelectionRange,
    moveDocumentCaretToEnd,
    rememberDocumentRange,
    rememberDocumentSelection,
    restoreDocumentSelection,
    syncSelectedPageDocumentHtml,
  });

  documentToolbarActions = createDocumentToolbarActions({
    appState,
    applyDocumentCommand,
    getActiveDocumentRange,
    getActiveDocumentTableCell,
    getDocumentSurfaceByPageId,
    rememberDocumentSelection,
    restoreDocumentSelection,
    syncSelectedPageDocumentHtml,
  });
  const {
    applyDocumentColor,
    applyDocumentFontFamily,
    applyDocumentFontSize,
    closeDocumentToolbarPanels,
    setDocumentColorPanelVisibility,
    setDocumentColorValue,
    setDocumentFontFamilyMenuVisibility,
    setDocumentFontSizeMenuVisibility,
    setDocumentPopoverVisibility,
    syncDocumentFontFamilyComboSelection,
    syncDocumentFontSizeMenuSelection,
    updateDocumentFormattingControls,
  } = documentToolbarActions;

  bindTemplateEditorEventHandlers({
    appState,
    applyDocumentColor,
    applyDocumentCommand,
    applyDocumentFontFamily,
    applyDocumentFontSize,
    canManageTemplates,
    clearPendingDocumentCompositionSync,
    clearDocumentImageSelection,
    closeDocumentToolbarPanels,
    closeDataTagFormatModal,
    closeDataTagSampleModal,
    closeGenerationUnitSettingsModal,
    closeTemplatePreview,
    getClosestDocumentSurface,
    getDocumentImageTarget,
    getDocumentSurfacePageId,
    handleDocumentImageMove,
    handleDocumentImageResize,
    handleDocumentTokenDeletion,
    insertDataTag,
    insertDocumentBarcode,
    insertDocumentDivider,
    insertDocumentImageFile,
    insertDocumentPhoto,
    insertDocumentQrCode,
    insertDocumentTable,
    isDocumentSurfaceComposing,
    onStateChange,
    openDataTagSampleModal,
    openDataTagFormatModal,
    openGenerationUnitSettingsModal,
    openTemplatePreview,
    redoDocumentHistory,
    refreshDocumentEditorRuntime,
    releaseDocumentImageMoveSession,
    releaseDocumentImageResizeSession,
    rememberDocumentSelection,
    saveTemplateLayout,
    saveGenerationUnitSettingsModal,
    resetDataTagSampleModal,
    requestUnsavedTemplateEditorAction,
    saveDataTagSampleModal,
    saveDataTagFormatModal,
    scheduleDocumentCompositionSync,
    selectDocumentImage,
    setDocumentColorPanelVisibility,
    setDocumentColorValue,
    setDocumentCompositionState,
    setDocumentFontFamilyMenuVisibility,
    setDocumentFontSizeMenuVisibility,
    setDocumentPopoverVisibility,
    setSelectedPage,
    syncGenerationUnitPriorityRows,
    syncDocumentFontFamilyComboSelection,
    syncDocumentFontSizeMenuSelection,
    startDocumentImageMoveSession,
    startDocumentImageResizeSession,
    syncSelectedPageDocumentHtml,
    triggerDocumentImageSelection,
    undoDocumentHistory,
    updateDataTagSampleDraftValue,
    updateDataTagFormatDraftValue,
    updateDocumentImageSelectionOverlay,
    updateSelectedPageField,
    updateSelectedPageMarginField,
    updateTemplateField,
  });

  return createTemplateEditorReturnedActions({
    appConfig,
    appState,
    closeDataTagFormatModal,
    closeTemplatePreview,
    closeDataTagSampleModal,
    closeGenerationUnitSettingsModal,
    getCurrentSchoolRouteKey,
    discardTemplateEditorChanges,
    isDataTagSampleModalDirty,
    loadTemplateEditor,
    mountTemplateEditorRuntime,
    navigateToPath,
    openTemplatePreview,
    openDataTagSampleModal,
    resetDataTagSampleModal,
    saveTemplateLayout,
    syncTemplateEditorRuntimeToState: () => syncTemplateEditorRuntimeToState({ appState }),
    saveDataTagSampleModal,
    unmountTemplateEditorRuntime,
  });
}
