(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.ExamListEditorToolbarFontSizeUi = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createEditorToolbarFontSizeUiController({
    closeAllEditorToolbarBorderSelectMenus,
    closeAllEditorToolbarColorPanels,
    closeAllEditorToolbarTableInsertPanels,
    isEditorToolbarPresetFontSize,
  }) {
    function getEditorToolbarFontSizeMenuElement(fontSizeElement = null) {
      return fontSizeElement?.closest(".template-toolbar-font-size-combo")?.querySelector(".template-toolbar-combo-menu") || null;
    }

    function syncEditorToolbarFontSizeMenuSelection(fontSizeElement = null, rawFontSize = "") {
      const menuElement = getEditorToolbarFontSizeMenuElement(fontSizeElement);

      if (!menuElement) {
        return;
      }

      const normalizedFontSize = Math.round(Number(rawFontSize));
      const activeValue =
        Number.isFinite(normalizedFontSize) && isEditorToolbarPresetFontSize(normalizedFontSize)
          ? String(normalizedFontSize)
          : "";

      Array.from(menuElement.querySelectorAll("[data-editor-font-size-option]")).forEach((optionButton) => {
        const isActive = optionButton.dataset.editorFontSizeOption === activeValue;

        optionButton.classList.toggle("active", isActive);
        optionButton.setAttribute("aria-selected", isActive ? "true" : "false");
      });
    }

    function syncEditorToolbarFontSizeControls({
      fontSizeElement = null,
      fontSize = "",
      defaultFontSize = 11,
    } = {}) {
      const normalizedFontSize = Math.round(Number(fontSize));
      const resolvedFontSize = Number.isFinite(normalizedFontSize) ? normalizedFontSize : defaultFontSize;

      if (fontSizeElement) {
        fontSizeElement.value = String(resolvedFontSize);
      }

      syncEditorToolbarFontSizeMenuSelection(fontSizeElement, resolvedFontSize);
    }

    function getEditorToolbarFontSizeComboElements(fontSizeInputId = "") {
      const inputElement = document.getElementById(String(fontSizeInputId || "").trim());
      const comboElement = inputElement?.closest(".template-toolbar-font-size-combo") || null;
      const toggleElement = comboElement?.querySelector("[data-editor-font-size-toggle]") || null;
      const menuElement = comboElement?.querySelector(".template-toolbar-combo-menu") || null;

      return { inputElement, comboElement, toggleElement, menuElement };
    }

    function closeAllEditorToolbarFontSizeMenus(exceptFontSizeInputId = "") {
      let closedAnyMenu = false;

      Array.from(document.querySelectorAll(".template-toolbar-font-size-combo")).forEach((comboElement) => {
        const inputElement = comboElement.querySelector(".template-toolbar-font-size-input");
        const toggleElement = comboElement.querySelector("[data-editor-font-size-toggle]");
        const menuElement = comboElement.querySelector(".template-toolbar-combo-menu");
        const shouldKeepOpen =
          exceptFontSizeInputId &&
          inputElement?.id === exceptFontSizeInputId &&
          menuElement &&
          !menuElement.classList.contains("hidden");

        if (!menuElement || shouldKeepOpen || menuElement.classList.contains("hidden")) {
          return;
        }

        menuElement.classList.add("hidden");
        comboElement.classList.remove("open");
        toggleElement?.setAttribute("aria-expanded", "false");
        closedAnyMenu = true;
      });

      return closedAnyMenu;
    }

    function setEditorToolbarFontSizeMenuVisibility(fontSizeInputId = "", nextVisible = false) {
      const { inputElement, comboElement, toggleElement, menuElement } = getEditorToolbarFontSizeComboElements(fontSizeInputId);

      if (!inputElement || !comboElement || !menuElement) {
        return false;
      }

      if (nextVisible) {
        closeAllEditorToolbarFontSizeMenus(fontSizeInputId);
        syncEditorToolbarFontSizeMenuSelection(inputElement, inputElement.value);
        closeAllEditorToolbarTableInsertPanels();
        closeAllEditorToolbarColorPanels();
        closeAllEditorToolbarBorderSelectMenus();
      }

      menuElement.classList.toggle("hidden", !nextVisible);
      comboElement.classList.toggle("open", nextVisible);
      toggleElement?.setAttribute("aria-expanded", nextVisible ? "true" : "false");

      return true;
    }

    return Object.freeze({
      closeAllEditorToolbarFontSizeMenus,
      getEditorToolbarFontSizeComboElements,
      getEditorToolbarFontSizeMenuElement,
      setEditorToolbarFontSizeMenuVisibility,
      syncEditorToolbarFontSizeControls,
      syncEditorToolbarFontSizeMenuSelection,
    });
  }

  return Object.freeze({
    createEditorToolbarFontSizeUiController,
  });
});
