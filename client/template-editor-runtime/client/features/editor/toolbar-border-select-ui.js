(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.ExamListEditorToolbarBorderSelectUi = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createEditorToolbarBorderSelectUiController({
    closeAllEditorToolbarColorPanels,
    closeAllEditorToolbarFontSizeMenus,
    closeAllEditorToolbarTableInsertPanels,
    updateEditorToolbarFloatingPanelPlacement,
  }) {
    function getEditorToolbarBorderSelectElements(inputId = "") {
      const normalizedInputId = String(inputId || "").trim();
      const selectElement = normalizedInputId ? document.getElementById(normalizedInputId) : null;
      const selectWrapper =
        selectElement?.closest(".template-toolbar-icon-select") ||
        (normalizedInputId ? document.querySelector(`.template-toolbar-icon-select[data-editor-border-select="${normalizedInputId}"]`) : null);
      const toggleElement = selectWrapper?.querySelector("[data-editor-border-select-toggle]") || null;
      const menuElement = selectWrapper?.querySelector(".template-toolbar-icon-select-menu") || null;

      return { menuElement, selectElement, selectWrapper, toggleElement };
    }

    function syncEditorToolbarBorderSelectControl(selectInput = null, value = "") {
      const selectElement =
        selectInput instanceof HTMLSelectElement
          ? selectInput
          : typeof selectInput === "string" && selectInput
            ? document.getElementById(selectInput)
            : null;

      if (!selectElement) {
        return "";
      }

      const { menuElement, selectWrapper } = getEditorToolbarBorderSelectElements(selectElement.id);
      const optionButtons = Array.from(menuElement?.querySelectorAll("[data-editor-border-select-option]") || []);
      const nextValue = String(value || selectElement.value || "").trim();

      if (nextValue) {
        selectElement.value = nextValue;
      }

      const activeButton =
        optionButtons.find((buttonElement) => buttonElement.dataset.editorBorderSelectOption === selectElement.value) ||
        optionButtons[0] ||
        null;

      if (!activeButton) {
        return selectElement.value;
      }

      selectElement.value = activeButton.dataset.editorBorderSelectOption || selectElement.value;

      const selectedLabelElement = selectWrapper?.querySelector("[data-editor-border-select-label]");
      const selectedIconElement = selectWrapper?.querySelector("[data-editor-border-select-current-icon]");
      const optionLabelElement = activeButton.querySelector(".template-toolbar-icon-select-option-label");
      const optionIconElement = activeButton.querySelector("[data-editor-border-select-option-icon]");

      if (selectedLabelElement) {
        selectedLabelElement.textContent = optionLabelElement?.textContent?.trim() || activeButton.textContent.trim();
      }

      if (selectedIconElement) {
        selectedIconElement.innerHTML = optionIconElement?.innerHTML || "";
      }

      optionButtons.forEach((buttonElement) => {
        const isActive = buttonElement === activeButton;

        buttonElement.classList.toggle("active", isActive);
        buttonElement.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      return selectElement.value;
    }

    function closeAllEditorToolbarBorderSelectMenus(exceptInputId = "") {
      let closedAnyMenu = false;

      Array.from(document.querySelectorAll(".template-toolbar-icon-select")).forEach((selectWrapper) => {
        const selectElement = selectWrapper.querySelector(".template-toolbar-border-native-select");
        const toggleElement = selectWrapper.querySelector("[data-editor-border-select-toggle]");
        const menuElement = selectWrapper.querySelector(".template-toolbar-icon-select-menu");
        const shouldKeepOpen =
          exceptInputId &&
          selectElement?.id === exceptInputId &&
          menuElement &&
          !menuElement.classList.contains("hidden");

        if (!menuElement || shouldKeepOpen || menuElement.classList.contains("hidden")) {
          return;
        }

        menuElement.classList.add("hidden");
        selectWrapper.classList.remove("open", "open-up", "open-down");
        toggleElement?.setAttribute("aria-expanded", "false");
        closedAnyMenu = true;
      });

      return closedAnyMenu;
    }

    function setEditorToolbarBorderSelectMenuVisibility(inputId = "", nextVisible = false) {
      const { menuElement, selectElement, selectWrapper, toggleElement } = getEditorToolbarBorderSelectElements(inputId);

      if (!selectElement || !menuElement || !selectWrapper) {
        return false;
      }

      if (nextVisible) {
        closeAllEditorToolbarBorderSelectMenus(inputId);
        closeAllEditorToolbarTableInsertPanels();
        closeAllEditorToolbarFontSizeMenus();
        closeAllEditorToolbarColorPanels();
        syncEditorToolbarBorderSelectControl(selectElement);
      }

      menuElement.classList.toggle("hidden", !nextVisible);
      selectWrapper.classList.toggle("open", nextVisible);
      toggleElement?.setAttribute("aria-expanded", nextVisible ? "true" : "false");

      if (nextVisible) {
        updateEditorToolbarFloatingPanelPlacement(selectWrapper, menuElement, 6);
      } else {
        selectWrapper.classList.remove("open-up", "open-down");
      }

      return true;
    }

    function applyEditorToolbarBorderSelectOption(inputId = "", value = "") {
      const { selectElement } = getEditorToolbarBorderSelectElements(inputId);

      if (!selectElement) {
        return false;
      }

      syncEditorToolbarBorderSelectControl(selectElement, value);
      selectElement.dataset.editorBorderUserValue = "true";
      selectElement.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    return Object.freeze({
      applyEditorToolbarBorderSelectOption,
      closeAllEditorToolbarBorderSelectMenus,
      getEditorToolbarBorderSelectElements,
      setEditorToolbarBorderSelectMenuVisibility,
      syncEditorToolbarBorderSelectControl,
    });
  }

  return Object.freeze({
    createEditorToolbarBorderSelectUiController,
  });
});
