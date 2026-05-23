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

    function handlePointerDown(event) {
      const target = isElement(event.target) ? event.target : null;

      if (!target || !getTemplateEditorModal().contains(target)) {
        return;
      }

      const toolbarTrigger = target.closest(
        "[data-template-command], [data-template-table-action], [data-template-cell-split-step], [data-template-cell-split-toggle], [data-template-cell-split-confirm], [data-template-insert], [data-template-open-image], [data-template-image-insert-toggle], [data-template-insert-school-logo], [data-template-tag], [data-editor-color-preset], [data-editor-color-apply], [data-editor-color-toggle], [data-editor-color-direct], [data-editor-font-size-toggle], [data-editor-font-size-option], [data-editor-border-select-toggle], [data-editor-border-select-option]",
      );
      const toolbarSelectionControl = target.closest(
        `#${toolbarIds.fontFamily}, #${toolbarIds.fontSize}, #${toolbarIds.textColor}, #${toolbarIds.textShading}, #${toolbarIds.cellShading}, #${toolbarIds.borderTarget}, #${toolbarIds.borderStyle}, #${toolbarIds.borderWidth}, #${toolbarIds.borderColor}, #${toolbarIds.cellPaddingTop}, #${toolbarIds.cellPaddingRight}, #${toolbarIds.cellPaddingBottom}, #${toolbarIds.cellPaddingLeft}, #${toolbarIds.tableRows}, #${toolbarIds.tableColumns}, #${toolbarIds.cellSplitPanel}, [data-editor-color-hex-input], [data-template-editor-runtime-page-properties] [data-template-page-setting]`,
      );

      if (toolbarTrigger) {
        saveTemplateEditorSelection();
        return;
      }

      if (toolbarSelectionControl) {
        saveTemplateEditorSelection();
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
        return;
      }

      if (event.target === toolbarElements.imageInput) {
        insertTemplateImage(event.target.files?.[0]);
        event.target.value = "";
        return;
      }

      if (event.target === toolbarElements.fontFamily) {
        applyTemplateEditorFontFamily(event.target.value);
        return;
      }

      if (event.target === toolbarElements.fontSize) {
        applyTemplateEditorFontSize(event.target.value);
        return;
      }

      if (event.target?.matches?.(".template-toolbar-color")) {
        applyToolbarColorTrigger(event.target);
        toolbar.closeAllEditorToolbarColorPanels();
        return;
      }

      if (event.target?.matches?.("[data-editor-color-hex-input]")) {
        applyToolbarHexColorInput(event.target, { commit: true });
      }
    }

    function handleInput(event) {
      if (event.target?.matches?.(".template-toolbar-border-width")) {
        event.target.dataset.editorBorderUserValue = "true";
      }

      if (event.target?.matches?.(".template-toolbar-cell-padding-input")) {
        handleTemplateTableAction?.("apply-cell-padding", { preserveToolbarFocus: true });
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
        return;
      }

      if (event.target?.matches?.("[data-editor-color-hex-input]")) {
        applyToolbarHexColorInput(event.target);
      }
    }

    function handleSelectionChange() {
      const selection = ownerWindow.getSelection?.();

      const templateEditorSurface = getTemplateEditorSurface();

      if (!selection || selection.rangeCount === 0 || !templateEditorSurface?.contains(selection.anchorNode)) {
        return;
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

      if (target?.closest(".template-toolbar-color-picker")) {
        return;
      }

      if (target?.closest(".template-toolbar-icon-select")) {
        return;
      }

      toolbar.closeAllEditorToolbarTableInsertPanels();
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
      addListener(getTemplateEditorModal(), "pointerdown", handlePointerDown);
      addListener(getTemplateEditorModal(), "keydown", handleKeydown);
      addListener(getTemplateEditorModal(), "change", handleChange);
      addListener(getTemplateEditorModal(), "input", handleInput);
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
