(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.ExamListTemplateEditorEvents = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createTemplateEditorEventController({
    applyTemplateEditorFontFamily,
    applyTemplateEditorFontSize,
    applyToolbarColorTrigger,
    applyToolbarHexColorInput,
    clearTemplateEditorImageSelection,
    clearTemplateEditorTableHoverState,
    clearTemplateEditorTableObjectHoverState,
    clearTemplateEditorTableObjectSelection,
    clearTemplateEditorTableSelection,
    getTemplateEditorImageTarget,
    getTemplateEditorModal,
    getTemplateEditorSurface,
    handleClick,
    handleKeydown,
    handleTemplateTableAction,
    handleTemplateEditorTableObjectPointerDown,
    handleTemplateEditorTablePointerDown,
    handleTemplatePageSettingChange,
    insertTemplateImage,
    ownerDocument,
    ownerWindow,
    saveTemplateEditorSelection,
    selectTemplateEditorImage,
    shell,
    startTemplateEditorImageMoveSession,
    state,
    syncTemplateEditorContent,
    toolbar,
    toolbarElements,
    toolbarIds,
    redoTemplateEditorHistory = () => {},
    undoTemplateEditorHistory = () => {},
    updateTemplateEditorActiveCell,
    updateTemplateEditorFormattingControls,
    updateTemplateEditorImageSelectionOverlay,
    updateTemplateEditorTableHoverState,
    updateTemplateEditorTableObjectHoverState,
    updateTemplateEditorTableObjectOverlay,
    updateTemplateTableControls,
  }) {
    const isElement = (target) => Boolean(target && target instanceof ownerWindow.Element);

    function isCompositionInputEvent(event) {
      const inputType = String(event?.inputType || "");

      return Boolean(
        event?.isComposing ||
          inputType === "insertCompositionText" ||
          inputType === "deleteCompositionText"
      );
    }

    function isTemplateEditorToolbarFocusElement(element) {
      if (!isElement(element)) {
        return false;
      }

      return Boolean(
        shell.toolbarHost?.contains?.(element) ||
          shell.tagHost?.contains?.(element) ||
          shell.pagePropertiesHost?.contains?.(element)
      );
    }

    function isTemplateEditorSurfaceRootSelection(selection, templateEditorSurface) {
      if (!selection || !templateEditorSurface || selection.rangeCount === 0) {
        return false;
      }

      const range = selection.getRangeAt(0);

      return (
        selection.anchorNode === templateEditorSurface ||
        selection.focusNode === templateEditorSurface ||
        range.commonAncestorContainer === templateEditorSurface
      );
    }

    function resolveTemplateEditorSnapshotNode(path) {
      const templateEditorSurface = getTemplateEditorSurface();

      if (!templateEditorSurface || !Array.isArray(path)) {
        return null;
      }

      let currentNode = templateEditorSurface;

      for (const index of path) {
        currentNode = currentNode?.childNodes?.[index] || null;

        if (!currentNode) {
          return null;
        }
      }

      return currentNode;
    }

    function getTemplateEditorNodeMaxOffset(node) {
      if (!node) {
        return 0;
      }

      return node.nodeType === (ownerWindow.Node?.TEXT_NODE || 3) ? node.textContent.length : node.childNodes.length;
    }

    function createTemplateEditorRangeFromSnapshot(snapshot = state.templateEditor.savedSelectionSnapshot) {
      if (!snapshot || typeof ownerDocument.createRange !== "function") {
        return null;
      }

      const startNode = resolveTemplateEditorSnapshotNode(snapshot.startPath);
      const endNode = resolveTemplateEditorSnapshotNode(snapshot.endPath);

      if (!startNode || !endNode) {
        return null;
      }

      const range = ownerDocument.createRange();

      try {
        range.setStart(startNode, Math.min(snapshot.startOffset, getTemplateEditorNodeMaxOffset(startNode)));
        range.setEnd(endNode, Math.min(snapshot.endOffset, getTemplateEditorNodeMaxOffset(endNode)));
      } catch (_error) {
        return null;
      }

      return range;
    }

    function restoreTemplateEditorSavedRangeFromSnapshot() {
      const range = createTemplateEditorRangeFromSnapshot();

      if (!range) {
        return false;
      }

      state.templateEditor.savedRange = range;
      return true;
    }

    function getTemplateEditorActiveTableSelectionCells() {
      const templateEditorSurface = getTemplateEditorSurface();
      const selection = state.templateEditor.tableSelection;
      const selectedCells = Array.isArray(selection?.selectedCells) ? selection.selectedCells : [];

      if (!templateEditorSurface || !selectedCells.length) {
        return [];
      }

      return selectedCells.filter((cell) => cell?.isConnected !== false && templateEditorSurface.contains(cell));
    }

    function restoreTemplateEditorTableSelectionVisualState() {
      const selectedCells = getTemplateEditorActiveTableSelectionCells();

      if (!selectedCells.length) {
        return false;
      }

      selectedCells.forEach((cell) => cell.classList?.add?.("is-selected-cell"));
      return true;
    }

    function refreshTemplateEditorSelectionVisualState() {
      restoreTemplateEditorSavedRangeFromSnapshot();
      restoreTemplateEditorTableSelectionVisualState();
    }

    function scheduleTemplateEditorSelectionVisualStateRefresh() {
      ownerWindow.setTimeout(() => {
        if (state.templateEditor.suppressToolbarSelectionChange || isTemplateEditorToolbarFocusElement(ownerDocument.activeElement)) {
          refreshTemplateEditorSelectionVisualState();
        }
      }, 0);
    }

    function saveTemplateEditorSelectionFromToolbarPointer() {
      if (state.templateEditor.suppressToolbarSelectionChange) {
        return;
      }

      saveTemplateEditorSelection();
    }

    function getTemplateEditorToolbarPointerTarget(target) {
      const toolbarTrigger = target.closest(
        "[data-template-command], [data-template-table-action], [data-template-cell-split-step], [data-template-cell-split-toggle], [data-template-cell-split-confirm], [data-template-insert], [data-template-open-image], [data-template-image-insert-toggle], [data-template-insert-school-logo], [data-template-tag], .template-tag-accordion-summary, [data-editor-color-preset], [data-editor-color-apply], [data-editor-color-toggle], [data-editor-color-direct], [data-editor-font-family-toggle], [data-editor-font-family-option], [data-editor-font-size-toggle], [data-editor-font-size-option], [data-template-line-height-toggle], [data-template-line-height-option], [data-editor-border-select-toggle], [data-editor-border-select-option]",
      );
      const toolbarSelectionControl = target.closest(
        `#${toolbarIds.fontFamily}, #${toolbarIds.textColor}, #${toolbarIds.textShading}, #${toolbarIds.cellShading}, #${toolbarIds.borderTarget}, #${toolbarIds.borderStyle}, #${toolbarIds.borderWidth}, #${toolbarIds.borderColor}, #${toolbarIds.cellPaddingTop}, #${toolbarIds.cellPaddingRight}, #${toolbarIds.cellPaddingBottom}, #${toolbarIds.cellPaddingLeft}, #${toolbarIds.tableRows}, #${toolbarIds.tableColumns}, #${toolbarIds.cellSplitPanel}, [data-editor-color-hex-input], [data-template-editor-runtime-page-properties] [data-template-page-setting]`,
      );

      return { toolbarSelectionControl, toolbarTrigger };
    }

    function handleToolbarPointerDownCapture(event) {
      const target = isElement(event.target) ? event.target : null;

      if (!target || !getTemplateEditorModal().contains(target)) {
        return;
      }

      const { toolbarSelectionControl, toolbarTrigger } = getTemplateEditorToolbarPointerTarget(target);

      if (toolbarTrigger && event.defaultPrevented) {
        return;
      }

      if (toolbarTrigger) {
        saveTemplateEditorSelectionFromToolbarPointer();
        event.preventDefault();
        return;
      }

      if (toolbarSelectionControl) {
        saveTemplateEditorSelectionFromToolbarPointer();
        state.templateEditor.suppressToolbarSelectionChange = true;
        scheduleTemplateEditorSelectionVisualStateRefresh();
      }
    }

    function handlePointerDown(event) {
      const target = isElement(event.target) ? event.target : null;

      if (!target || !getTemplateEditorModal().contains(target)) {
        return;
      }

      const { toolbarSelectionControl, toolbarTrigger } = getTemplateEditorToolbarPointerTarget(target);

      if (toolbarTrigger) {
        saveTemplateEditorSelectionFromToolbarPointer();
        event.preventDefault();
        return;
      }

      if (toolbarSelectionControl) {
        saveTemplateEditorSelectionFromToolbarPointer();
        state.templateEditor.suppressToolbarSelectionChange = true;
        scheduleTemplateEditorSelectionVisualStateRefresh();
        return;
      }

      if (
        event.button !== 0 ||
        state.templateEditor.imageResizeSession ||
        state.templateEditor.imageMoveSession ||
        state.templateEditor.tableObjectMoveSession ||
        state.templateEditor.tableObjectResizeSession ||
        state.templateEditor.tableResizeSession ||
        state.templateEditor.tableSelectionSession
      ) {
        return;
      }

      const selectedImage = getTemplateEditorImageTarget(target);

      if (selectedImage) {
        event.preventDefault();
        clearTemplateEditorTableObjectSelection();
        clearTemplateEditorTableSelection();
        clearTemplateEditorTableHoverState();
        selectTemplateEditorImage(selectedImage);

        if (!selectedImage.closest("td, th")) {
          startTemplateEditorImageMoveSession(selectedImage, event);
        }

        return;
      }

      if (handleTemplateEditorTableObjectPointerDown(event)) {
        return;
      }

      if (handleTemplateEditorTablePointerDown(event)) {
        clearTemplateEditorTableObjectSelection();
        return;
      }

      if (getTemplateEditorSurface()?.contains(target)) {
        clearTemplateEditorImageSelection();
        clearTemplateEditorTableSelection();
        clearTemplateEditorTableHoverState();
        clearTemplateEditorTableObjectSelection();
      }
    }

    function handleChange(event) {
      if (handleTemplatePageSettingChange(event)) {
        return;
      }

      if (event.target?.matches?.(".template-toolbar-cell-padding-input")) {
        handleTemplateTableAction?.("apply-cell-padding", { preserveToolbarFocus: true });
        scheduleTemplateEditorSelectionVisualStateRefresh();
        return;
      }

      if (event.target === toolbarElements.imageInput) {
        insertTemplateImage(event.target.files?.[0]);
        event.target.value = "";
        return;
      }

      if (event.target === toolbarElements.fontFamily) {
        applyTemplateEditorFontFamily(event.target.value);
        scheduleTemplateEditorSelectionVisualStateRefresh();
        return;
      }

      if (event.target === toolbarElements.fontSize) {
        applyTemplateEditorFontSize(event.target.value);
        scheduleTemplateEditorSelectionVisualStateRefresh();
        return;
      }

      if (event.target?.matches?.(".template-toolbar-color")) {
        applyToolbarColorTrigger(event.target);
        toolbar.closeAllEditorToolbarColorPanels();
        scheduleTemplateEditorSelectionVisualStateRefresh();
        return;
      }

      if (event.target?.matches?.("[data-editor-color-hex-input]")) {
        applyToolbarHexColorInput(event.target, { commit: true });
        scheduleTemplateEditorSelectionVisualStateRefresh();
      }
    }

    function handleInput(event) {
      if (event.target?.matches?.(".template-toolbar-border-width")) {
        event.target.dataset.editorBorderUserValue = "true";
      }

      if (event.target?.matches?.(".template-toolbar-cell-padding-input")) {
        handleTemplateTableAction?.("apply-cell-padding", { preserveToolbarFocus: true });
        scheduleTemplateEditorSelectionVisualStateRefresh();
        return;
      }

      if (event.target === toolbarElements.fontSize) {
        toolbar.syncEditorToolbarFontSizeMenuSelection(event.target, event.target.value);
        return;
      }

      if (event.target === getTemplateEditorSurface()) {
        if (isCompositionInputEvent(event)) {
          return;
        }

        syncTemplateEditorContent(
          getTemplateEditorSurface()?.dataset.templateEditorAllowOverflowSync === "true" ? { allowOverflow: true } : undefined,
        );
        return;
      }

      if (event.target?.matches?.(".template-toolbar-color")) {
        applyToolbarColorTrigger(event.target);
        scheduleTemplateEditorSelectionVisualStateRefresh();
        return;
      }

      if (event.target?.matches?.("[data-editor-color-hex-input]")) {
        applyToolbarHexColorInput(event.target);
        scheduleTemplateEditorSelectionVisualStateRefresh();
      }
    }

    function handleBeforeInput(event) {
      const inputType = String(event?.inputType || "");

      if (inputType !== "historyUndo" && inputType !== "historyRedo") {
        return;
      }

      const templateEditorSurface = getTemplateEditorSurface();
      const target = isElement(event.target) ? event.target : null;

      if (!templateEditorSurface || (event.target !== templateEditorSurface && !templateEditorSurface.contains(target))) {
        return;
      }

      event.preventDefault();

      if (state.templateEditor.suppressedNativeHistoryInputType === inputType) {
        delete state.templateEditor.suppressedNativeHistoryInputType;
        return;
      }

      if (inputType === "historyRedo") {
        redoTemplateEditorHistory();
        return;
      }

      undoTemplateEditorHistory();
    }

    function handleCompositionEnd(event) {
      if (event.target !== getTemplateEditorSurface()) {
        return;
      }

      ownerWindow.setTimeout(() => {
        syncTemplateEditorContent(
          getTemplateEditorSurface()?.dataset.templateEditorAllowOverflowSync === "true" ? { allowOverflow: true } : undefined,
        );
      }, 0);
    }

    function handleSelectionChange() {
      const activeElement = isElement(ownerDocument.activeElement) ? ownerDocument.activeElement : null;
      const selection = ownerWindow.getSelection?.();

      const templateEditorSurface = getTemplateEditorSurface();

      if (!selection || selection.rangeCount === 0 || !templateEditorSurface?.contains(selection.anchorNode)) {
        return;
      }

      if (isTemplateEditorToolbarFocusElement(activeElement)) {
        refreshTemplateEditorSelectionVisualState();
        return;
      }

      if (state.templateEditor.suppressToolbarSelectionChange) {
        if (isTemplateEditorSurfaceRootSelection(selection, templateEditorSurface)) {
          refreshTemplateEditorSelectionVisualState();
          return;
        }

        delete state.templateEditor.suppressToolbarSelectionChange;
      }

      saveTemplateEditorSelection();
      updateTemplateEditorActiveCell();
      updateTemplateEditorFormattingControls();
      updateTemplateTableControls();
    }

    function handlePaste(event) {
      if (event.target === getTemplateEditorSurface()) {
        ownerWindow.setTimeout(() => {
          syncTemplateEditorContent();
        }, 0);
      }
    }

    function handleDragStart(event) {
      if (getTemplateEditorImageTarget(event.target)) {
        event.preventDefault();
      }
    }

    function closeToolbarPanelsForExternalClick(event) {
      const target = isElement(event.target) ? event.target : null;

      if (target?.closest(".template-toolbar-table-insert-popover")) {
        return;
      }

      if (target?.closest(".template-toolbar-font-size-combo")) {
        return;
      }

      if (target?.closest(".template-toolbar-font-family-combo")) {
        return;
      }

      if (target?.closest(".template-toolbar-color-picker")) {
        return;
      }

      if (target?.closest(".template-toolbar-icon-select")) {
        return;
      }

      toolbar.closeAllEditorToolbarTableInsertPanels();
      toolbar.closeAllEditorToolbarFontFamilyMenus?.();
      toolbar.closeAllEditorToolbarFontSizeMenus();
      toolbar.closeAllEditorToolbarColorPanels();
      toolbar.closeAllEditorToolbarBorderSelectMenus?.();
    }

    const disposers = [];
    const addListener = (target, type, listener, listenerOptions) => {
      target.addEventListener(type, listener, listenerOptions);
      disposers.push(() => target.removeEventListener(type, listener, listenerOptions));
    };

    function bindEvents() {
      addListener(getTemplateEditorModal(), "click", handleClick);
      addListener(getTemplateEditorModal(), "pointerdown", handleToolbarPointerDownCapture, true);
      addListener(getTemplateEditorModal(), "pointerdown", handlePointerDown);
      addListener(getTemplateEditorModal(), "keydown", handleKeydown, true);
      addListener(getTemplateEditorModal(), "change", handleChange);
      addListener(getTemplateEditorModal(), "beforeinput", handleBeforeInput);
      addListener(getTemplateEditorModal(), "input", handleInput);
      addListener(getTemplateEditorModal(), "compositionend", handleCompositionEnd);
      addListener(getTemplateEditorModal(), "paste", handlePaste);
      addListener(getTemplateEditorModal(), "dragstart", handleDragStart);
      addListener(getTemplateEditorModal(), "pointermove", updateTemplateEditorTableObjectHoverState);
      addListener(getTemplateEditorModal(), "pointermove", (event) => {
        if (getTemplateEditorSurface()?.contains(event.target)) {
          updateTemplateEditorTableHoverState(event);
        }
      });
      addListener(shell.surfaceElement, "pointerleave", () => {
        clearTemplateEditorTableHoverState();
        clearTemplateEditorTableObjectHoverState();
      });
      addListener(shell.surfaceElement, "scroll", () => {
        clearTemplateEditorTableHoverState();
        clearTemplateEditorTableObjectHoverState();
        updateTemplateEditorImageSelectionOverlay();
        updateTemplateEditorTableObjectOverlay();
      });
      addListener(ownerDocument, "selectionchange", handleSelectionChange);
      addListener(ownerDocument, "click", closeToolbarPanelsForExternalClick, true);
      addListener(ownerWindow, "resize", () => {
        updateTemplateEditorImageSelectionOverlay();
        updateTemplateEditorTableObjectOverlay();
      });
    }

    function unbindEvents() {
      disposers.splice(0).forEach((dispose) => dispose());
    }

    return Object.freeze({
      bindEvents,
      unbindEvents,
    });
  }

  return Object.freeze({
    createTemplateEditorEventController,
  });
});
