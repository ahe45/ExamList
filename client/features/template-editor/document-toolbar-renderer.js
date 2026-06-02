import { canUseAccess, hasAccess } from "../../app/access.js";
import {
  documentToolbarIconMarkup,
  documentToolbarShadingColorPresets,
  documentToolbarTextColorPresets,
} from "./document-toolbar-config.js";
import {
  getDocumentToolbarFontFamilyLabel,
  renderDocumentToolbarCellSplitPopover,
  renderDocumentToolbarColorPickerSection,
  renderDocumentToolbarFontFamilyOptionButtons,
  renderDocumentToolbarFontSizeOptionButtons,
  renderDocumentToolbarIconButton,
  renderDocumentToolbarTableInsertPopover,
  renderDocumentToolbarTextButton,
} from "./document-toolbar-controls-renderer.js";

export { renderDocumentToolbarIconButton } from "./document-toolbar-controls-renderer.js";

export function renderDocumentToolbar(access) {
  const hasTemplateManagement = hasAccess(access, "manageTemplates");
  const canManageTemplates = canUseAccess(access, "manageTemplates");

  if (!hasTemplateManagement) {
    return `
      <div class="template-toolbar-group editor-panel-block">
        <span class="template-toolbar-group-label">편집</span>
        <p class="helper-text">현재 권한은 읽기 전용입니다.</p>
      </div>
    `;
  }

  const toolbarMarkup = `
    <div class="template-toolbar-group editor-panel-block">
      <span class="template-toolbar-group-label">서식</span>
      <div class="template-toolbar-section-row template-toolbar-section-row-dual">
        <div class="template-toolbar-section template-toolbar-section-compact">
          <span class="template-toolbar-section-label">글꼴</span>
          <div class="template-toolbar-group-controls">
            <div class="template-toolbar-font-family-combo" data-editor-font-family-combo="templateEditorFontFamily">
              <input class="template-toolbar-font-family-input" id="templateEditorFontFamily" type="hidden" value="'Noto Sans KR', sans-serif" aria-hidden="true" tabindex="-1" data-editor-document-command-select="fontName" />
              <button class="template-toolbar-combo-value template-toolbar-font-family-value" data-action="toggle-document-font-family-menu" data-font-family-input="templateEditorFontFamily" type="button" aria-label="글꼴 목록 열기" aria-expanded="false" aria-controls="templateEditorFontFamilyMenu">
                <span data-editor-font-family-current>${getDocumentToolbarFontFamilyLabel("'Noto Sans KR', sans-serif")}</span>
                <span class="template-toolbar-combo-caret" aria-hidden="true"></span>
              </button>
              <div class="template-toolbar-combo-menu hidden" id="templateEditorFontFamilyMenu" data-editor-font-family-menu-for="templateEditorFontFamily" role="listbox" aria-label="글꼴 목록">
                ${renderDocumentToolbarFontFamilyOptionButtons("'Noto Sans KR', sans-serif")}
              </div>
            </div>
          </div>
        </div>
        <div class="template-toolbar-section template-toolbar-section-compact">
          <span class="template-toolbar-section-label">크기</span>
          <div class="template-toolbar-group-controls template-toolbar-font-size-controls">
            <div class="template-toolbar-font-size-combo" data-editor-font-size-combo="templateEditorFontSize">
              <input class="template-toolbar-font-size-input" id="templateEditorFontSize" type="hidden" value="11" aria-hidden="true" tabindex="-1" />
              <button class="template-toolbar-combo-value template-toolbar-font-size-value" data-action="toggle-document-font-size-menu" data-font-size-input="templateEditorFontSize" type="button" aria-label="글꼴 크기 목록 열기" aria-expanded="false" aria-controls="templateEditorFontSizeMenu">
                <span data-editor-font-size-current>11</span>
                <span class="template-toolbar-combo-unit" aria-hidden="true">pt</span>
                <span class="template-toolbar-combo-caret" aria-hidden="true"></span>
              </button>
              <div class="template-toolbar-combo-menu hidden" id="templateEditorFontSizeMenu" data-editor-font-size-menu-for="templateEditorFontSize" role="listbox" aria-label="글꼴 크기 목록">
                ${renderDocumentToolbarFontSizeOptionButtons(11)}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="template-toolbar-section">
        <span class="template-toolbar-section-label">스타일</span>
        <div class="template-toolbar-group-controls">
          ${renderDocumentToolbarTextButton({ action: "apply-document-command", label: "굵게", textContent: "B", extraAttributes: ' data-command="bold"' })}
          ${renderDocumentToolbarTextButton({ action: "apply-document-command", label: "기울임", textContent: "I", extraAttributes: ' data-command="italic"' })}
          ${renderDocumentToolbarTextButton({ action: "apply-document-command", label: "밑줄", textContent: "U", extraAttributes: ' data-command="underline"' })}
          ${renderDocumentToolbarIconButton({ action: "apply-document-command", label: "목록", iconMarkup: documentToolbarIconMarkup.unorderedList, extraAttributes: ' data-command="insertUnorderedList"' })}
        </div>
      </div>
      <div class="template-toolbar-section">
        <span class="template-toolbar-section-label">정렬</span>
        <div class="template-toolbar-group-controls">
          ${renderDocumentToolbarIconButton({ action: "apply-document-command", label: "왼쪽 정렬", iconMarkup: documentToolbarIconMarkup.justifyLeft, extraAttributes: ' data-command="justifyLeft"' })}
          ${renderDocumentToolbarIconButton({ action: "apply-document-command", label: "가운데 정렬", iconMarkup: documentToolbarIconMarkup.justifyCenter, extraAttributes: ' data-command="justifyCenter"' })}
          ${renderDocumentToolbarIconButton({ action: "apply-document-command", label: "오른쪽 정렬", iconMarkup: documentToolbarIconMarkup.justifyRight, extraAttributes: ' data-command="justifyRight"' })}
          ${renderDocumentToolbarIconButton({ action: "apply-document-command", label: "배분정렬", iconMarkup: documentToolbarIconMarkup.justifyFull, extraAttributes: ' data-command="justifyFull"' })}
        </div>
      </div>
      <div class="template-toolbar-section-row template-toolbar-section-row-stack">
        ${renderDocumentToolbarColorPickerSection({
          sectionLabel: "글자색",
          inputId: "templateEditorTextColor",
          inputValue: "#152033",
          presetColors: documentToolbarTextColorPresets,
          colorCommand: "foreColor",
          fallbackValue: "#152033",
          sectionClassName: "template-toolbar-section-compact",
          pickerClassName: "template-toolbar-color-picker-compact",
        })}
        ${renderDocumentToolbarColorPickerSection({
          sectionLabel: "음영",
          inputId: "templateEditorTextShading",
          inputValue: "#fff59d",
          presetColors: documentToolbarShadingColorPresets,
          colorCommand: "hiliteColor",
          fallbackValue: "#fff59d",
          sectionClassName: "template-toolbar-section-compact",
          pickerClassName: "template-toolbar-color-picker-compact",
        })}
      </div>
    </div>
    <div class="template-toolbar-group editor-panel-block template-toolbar-table-group is-disabled" data-editor-table-toolbar-group="true" aria-disabled="true">
      <span class="template-toolbar-group-label">표</span>
      <div class="template-toolbar-section">
        <span class="template-toolbar-section-label">추가</span>
        <div class="template-toolbar-group-controls">
          ${renderDocumentToolbarIconButton({ action: "apply-document-table-action", label: "위에 행 추가", iconMarkup: documentToolbarIconMarkup.insertRowBefore, extraAttributes: ' data-table-action="insert-row-before"' })}
          ${renderDocumentToolbarIconButton({ action: "apply-document-table-action", label: "아래에 행 추가", iconMarkup: documentToolbarIconMarkup.insertRowAfter, extraAttributes: ' data-table-action="insert-row-after"' })}
          ${renderDocumentToolbarIconButton({ action: "apply-document-table-action", label: "왼쪽에 열 추가", iconMarkup: documentToolbarIconMarkup.insertColumnBefore, extraAttributes: ' data-table-action="insert-column-before"' })}
          ${renderDocumentToolbarIconButton({ action: "apply-document-table-action", label: "오른쪽에 열 추가", iconMarkup: documentToolbarIconMarkup.insertColumnAfter, extraAttributes: ' data-table-action="insert-column-after"' })}
        </div>
      </div>
      <div class="template-toolbar-section">
        <span class="template-toolbar-section-label">삭제</span>
        <div class="template-toolbar-group-controls">
          ${renderDocumentToolbarIconButton({ action: "apply-document-table-action", label: "행 삭제", iconMarkup: documentToolbarIconMarkup.deleteRow, extraAttributes: ' data-table-action="delete-row"' })}
          ${renderDocumentToolbarIconButton({ action: "apply-document-table-action", label: "열 삭제", iconMarkup: documentToolbarIconMarkup.deleteColumn, extraAttributes: ' data-table-action="delete-column"' })}
        </div>
      </div>
      <div class="template-toolbar-section-row template-toolbar-section-row-stack">
        <div class="template-toolbar-section">
          <span class="template-toolbar-section-label">편집</span>
          <div class="template-toolbar-group-controls">
            ${renderDocumentToolbarIconButton({ action: "apply-document-table-action", label: "선택한 셀 병합", iconMarkup: documentToolbarIconMarkup.mergeSelection, extraAttributes: ' data-table-action="merge-selection"' })}
            ${renderDocumentToolbarCellSplitPopover()}
          </div>
        </div>
        <div class="template-toolbar-section">
          <span class="template-toolbar-section-label">맞춤</span>
          <div class="template-toolbar-group-controls">
            ${renderDocumentToolbarIconButton({ action: "apply-document-table-action", label: "열 너비 맞춤", iconMarkup: documentToolbarIconMarkup.equalizeColumnWidths, extraAttributes: ' data-table-action="equalize-column-widths"' })}
            ${renderDocumentToolbarIconButton({ action: "apply-document-table-action", label: "행 높이 맞춤", iconMarkup: documentToolbarIconMarkup.equalizeRowHeights, extraAttributes: ' data-table-action="equalize-row-heights"' })}
          </div>
        </div>
      </div>
      <div class="template-toolbar-section">
        <span class="template-toolbar-section-label">배치</span>
        <div class="template-toolbar-group-controls">
          ${renderDocumentToolbarIconButton({ action: "apply-document-table-action", label: "셀 위쪽 정렬", iconMarkup: documentToolbarIconMarkup.cellVerticalAlignTop, extraAttributes: ' data-table-action="cell-vertical-align-top"' })}
          ${renderDocumentToolbarIconButton({ action: "apply-document-table-action", label: "셀 가운데 정렬", iconMarkup: documentToolbarIconMarkup.cellVerticalAlignMiddle, extraAttributes: ' data-table-action="cell-vertical-align-middle"' })}
          ${renderDocumentToolbarIconButton({ action: "apply-document-table-action", label: "셀 아래쪽 정렬", iconMarkup: documentToolbarIconMarkup.cellVerticalAlignBottom, extraAttributes: ' data-table-action="cell-vertical-align-bottom"' })}
        </div>
      </div>
      ${renderDocumentToolbarColorPickerSection({
        sectionLabel: "음영",
        inputId: "templateEditorCellShading",
        inputValue: "#ffffff",
        presetColors: documentToolbarShadingColorPresets,
        colorTableAction: "apply-cell-shading",
        fallbackValue: "#ffffff",
      })}
    </div>
    <div class="template-toolbar-group editor-panel-block">
      <span class="template-toolbar-group-label">삽입</span>
      <div class="template-toolbar-section">
        <span class="template-toolbar-section-label">개체</span>
        <div class="template-toolbar-group-controls">
          ${renderDocumentToolbarTableInsertPopover()}
          ${renderDocumentToolbarIconButton({ action: "insert-document-image", label: "이미지 삽입", iconMarkup: documentToolbarIconMarkup.openImage })}
          ${renderDocumentToolbarIconButton({ action: "insert-document-barcode", label: "바코드 삽입", iconMarkup: documentToolbarIconMarkup.barcode })}
          ${renderDocumentToolbarIconButton({ action: "insert-document-qrcode", label: "QR코드 삽입", iconMarkup: documentToolbarIconMarkup.qrcode })}
          ${renderDocumentToolbarIconButton({ action: "insert-document-divider", label: "구분선", iconMarkup: documentToolbarIconMarkup.rule })}
        </div>
      </div>
    </div>
    <input class="upload-file-input" id="templateEditorImageInput" type="file" accept="image/*" />
  `;

  if (canManageTemplates) {
    return toolbarMarkup;
  }

  return `
    <fieldset class="template-toolbar-readonly-fieldset" disabled aria-disabled="true">
      ${toolbarMarkup}
    </fieldset>
  `;
}
