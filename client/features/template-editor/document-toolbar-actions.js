export function createDocumentToolbarActions({
  appState,
  applyDocumentCommand,
  getActiveDocumentRange,
  getActiveDocumentTableCell,
  getDocumentSurfaceByPageId,
  rememberDocumentSelection,
  restoreDocumentSelection,
  syncSelectedPageDocumentHtml,
}) {
  function closeDocumentToolbarPanels(exceptions = {}) {
    document.querySelectorAll(".template-toolbar-font-family-combo.open").forEach((comboElement) => {
      if (comboElement.dataset.editorFontFamilyCombo === exceptions.fontFamilyInputId) {
        return;
      }

      comboElement.classList.remove("open");
      comboElement.querySelector("[data-action='toggle-document-font-family-menu']")?.setAttribute("aria-expanded", "false");
      comboElement.querySelector(".template-toolbar-combo-menu")?.classList.add("hidden");
    });

    document.querySelectorAll(".template-toolbar-font-size-combo.open").forEach((comboElement) => {
      if (comboElement.dataset.editorFontSizeCombo === exceptions.fontSizeInputId) {
        return;
      }

      comboElement.classList.remove("open");
      comboElement.querySelector("[data-action='toggle-document-font-size-menu']")?.setAttribute("aria-expanded", "false");
      comboElement.querySelector(".template-toolbar-combo-menu")?.classList.add("hidden");
    });

    document.querySelectorAll(".template-toolbar-table-insert-popover.open").forEach((popoverElement) => {
      const panelElement = popoverElement.querySelector(".template-table-insert-panel");

      if (panelElement?.id === exceptions.panelId) {
        return;
      }

      popoverElement.classList.remove("open");
      popoverElement.querySelector(".template-toolbar-table-insert-toggle")?.setAttribute("aria-expanded", "false");
      panelElement?.classList.add("hidden");
    });

    document.querySelectorAll(".template-toolbar-color-picker.open").forEach((pickerElement) => {
      if (pickerElement.dataset.editorColorPicker === exceptions.colorPickerId) {
        return;
      }

      pickerElement.classList.remove("open");
      pickerElement.querySelector(".template-toolbar-color-trigger")?.setAttribute("aria-expanded", "false");
      pickerElement.querySelector(".template-toolbar-color-panel")?.classList.add("hidden");
    });
  }

  function closeDocumentTableToolbarPanels(tableGroupElement) {
    tableGroupElement?.querySelectorAll?.(".template-toolbar-table-insert-popover.open").forEach((popoverElement) => {
      const panelElement = popoverElement.querySelector(".template-table-insert-panel");

      popoverElement.classList.remove("open");
      popoverElement.querySelector(".template-toolbar-table-insert-toggle")?.setAttribute("aria-expanded", "false");
      panelElement?.classList.add("hidden");
    });

    tableGroupElement?.querySelectorAll?.(".template-toolbar-color-picker.open").forEach((pickerElement) => {
      pickerElement.classList.remove("open");
      pickerElement.querySelector(".template-toolbar-color-trigger")?.setAttribute("aria-expanded", "false");
      pickerElement.querySelector(".template-toolbar-color-panel")?.classList.add("hidden");
    });
  }

  function setDocumentTableToolbarDisabled(isDisabled) {
    const tableGroupElement = document.querySelector("[data-editor-table-toolbar-group]");

    if (!tableGroupElement) {
      return;
    }

    tableGroupElement.classList.toggle("is-disabled", isDisabled);
    tableGroupElement.setAttribute("aria-disabled", isDisabled ? "true" : "false");
    tableGroupElement.querySelectorAll("button, input, select, textarea").forEach((controlElement) => {
      if ("disabled" in controlElement) {
        controlElement.disabled = isDisabled;
      }

      controlElement.setAttribute("aria-disabled", isDisabled ? "true" : "false");
    });

    if (isDisabled) {
      closeDocumentTableToolbarPanels(tableGroupElement);
    }
  }

  function setDocumentFontFamilyMenuVisibility(inputId, isOpen) {
    const comboElement = document.querySelector(`[data-editor-font-family-combo="${inputId}"]`);
    const menuElement = comboElement?.querySelector(".template-toolbar-combo-menu");
    const toggleButton = comboElement?.querySelector("[data-action='toggle-document-font-family-menu']");
    const inputElement = document.getElementById(inputId);

    if (!comboElement || !menuElement || !toggleButton || !inputElement) {
      return;
    }

    closeDocumentToolbarPanels(isOpen ? { fontFamilyInputId: inputId } : {});
    syncDocumentFontFamilyComboSelection(inputId, inputElement.value);
    comboElement.classList.toggle("open", isOpen);
    menuElement.classList.toggle("hidden", !isOpen);
    toggleButton.setAttribute("aria-expanded", isOpen ? "true" : "false");

    if (isOpen) {
      scrollActiveToolbarComboOptionIntoView(menuElement);
    }
  }

  function setDocumentFontSizeMenuVisibility(inputId, isOpen) {
    const comboElement = document.querySelector(`[data-editor-font-size-combo="${inputId}"]`);
    const menuElement = comboElement?.querySelector(".template-toolbar-combo-menu");
    const toggleButton = comboElement?.querySelector("[data-action='toggle-document-font-size-menu']");

    if (!comboElement || !menuElement || !toggleButton) {
      return;
    }

    closeDocumentToolbarPanels(isOpen ? { fontSizeInputId: inputId } : {});
    comboElement.classList.toggle("open", isOpen);
    menuElement.classList.toggle("hidden", !isOpen);
    toggleButton.setAttribute("aria-expanded", isOpen ? "true" : "false");

    if (isOpen) {
      scrollActiveToolbarComboOptionIntoView(menuElement);
    }
  }

  function scrollActiveToolbarComboOptionIntoView(menuElement) {
    const activeOption = menuElement?.querySelector?.(".template-toolbar-combo-option.active") || null;
    const menuHeight = menuElement?.clientHeight || 0;
    const optionHeight = activeOption?.offsetHeight || 0;

    if (!menuElement || !activeOption || !menuHeight || !optionHeight) {
      return false;
    }

    const targetScrollTop = activeOption.offsetTop - (menuHeight - optionHeight) / 2;
    const maxScrollTop = Math.max(0, menuElement.scrollHeight - menuHeight);

    menuElement.scrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
    return true;
  }

  function setDocumentPopoverVisibility(panelId, isOpen) {
    const panelElement = document.getElementById(panelId);
    const popoverElement = panelElement?.closest(".template-toolbar-table-insert-popover");
    const toggleButton = popoverElement?.querySelector(".template-toolbar-table-insert-toggle");

    if (!panelElement || !popoverElement || !toggleButton) {
      return;
    }

    closeDocumentToolbarPanels(isOpen ? { panelId } : {});
    popoverElement.classList.toggle("open", isOpen);
    panelElement.classList.toggle("hidden", !isOpen);
    toggleButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  function setDocumentColorPanelVisibility(pickerId, panelId, isOpen) {
    const pickerElement = document.querySelector(`[data-editor-color-picker="${pickerId}"]`);
    const panelElement = document.getElementById(panelId);
    const toggleButton = pickerElement?.querySelector(".template-toolbar-color-trigger");

    if (!pickerElement || !panelElement || !toggleButton) {
      return;
    }

    closeDocumentToolbarPanels(isOpen ? { colorPickerId: pickerId } : {});
    pickerElement.classList.toggle("open", isOpen);
    panelElement.classList.toggle("hidden", !isOpen);
    toggleButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  function setDocumentColorValue(inputId, value) {
    const inputElement = document.getElementById(inputId);
    const pickerElement = document.querySelector(`[data-editor-color-picker="${inputId}"]`);
    const normalizedRawValue = String(value || "").trim().toLowerCase().replace(/\s+/g, "");
    const isNoColor = normalizedRawValue === "transparent" || normalizedRawValue === "none" || normalizedRawValue === "rgba(0,0,0,0)";
    const normalizedValue = isNoColor ? "transparent" : String(value || "#000000").trim().toLowerCase();

    if (inputElement) {
      if (isNoColor) {
        inputElement.dataset.editorColorNone = "true";
      } else {
        delete inputElement.dataset.editorColorNone;
        inputElement.value = normalizedValue;
      }
    }

    if (pickerElement) {
      pickerElement.style.setProperty("--editor-toolbar-current-color", normalizedValue);
      pickerElement.classList.toggle("is-no-color", isNoColor);
      pickerElement.querySelectorAll(".template-toolbar-color-swatch").forEach((swatchElement) => {
        const isNoColorPreset = swatchElement.dataset.colorNone === "true";
        const isActive = isNoColor
          ? isNoColorPreset
          : String(swatchElement.dataset.colorPreset || "").trim().toLowerCase() === normalizedValue;

        swatchElement.classList.toggle("active", isActive);
        swatchElement.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    }
  }

  const documentCssPixelsPerPoint = 96 / 72;

  function normalizeDocumentFontSizeValue(value, fallback = 11) {
    const parsedValue = Math.round(Number(value));

    if (!Number.isFinite(parsedValue)) {
      return fallback;
    }

    return Math.min(Math.max(parsedValue, 1), 72);
  }

  function getDocumentPointFontSize(computedFontSize = "", fallbackValue = 11) {
    const parsedValue = Number.parseFloat(computedFontSize);

    if (!Number.isFinite(parsedValue)) {
      return fallbackValue;
    }

    return Math.round(parsedValue / documentCssPixelsPerPoint);
  }

  function syncDocumentFontSizeMenuSelection(inputId, value) {
    const normalizedValue = normalizeDocumentFontSizeValue(value);
    const inputElement = document.getElementById(inputId);

    if (inputElement) {
      inputElement.value = String(normalizedValue);
      inputElement
        .closest?.(".template-toolbar-font-size-combo")
        ?.querySelector?.("[data-editor-font-size-current]")
        ?.replaceChildren?.(String(normalizedValue));
    }

    document
      .querySelectorAll(`[data-editor-font-size-menu-for="${inputId}"] .template-toolbar-combo-option`)
      .forEach((optionElement) => {
        const isActive = String(optionElement.dataset.fontSizeOption || "") === String(normalizedValue);

        optionElement.classList.toggle("active", isActive);
        optionElement.setAttribute("aria-selected", isActive ? "true" : "false");
      });
  }

  function syncDocumentFontFamilyComboSelection(inputId, value) {
    const inputElement = document.getElementById(inputId);
    const normalizedValue = String(value || "").trim();
    const optionElements = Array.from(
      document.querySelectorAll(`[data-editor-font-family-menu-for="${inputId}"] .template-toolbar-combo-option`),
    );
    const activeOption =
      optionElements.find((optionElement) => optionElement.dataset.fontFamilyOption === normalizedValue) ||
      (!normalizedValue ? optionElements[0] : null) ||
      null;
    const nextValue = activeOption?.dataset.fontFamilyOption || normalizedValue;
    const nextLabel = activeOption?.dataset.fontFamilyLabel || activeOption?.textContent?.trim() || nextValue;

    if (inputElement) {
      inputElement.value = nextValue;
      inputElement
        .closest?.(".template-toolbar-font-family-combo")
        ?.querySelector?.("[data-editor-font-family-current]")
        ?.replaceChildren?.(nextLabel);
    }

    optionElements.forEach((optionElement) => {
      const isActive = optionElement === activeOption;

      optionElement.classList.toggle("active", isActive);
      optionElement.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  function applyDocumentFontFamily(fontFamily) {
    const normalizedFontFamily = String(fontFamily || "").trim() || "'Noto Sans KR', sans-serif";

    syncDocumentFontFamilyComboSelection("templateEditorFontFamily", normalizedFontFamily);
    applyDocumentCommand("fontName", normalizedFontFamily);
  }

  function applyDocumentFontSize(fontSizeValue) {
    const surface = restoreDocumentSelection();

    if (!surface || typeof document.execCommand !== "function") {
      return;
    }

    const normalizedFontSize = normalizeDocumentFontSizeValue(fontSizeValue);

    document.execCommand("fontSize", false, "7");
    surface.querySelectorAll("font[size='7']").forEach((fontElement) => {
      fontElement.removeAttribute("size");
      fontElement.style.fontSize = `${normalizedFontSize}pt`;
    });
    syncDocumentFontSizeMenuSelection("templateEditorFontSize", normalizedFontSize);
    rememberDocumentSelection();
    syncSelectedPageDocumentHtml({ render: false });
  }

  function applyDocumentColor(colorValue, options = {}) {
    const normalizedColorValue = String(colorValue || "").trim();

    if (!normalizedColorValue) {
      return;
    }

    const activeCell = getActiveDocumentTableCell();

    if (options.tableAction === "apply-cell-shading" && activeCell) {
      activeCell.style.backgroundColor = normalizedColorValue;
      syncSelectedPageDocumentHtml({ render: false });
      return;
    }

    applyDocumentCommand(options.command || "foreColor", normalizedColorValue);
  }

  function normalizeDocumentToolbarColorValue(value, fallback = "#152033") {
    const normalizedValue = String(value || "").trim().toLowerCase();

    if (!normalizedValue || normalizedValue === "transparent" || normalizedValue === "rgba(0, 0, 0, 0)") {
      return fallback;
    }

    if (/^#[0-9a-f]{6}$/i.test(normalizedValue)) {
      return normalizedValue;
    }

    if (/^#[0-9a-f]{3}$/i.test(normalizedValue)) {
      return `#${normalizedValue
        .slice(1)
        .split("")
        .map((character) => `${character}${character}`)
        .join("")}`;
    }

    const rgbMatch = normalizedValue.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);

    if (!rgbMatch) {
      return fallback;
    }

    return `#${rgbMatch
      .slice(1, 4)
      .map((channel) => Number(channel).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  function getDocumentSelectionContextElement(pageId = appState.templateEditor.selectedPageId) {
    const surface = getDocumentSurfaceByPageId(pageId);
    const range = getActiveDocumentRange(surface);

    if (!surface || !range) {
      return null;
    }

    const element =
      range.commonAncestorContainer?.nodeType === Node.ELEMENT_NODE
        ? range.commonAncestorContainer
        : range.commonAncestorContainer?.parentElement || null;

    return element && surface.contains(element) ? element : null;
  }

  function getDocumentToolbarBackgroundControlValue(element, fallbackValue) {
    const inlineBackgroundColor = String(element?.style?.backgroundColor || "").trim().toLowerCase().replace(/\s+/g, "");

    if (inlineBackgroundColor === "transparent" || inlineBackgroundColor === "rgba(0,0,0,0)") {
      return "transparent";
    }

    return normalizeDocumentToolbarColorValue(
      element ? window.getComputedStyle(element).backgroundColor : "",
      fallbackValue,
    );
  }

  function syncDocumentFontFamilySelection(fontFamilyValue) {
    const optionElements = Array.from(
      document.querySelectorAll('[data-editor-font-family-menu-for="templateEditorFontFamily"] .template-toolbar-combo-option'),
    );

    if (!optionElements.length) {
      return;
    }

    const normalizedComputedValue = String(fontFamilyValue || "").replace(/["']/g, "").toLowerCase();
    const matchingOption = optionElements.find((optionElement) => {
      const optionPrimaryFont = String(optionElement.dataset.fontFamilyOption || "")
        .split(",")[0]
        .replace(/["']/g, "")
        .trim()
        .toLowerCase();

      return optionPrimaryFont && normalizedComputedValue.includes(optionPrimaryFont);
    });

    if (matchingOption) {
      syncDocumentFontFamilyComboSelection("templateEditorFontFamily", matchingOption.dataset.fontFamilyOption || "");
    }
  }

  function syncDocumentCommandButtonState(command, isActive) {
    document
      .querySelectorAll(`[data-action="apply-document-command"][data-command="${command}"]`)
      .forEach((buttonElement) => {
        buttonElement.classList.toggle("is-active", isActive);
        buttonElement.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
  }

  function syncDocumentTableAlignButtons(activeValue) {
    document
      .querySelectorAll('[data-action="apply-document-table-action"][data-table-action^="cell-vertical-align-"]')
      .forEach((buttonElement) => {
        const buttonValue = String(buttonElement.dataset.tableAction || "").replace("cell-vertical-align-", "");
        const isActive = Boolean(activeValue) && buttonValue === activeValue;

        buttonElement.classList.toggle("is-active", isActive);
        buttonElement.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
  }

  function updateDocumentFormattingControls(pageId = appState.templateEditor.selectedPageId) {
    const surface = getDocumentSurfaceByPageId(pageId);
    const contextElement = getDocumentSelectionContextElement(pageId);
    const activeElement = document.activeElement;
    const fontSizeElement = document.getElementById("templateEditorFontSize");
    const activeCell = getActiveDocumentTableCell();

    setDocumentTableToolbarDisabled(!(activeCell && surface?.contains(activeCell)));

    if (
      !surface ||
      !contextElement ||
      activeElement?.id === "templateEditorFontFamily" ||
      activeElement?.id === "templateEditorFontSize" ||
      activeElement?.id === "templateEditorTextColor" ||
      activeElement?.id === "templateEditorTextShading" ||
      activeElement?.id === "templateEditorCellShading"
    ) {
      return;
    }

    const computedStyle = window.getComputedStyle(contextElement);
    const verticalAlignValue = activeCell
      ? String(activeCell.style.verticalAlign || window.getComputedStyle(activeCell).verticalAlign || "").trim().toLowerCase()
      : "";

    syncDocumentFontFamilySelection(computedStyle.fontFamily || "");

    if (fontSizeElement && activeElement !== fontSizeElement) {
      syncDocumentFontSizeMenuSelection(
        "templateEditorFontSize",
        getDocumentPointFontSize(computedStyle.fontSize, 11),
      );
    }

    setDocumentColorValue("templateEditorTextColor", normalizeDocumentToolbarColorValue(computedStyle.color, "#152033"));
    setDocumentColorValue(
      "templateEditorTextShading",
      getDocumentToolbarBackgroundControlValue(contextElement, "#fff59d"),
    );
    setDocumentColorValue(
      "templateEditorCellShading",
      getDocumentToolbarBackgroundControlValue(activeCell, "#ffffff"),
    );

    ["bold", "italic", "underline", "insertUnorderedList", "justifyLeft", "justifyCenter", "justifyRight", "justifyFull"].forEach(
      (command) => {
        const isActive = typeof document.queryCommandState === "function" ? Boolean(document.queryCommandState(command)) : false;

        syncDocumentCommandButtonState(command, isActive);
      },
    );

    syncDocumentTableAlignButtons(
      verticalAlignValue === "bottom" ? "bottom" : verticalAlignValue === "middle" ? "middle" : verticalAlignValue ? "top" : "",
    );
  }

  return {
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
  };
}
