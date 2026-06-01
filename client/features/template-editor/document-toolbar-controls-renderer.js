import { escapeHtml } from "../../app/html-utils.js";
import {
  documentToolbarFontFamilyOptions,
  documentToolbarFontSizeOptions,
  documentToolbarIconMarkup,
} from "./document-toolbar-config.js";

export function renderDocumentToolbarIconButton({
  action = "",
  label = "",
  title = label,
  iconMarkup = "",
  extraClassName = "",
  extraAttributes = "",
}) {
  const className = ["template-tool-button", "icon-only", extraClassName].filter(Boolean).join(" ");

  return `
    <button class="${className}" data-action="${escapeHtml(action)}" type="button" aria-label="${escapeHtml(label)}" title="${escapeHtml(title)}"${extraAttributes}>
      ${iconMarkup}
      <span class="sr-only">${escapeHtml(label)}</span>
    </button>
  `;
}


export function renderDocumentToolbarTextButton({
  action = "",
  label = "",
  title = label,
  textContent = "",
  extraAttributes = "",
}) {
  return `
    <button class="template-tool-button type-emphasis icon-only" data-action="${escapeHtml(action)}" type="button" aria-label="${escapeHtml(label)}" title="${escapeHtml(title)}"${extraAttributes}>
      <span aria-hidden="true">${escapeHtml(textContent)}</span>
      <span class="sr-only">${escapeHtml(label)}</span>
    </button>
  `;
}

export function renderDocumentToolbarFontSizeOptionButtons(selectedValue = 11) {
  const normalizedSelectedValue = Math.round(Number(selectedValue));

  return documentToolbarFontSizeOptions
    .map((fontSize) => {
      const isActive = fontSize === normalizedSelectedValue;

      return `
        <button
          class="template-toolbar-combo-option${isActive ? " active" : ""}"
          data-action="set-document-font-size-option"
          data-font-size-option="${escapeHtml(String(fontSize))}"
          type="button"
          role="option"
          aria-selected="${isActive ? "true" : "false"}"
        >
          ${escapeHtml(String(fontSize))}pt
        </button>
      `;
    })
    .join("");
}

export function getDocumentToolbarFontFamilyLabel(value = "") {
  const normalizedValue = String(value || "").trim();
  const matchingOption = documentToolbarFontFamilyOptions.find((option) => option.value === normalizedValue);

  return matchingOption?.label || documentToolbarFontFamilyOptions[0]?.label || "";
}

export function renderDocumentToolbarFontFamilyOptionButtons(selectedValue = "") {
  const normalizedSelectedValue = String(selectedValue || "").trim();

  return documentToolbarFontFamilyOptions
    .map((option) => {
      const isActive = option.value === normalizedSelectedValue;

      return `
        <button
          class="template-toolbar-combo-option${isActive ? " active" : ""}"
          data-action="set-document-font-family-option"
          data-font-family-option="${escapeHtml(option.value)}"
          data-font-family-label="${escapeHtml(option.label)}"
          type="button"
          role="option"
          aria-selected="${isActive ? "true" : "false"}"
        >
          ${escapeHtml(option.label)}
        </button>
      `;
    })
    .join("");
}

export function renderDocumentToolbarColorPresetButtons({
  inputId = "",
  inputValue = "#ffffff",
  presetColors = [],
  colorCommand = "",
  colorTableAction = "",
}) {
  const normalizeNoColorValue = (value = "") => String(value || "").trim().toLowerCase().replace(/\s+/g, "");
  const inputNoColor = ["transparent", "none", "rgba(0,0,0,0)"].includes(normalizeNoColorValue(inputValue));
  const normalizedInputValue = inputNoColor ? "transparent" : String(inputValue || "#ffffff").trim().toLowerCase();

  return presetColors
    .map((preset) => {
      const presetNoColor = Boolean(preset.noColor) || ["transparent", "none", "rgba(0,0,0,0)"].includes(normalizeNoColorValue(preset.value));
      const normalizedPresetValue = presetNoColor ? "transparent" : String(preset.value || "#ffffff").trim().toLowerCase();
      const isActive = presetNoColor ? inputNoColor : normalizedPresetValue === normalizedInputValue;
      const swatchClassName = `template-toolbar-color-swatch${presetNoColor ? " is-no-color" : ""}${isActive ? " active" : ""}`;

      return `
        <button
          class="${swatchClassName}"
          data-action="apply-document-color-preset"
          data-color-input="${escapeHtml(inputId)}"
          data-color-preset="${escapeHtml(normalizedPresetValue)}"
          ${presetNoColor ? 'data-color-none="true"' : ""}
          ${colorCommand ? `data-color-command="${escapeHtml(colorCommand)}"` : ""}
          ${colorTableAction ? `data-color-table-action="${escapeHtml(colorTableAction)}"` : ""}
          type="button"
          aria-label="${escapeHtml(preset.label)}"
          aria-pressed="${isActive ? "true" : "false"}"
          title="${escapeHtml(preset.label)}"
          style="--editor-toolbar-swatch-color: ${escapeHtml(presetNoColor ? "#ffffff" : normalizedPresetValue)};"
        >
          <span class="sr-only">${escapeHtml(preset.label)}</span>
        </button>
      `;
    })
    .join("");
}

export function renderDocumentToolbarColorPickerSection({
  sectionLabel = "색상",
  inputId = "",
  inputValue = "#ffffff",
  presetColors = [],
  colorCommand = "",
  colorTableAction = "",
  fallbackValue = "#ffffff",
  sectionClassName = "",
  pickerClassName = "",
  triggerLabel = "선택",
}) {
  const panelId = `${inputId}Panel`;
  const normalizedRawInputValue = String(inputValue || "").trim().toLowerCase().replace(/\s+/g, "");
  const inputNoColor = ["transparent", "none", "rgba(0,0,0,0)"].includes(normalizedRawInputValue);
  const normalizedInputValue = inputNoColor ? "transparent" : String(inputValue || fallbackValue).trim().toLowerCase();
  const colorInputValue = inputNoColor ? String(fallbackValue || "#ffffff").trim().toLowerCase() : normalizedInputValue;
  const sectionClassNames = ["template-toolbar-section", sectionClassName].filter(Boolean).join(" ");
  const pickerClassNames = ["template-toolbar-color-picker", inputNoColor ? "is-no-color" : "", pickerClassName].filter(Boolean).join(" ");

  return `
    <div class="${sectionClassNames}">
      <span class="template-toolbar-section-label">${escapeHtml(sectionLabel)}</span>
      <div class="template-toolbar-group-controls">
        <div
          class="${pickerClassNames}"
          data-editor-color-picker="${escapeHtml(inputId)}"
          style="--editor-toolbar-current-color: ${escapeHtml(normalizedInputValue)};"
        >
          <button
            class="template-toolbar-color-trigger"
            data-action="toggle-document-color-panel"
            data-color-panel-id="${escapeHtml(panelId)}"
            data-color-picker-id="${escapeHtml(inputId)}"
            type="button"
            aria-expanded="false"
            aria-controls="${escapeHtml(panelId)}"
          >
            <span class="template-toolbar-color-trigger-swatch" aria-hidden="true"></span>
            <span class="template-toolbar-color-trigger-label">${escapeHtml(triggerLabel)}</span>
            <span class="template-toolbar-color-trigger-caret" aria-hidden="true"></span>
          </button>
          <div class="template-toolbar-color-panel hidden" id="${escapeHtml(panelId)}">
            <div class="template-toolbar-color-presets" role="group" aria-label="${escapeHtml(`${sectionLabel} 프리셋`)}">
              ${renderDocumentToolbarColorPresetButtons({
                inputId,
                inputValue: normalizedInputValue,
                presetColors,
                colorCommand,
                colorTableAction,
              })}
            </div>
            <div class="template-toolbar-color-panel-actions">
              <button
                class="template-toolbar-color-direct-button"
                data-action="open-document-color-picker"
                data-color-input="${escapeHtml(inputId)}"
                ${colorCommand ? `data-color-command="${escapeHtml(colorCommand)}"` : ""}
                ${colorTableAction ? `data-color-table-action="${escapeHtml(colorTableAction)}"` : ""}
                type="button"
              >
                <span class="template-toolbar-color-direct-swatch" aria-hidden="true"></span>
                <span>직접 선택</span>
              </button>
            </div>
            <input
              class="template-toolbar-color template-toolbar-color-input-hidden"
              id="${escapeHtml(inputId)}"
              ${colorCommand ? `data-color-command="${escapeHtml(colorCommand)}"` : ""}
              ${colorTableAction ? `data-color-table-action="${escapeHtml(colorTableAction)}"` : ""}
              type="color"
              value="${escapeHtml(colorInputValue)}"
              tabindex="-1"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderDocumentToolbarTableInsertPopover() {
  return `
    <div class="template-toolbar-table-insert-popover" data-editor-table-insert-popover="templateEditorTableInsertPanel">
      <button
        class="template-tool-button icon-only template-toolbar-table-insert-toggle"
        data-action="toggle-document-table-insert-panel"
        type="button"
        aria-label="표 삽입"
        title="표 삽입"
        aria-expanded="false"
        aria-controls="templateEditorTableInsertPanel"
      >
        ${documentToolbarIconMarkup.insertTable}
        <span class="sr-only">표 삽입</span>
      </button>
      <div class="template-table-insert-panel hidden" id="templateEditorTableInsertPanel" role="group" aria-label="표 삽입 설정">
        <label class="template-toolbar-subfield" for="templateEditorTableRows">
          <span>행</span>
          <input class="template-toolbar-number" id="templateEditorTableRows" type="number" min="1" max="20" step="1" value="3" />
        </label>
        <label class="template-toolbar-subfield" for="templateEditorTableColumns">
          <span>열</span>
          <input class="template-toolbar-number" id="templateEditorTableColumns" type="number" min="1" max="8" step="1" value="2" />
        </label>
        <button class="template-tool-button" data-action="confirm-document-table-insert" type="button">표 추가</button>
      </div>
    </div>
  `;
}

export function renderDocumentToolbarCellSplitPopover() {
  return `
    <div class="template-toolbar-table-insert-popover template-toolbar-cell-split-popover" data-editor-table-insert-popover="templateEditorCellSplitPanel">
      <button
        class="template-tool-button icon-only template-toolbar-table-insert-toggle template-toolbar-cell-split-toggle"
        data-action="toggle-document-cell-split-panel"
        data-template-cell-split-toggle="templateEditorCellSplitPanel"
        type="button"
        aria-label="셀 분할"
        title="셀 분할"
        aria-expanded="false"
        aria-controls="templateEditorCellSplitPanel"
      >
        ${documentToolbarIconMarkup.splitCell}
        <span class="sr-only">셀 분할</span>
      </button>
      <div class="template-table-insert-panel template-toolbar-cell-split-panel hidden" id="templateEditorCellSplitPanel" role="group" aria-label="셀 분할 설정">
        <fieldset class="template-toolbar-subfield template-toolbar-subfield-wide template-toolbar-choice-field">
          <legend>편집</legend>
          <div class="template-toolbar-choice-group" role="radiogroup" aria-label="셀 분할 방향">
            <label
              class="template-toolbar-choice-option"
              for="templateEditorCellSplitAxisRow"
              data-action="set-document-cell-split-axis"
              data-cell-split-axis="row"
              data-template-cell-split-axis-option="row"
            >
              <input class="sr-only" id="templateEditorCellSplitAxisRow" name="templateEditorCellSplitAxis" type="radio" value="row" />
              <span>행</span>
            </label>
            <label
              class="template-toolbar-choice-option"
              for="templateEditorCellSplitAxisColumn"
              data-action="set-document-cell-split-axis"
              data-cell-split-axis="column"
              data-template-cell-split-axis-option="column"
            >
              <input class="sr-only" id="templateEditorCellSplitAxisColumn" name="templateEditorCellSplitAxis" type="radio" value="column" checked />
              <span>열</span>
            </label>
          </div>
        </fieldset>
        <label class="template-toolbar-subfield template-toolbar-subfield-wide" for="templateEditorCellSplitCount">
          <span>칸</span>
          <span class="template-toolbar-number-stepper">
            <input class="template-toolbar-number template-toolbar-number-stepper-input" id="templateEditorCellSplitCount" type="number" min="2" step="1" value="2" />
            <span class="template-toolbar-number-stepper-controls">
              <button class="template-toolbar-number-stepper-button" data-action="step-document-cell-split-count" data-direction="up" type="button" aria-label="분할 칸 수 증가" title="증가">
                <span aria-hidden="true">▲</span>
              </button>
              <button class="template-toolbar-number-stepper-button" data-action="step-document-cell-split-count" data-direction="down" type="button" aria-label="분할 칸 수 감소" title="감소">
                <span aria-hidden="true">▼</span>
              </button>
            </span>
          </span>
        </label>
        <button class="template-tool-button" data-action="confirm-document-cell-split" type="button">셀 분할</button>
      </div>
    </div>
  `;
}

export function renderFontFamilyOptions(selectedValue = "") {
  return documentToolbarFontFamilyOptions
    .map(
      (option) => `
        <option value="${escapeHtml(option.value)}" ${selectedValue === option.value ? "selected" : ""}>
          ${escapeHtml(option.label)}
        </option>
      `,
    )
    .join("");
}
