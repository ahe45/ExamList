import { canUseAccess, hasAccess } from "../../app/access.js";
import { escapeHtml } from "../../app/html-utils.js";
import { getPageDocumentHtml } from "./document-editor.js";
import { renderDocumentToolbar } from "./document-toolbar-renderer.js";
import { renderPagePropertyPanel } from "./page-property-renderers.js";
import { dataTagSampleSettingsIcon, renderDataTagSampleModal } from "./data-tag-samples-renderer.js";
import { renderDataTagFormatModal } from "./data-tag-format-renderer.js";
import { renderGenerationUnitSettingsModal } from "./generation-unit-settings-renderer.js";
import {
  getTemplateEditorCanvasZoom,
  getTemplateEditorCanvasZoomMode,
  getTemplateEditorCanvasZoomPercentLabel,
  templateEditorCanvasZoomMax,
  templateEditorCanvasZoomMin,
} from "./canvas-zoom.js";
import { getSelectedPage } from "./state.js";

function renderDataTagCatalog(editor, access) {
  const groups = Array.isArray(editor?.dataTags?.groups) ? editor.dataTags.groups : [];
  const canInsertDataTag = canUseAccess(access, "manageTemplates");
  const tags = groups.flatMap((group) => (Array.isArray(group.tags) ? group.tags : [])).filter(isVisibleDataTag);

  return `
    ${
      tags.length
        ? tags
            .map((tag) => {
              const tokenText = `#${String(tag.label || tag.key || "").trim()}`;
              const labelText = String(tag.label || "").trim();
              const exampleText = String(tag.example || "").trim();
              const titleText = [labelText, exampleText].filter(Boolean).join(" · ");

              return `
                <button
                  class="editor-tag-button template-tag-button"
                  data-action="insert-data-tag"
                  data-tag-key="${escapeHtml(tag.key)}"
                  data-tag-label="${escapeHtml(labelText || tag.key)}"
                  type="button"
                  title="${escapeHtml(titleText || tokenText)}"
                  aria-label="${escapeHtml(titleText || tokenText)}"
                  ${canInsertDataTag ? "" : "disabled"}
                >
                  ${escapeHtml(tokenText)}
                </button>
              `;
            })
            .join("")
        : ""
    }
    ${tags.length ? "" : '<p class="editor-empty">사용 가능한 데이터 태그가 없습니다.</p>'}
  `;
}

function isVisibleDataTag(tag = {}) {
  const key = String(tag?.key || "").trim();

  return key !== "school.academicYear";
}

function renderEditorSidebarFooter(editor, access) {
  const actionButtons = [];
  const hasTemplateManagement = hasAccess(access, "manageTemplates");
  const canManageTemplates = canUseAccess(access, "manageTemplates");
  const hasTemplatePreview = hasAccess(access, "previewTemplates");
  const canPreviewTemplates = canUseAccess(access, "previewTemplates");

  if (hasTemplateManagement) {
    actionButtons.push(`
      <button class="primary-button" data-action="save-template-layout" type="button" ${editor.isSaving || !canManageTemplates ? "disabled" : ""}>
        ${editor.isSaving ? "저장 중..." : "저장"}
      </button>
    `);
  }

  if (hasTemplatePreview) {
    actionButtons.push(`
      <button class="ghost-button" data-action="open-template-preview" type="button" ${editor.isPreviewLoading || !canPreviewTemplates ? "disabled" : ""}>
        ${editor.isPreviewLoading ? "미리보기 생성 중..." : "미리보기"}
      </button>
    `);
  }

  return `
    <div class="editor-toolbar-footer template-editor-toolbar-footer editor-sidebar-footer">
      ${
        editor.documentOverflowMessage
          ? `<p class="editor-overflow-warning">${escapeHtml(editor.documentOverflowMessage)}</p>`
          : ""
      }
      ${actionButtons.join("")}
    </div>
  `;
}

function renderPreviewModal(editor) {
  if (!editor.isPreviewOpen) {
    return "";
  }

  const templateName = String(editor.template?.name || "수험생확인대장").trim() || "수험생확인대장";
  const previewTitle = templateName.endsWith("미리보기") ? templateName : `${templateName} 미리보기`;
  const pdfUrl = String(editor.previewPdfUrl || "").trim();

  return `
    <div class="modal-overlay editor-preview-modal">
      <div class="modal-card editor-preview-modal-card">
        <div class="modal-header editor-preview-modal-header">
          <div class="editor-preview-title">
            <h2>${escapeHtml(previewTitle)}</h2>
          </div>
          <div class="editor-preview-header-actions">
            <button class="icon-button" data-action="close-template-preview" type="button" aria-label="닫기">×</button>
          </div>
        </div>

        <div class="editor-preview-body">
          ${
            editor.isPreviewLoading
              ? '<p class="helper-text">미리보기를 생성하는 중입니다.</p>'
              : editor.previewErrorMessage
                ? `<p class="error-banner">${escapeHtml(editor.previewErrorMessage)}</p>`
                : pdfUrl
                  ? `
                  <iframe
                    class="editor-preview-frame pdf-generation-pdf-viewer-frame"
                    src="${escapeHtml(pdfUrl)}"
                    title="PDF 미리보기"
                  ></iframe>
                `
                  : '<p class="helper-text">표시할 PDF 미리보기가 없습니다.</p>'
          }
        </div>
      </div>
    </div>
  `;
}

function renderTemplateEditorCanvasZoomControls(editor) {
  const zoom = getTemplateEditorCanvasZoom(editor);
  const zoomLabel = getTemplateEditorCanvasZoomPercentLabel(zoom);

  return `
    <div class="template-editor-canvas-zoom-controls" aria-label="캔버스 확대/축소">
      <div class="template-editor-canvas-zoom-toolbar" role="toolbar" aria-label="캔버스 확대/축소">
        <button
          class="template-editor-canvas-zoom-button"
          data-action="step-template-editor-canvas-zoom"
          data-template-editor-canvas-zoom-direction="-1"
          type="button"
          aria-label="캔버스 축소"
          ${zoom <= templateEditorCanvasZoomMin ? "disabled" : ""}
        >-</button>
        <button
          class="template-editor-canvas-zoom-value"
          data-action="reset-template-editor-canvas-zoom"
          type="button"
          aria-label="캔버스 확대율 초기화"
        ><span data-template-editor-canvas-zoom-label>${escapeHtml(zoomLabel)}</span></button>
        <button
          class="template-editor-canvas-zoom-button"
          data-action="step-template-editor-canvas-zoom"
          data-template-editor-canvas-zoom-direction="1"
          type="button"
          aria-label="캔버스 확대"
          ${zoom >= templateEditorCanvasZoomMax ? "disabled" : ""}
        >+</button>
      </div>
    </div>
  `;
}

export function renderTemplateEditorView({ access, editor }) {
  if (editor.loading) {
    return `
      <section class="surface-panel">
        <p class="helper-text">템플릿 정보를 불러오는 중입니다.</p>
      </section>
    `;
  }

  if (!editor.template) {
    return `
      <section class="surface-panel">
        <p class="helper-text">편집할 템플릿을 선택하세요.</p>
      </section>
    `;
  }

  const selectedPage = getSelectedPage(editor);
  const canManageTemplates = canUseAccess(access, "manageTemplates");
  const isBlockingModalOpen = Boolean(
    editor.isPreviewOpen ||
      editor.dataTagSampleModal?.isOpen ||
      editor.dataTagFormatModal?.isOpen ||
      editor.generationUnitSettingsModal?.isOpen ||
      editor.generationUnitModal?.isOpen,
  );
  const runtimeModalAttributes = isBlockingModalOpen ? 'inert aria-hidden="true"' : "";
  const runtimeModalClass = isBlockingModalOpen ? " is-template-editor-modal-open" : "";
  const canvasZoom = getTemplateEditorCanvasZoom(editor);
  const canvasZoomMode = getTemplateEditorCanvasZoomMode(editor);

  return `
    <section class="template-editor-shell">
      <div class="template-editor-modal-sheet examlist-template-editor-sheet">
        <div class="template-editor-modal-body template-editor-grid examlist-template-editor-body template-editor-runtime-shell${runtimeModalClass}" id="templateEditorRuntimeHost" ${runtimeModalAttributes}>
          <aside class="editor-toolbar-column template-editor-toolbar-column editor-tools-column">
            <div class="editor-toolbar" id="templateEditorToolbarHost" role="toolbar" aria-label="양식 편집 도구">
              <p class="helper-text">편집 도구를 불러오는 중입니다.</p>
            </div>
          </aside>

          <aside class="template-tag-panel" aria-label="데이터 태그">
            <div class="editor-tag-panel-block">
              <div class="template-tag-panel-heading">
                <p class="template-tag-caption">데이터 태그</p>
                <button
                  class="icon-button template-tag-sample-settings-button"
                  data-action="open-data-tag-sample-modal"
                  type="button"
                  title="데이터 태그 설정"
                  aria-label="데이터 태그 설정"
                >
                  ${dataTagSampleSettingsIcon}
                </button>
              </div>
              <div class="template-tag-strip editor-tag-catalog" id="templateTagStrip">
                <p class="editor-empty">데이터 태그를 불러오는 중입니다.</p>
              </div>
            </div>
          </aside>

          <section
            class="template-editor-page editor-canvas-column"
            aria-label="${escapeHtml(selectedPage?.name || "페이지")} 캔버스"
            data-template-editor-canvas="true"
            data-template-editor-canvas-zoom="${escapeHtml(String(canvasZoom))}"
            data-template-editor-canvas-zoom-mode="${escapeHtml(canvasZoomMode)}"
            style="--template-editor-canvas-zoom: ${escapeHtml(String(canvasZoom))};"
          >
            ${renderTemplateEditorCanvasZoomControls(editor)}
            <div class="editor-paper-scale-box" data-template-editor-canvas-scale-box>
              <div
                id="templateEditorSurface"
                class="template-editor-surface editor-paper editor-document-surface ${canManageTemplates ? "editable" : "readonly"}"
                data-editor-document-surface="true"
                data-page-id="${escapeHtml(selectedPage?.id || "")}"
                data-placeholder="용지 위에 제목, 본문, 표, 이미지, 데이터 태그를 자유롭게 배치하세요."
                ${canManageTemplates ? 'contenteditable="true" spellcheck="false"' : ""}
              ></div>
            </div>
            <p class="editor-overflow-warning editor-canvas-overflow-warning hidden" id="templateEditorOverflowStatus"></p>
          </section>

          <aside class="template-page-properties-column" aria-label="페이지 속성 및 저장">
            <div class="template-page-properties-panel" id="templatePagePropertiesPanel" aria-label="페이지 속성">
              <p class="helper-text">페이지 속성을 불러오는 중입니다.</p>
            </div>
            ${renderEditorSidebarFooter(editor, access)}
          </aside>
        </div>
      </div>
    </section>
    ${renderPreviewModal(editor)}
    ${renderDataTagSampleModal(editor)}
    ${renderDataTagFormatModal(editor)}
    ${renderGenerationUnitSettingsModal(editor)}
  `;
}
