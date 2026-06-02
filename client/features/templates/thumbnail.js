import { escapeHtml } from "../../app/html-utils.js";
import {
  candidateBlockGridMinimumRowHeight,
  getCandidateBlockGridTotal,
  normalizeCandidateBlockGridConfig,
  pointValueToCssPixel,
} from "../template-editor/candidate-block-grid-config.js";
import { getPageDocumentHtml } from "../template-editor/document-editor.js";
import {
  templateSampleCandidatePhotoFileId,
  templateSampleCandidatePhotoPath,
} from "../template-editor/sample-candidate-photo.js";

const PIXELS_PER_POINT = 96 / 72;
const DEFAULT_PAGE_WIDTH_PT = 595.28;
const DEFAULT_PAGE_HEIGHT_PT = 841.89;
const MAX_THUMBNAIL_WIDTH_PX = 430;
const MAX_THUMBNAIL_SCALE = 0.54;

const previewTokenValues = Object.freeze({
  "admission.typeName": "일반전형",
  "admission.unitName": "모집단위",
  "admission.year": "2026",
  "candidate.birthDate": "2000-01-01",
  "candidate.examNo": "A000001",
  "candidate.name": "예시 수험생",
  "candidate.photoFileId": templateSampleCandidatePhotoFileId,
  "candidate.photoUrl": templateSampleCandidatePhotoPath,
  "candidate.roomName": "101호",
  "document.generatedAt": "2026-05-13 09:00",
  "document.templateName": "수험생확인대장",
  "document.totalCandidates": "24",
  "exam.date": "2026-05-13",
  "exam.name": "입학전형",
  "page.current": "1",
  "page.total": "3",
  "room.assignedCount": "24",
  "room.name": "101호",
  "row.index": "1",
  "row.indexInPage": "1",
  "row.indexInUnit": "1",
  attendanceCheck: "□",
});

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function pointToPixel(value) {
  return Math.round(toNumber(value) * PIXELS_PER_POINT * 100) / 100;
}

function formatPx(value) {
  return `${Math.max(0, Math.round(toNumber(value) * 100) / 100)}px`;
}

function getPageWidthPt(page, layout) {
  return toNumber(page?.widthPt ?? layout?.paper?.widthPt, DEFAULT_PAGE_WIDTH_PT);
}

function getPageHeightPt(page, layout) {
  return toNumber(page?.heightPt ?? layout?.paper?.heightPt, DEFAULT_PAGE_HEIGHT_PT);
}

function getThumbnailPageWidthPt(template, page, layout) {
  return toNumber(template?.thumbnailPage?.widthPt ?? page?.widthPt ?? layout?.paper?.widthPt, DEFAULT_PAGE_WIDTH_PT);
}

function getThumbnailPageHeightPt(template, page, layout) {
  return toNumber(template?.thumbnailPage?.heightPt ?? page?.heightPt ?? layout?.paper?.heightPt, DEFAULT_PAGE_HEIGHT_PT);
}

function getThumbnailPage(layout) {
  const pages = Array.isArray(layout?.pages)
    ? [...layout.pages]
        .filter((page) => page?.enabled !== false)
        .sort((left, right) => (toNumber(left?.sortOrder) || 0) - (toNumber(right?.sortOrder) || 0))
    : [];

  return pages.find((page) => String(page?.type || "") === "content") || pages[0] || null;
}

function replacePreviewTokens(value) {
  return String(value || "").replace(/{{\s*([^}|]+)(?:\|[^}]*)?}}/g, (match, tokenKey) => {
    const normalizedKey = String(tokenKey || "").trim();

    if (!normalizedKey) {
      return "";
    }

    return Object.prototype.hasOwnProperty.call(previewTokenValues, normalizedKey)
      ? previewTokenValues[normalizedKey]
      : normalizedKey.split(".").at(-1) || "";
  });
}

function getColumnMajorGridPosition(slotIndex = 0, config = {}) {
  const rowCount = Math.max(1, Math.round(Number(config.rows)) || 1);
  const columnIndex = Math.floor(Math.max(0, slotIndex) / rowCount);
  const rowIndex = Math.max(0, slotIndex) % rowCount;

  return {
    column: columnIndex + 1,
    row: rowIndex + 1,
  };
}

function getRenderedCandidateBlockGridRow(row = 1, hasColumnNameRow = false) {
  const safeRow = Math.max(1, Math.round(Number(row)) || 1);

  return hasColumnNameRow ? 2 + (safeRow - 1) * 2 : safeRow;
}

function getCandidateBlockGridTemplateRows(config = {}, columnNameRowHeight = 0) {
  const rowCount = Math.max(1, Math.round(Number(config.rows)) || 1);
  const dataRowTrack = `minmax(${candidateBlockGridMinimumRowHeight}px, 1fr)`;

  if (!config.columnNameRow?.enabled) {
    return `repeat(${rowCount}, ${dataRowTrack})`;
  }

  const tracks = [formatPx(columnNameRowHeight)];
  const dataRowGapPx = pointValueToCssPixel(config.gapYPt || 0);

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    tracks.push(dataRowTrack);

    if (rowIndex < rowCount - 1) {
      tracks.push(formatPx(dataRowGapPx));
    }
  }

  return tracks.join(" ");
}

function getElementStyle(element, extraStyles = "") {
  return [
    "position:absolute",
    `left:${formatPx(pointToPixel(element?.x))}`,
    `top:${formatPx(pointToPixel(element?.y))}`,
    `width:${formatPx(pointToPixel(element?.width))}`,
    `min-height:${formatPx(pointToPixel(element?.height))}`,
    extraStyles,
  ]
    .filter(Boolean)
    .join(";");
}

function getTextStyle(style = {}) {
  return [
    `color:${escapeHtml(style.color || "#102445")}`,
    `font-family:${escapeHtml(style.fontFamily || "Noto Sans KR")}, sans-serif`,
    `font-size:${formatPx(pointToPixel(style.fontSize || 12))}`,
    `font-weight:${Math.round(toNumber(style.fontWeight, 500))}`,
    `line-height:${toNumber(style.lineHeight, 1.25)}`,
    `text-align:${["left", "center", "right"].includes(style.textAlign) ? style.textAlign : "left"}`,
    "white-space:pre-line",
  ].join(";");
}

function renderTextElement(element) {
  const style = element?.config?.style || {};
  const content = replacePreviewTokens(element?.config?.content || "");

  return `
    <div class="template-card-page-element template-card-text-element" style="${getElementStyle(element, getTextStyle(style))}">
      ${escapeHtml(content)}
    </div>
  `;
}

function renderTableElement(element) {
  const columns = Array.isArray(element?.config?.columns) ? element.config.columns : [];
  const pagination = element?.config?.pagination || {};
  const headerHeightPx = pointToPixel(pagination.headerHeight || 32);
  const rowHeightPx = pointToPixel(pagination.rowHeight || 42);
  const visibleRows = Math.max(2, Math.min(5, Math.floor(pointToPixel(element?.height || 0) / Math.max(rowHeightPx, 1)) - 1 || 3));

  if (!columns.length) {
    return "";
  }

  return `
    <div class="template-card-page-element" style="${getElementStyle(element, "overflow:hidden;")}">
      <table class="template-card-thumbnail-table">
        <colgroup>
          ${columns.map((column) => `<col style="width:${formatPx(pointToPixel(column.width || 64))}" />`).join("")}
        </colgroup>
        <thead>
          <tr style="height:${formatPx(headerHeightPx)}">
            ${columns.map((column) => `<th>${escapeHtml(column.label || column.key || "")}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: visibleRows }, (_, rowIndex) => `
            <tr style="height:${formatPx(rowHeightPx)}">
              ${columns.map((column) => renderTableCell(column, rowIndex)).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderTableCell(column, rowIndex) {
  const align = ["left", "center", "right"].includes(column.align) ? column.align : "center";
  let value = previewTokenValues[column.key] || "";

  if (column.key === "row.indexInUnit" || column.key === "row.index" || column.key === "row.indexInPage") {
    value = String(rowIndex + 1);
  } else if (column.type === "checkbox") {
    value = "□";
  } else if (column.type === "photo" || column.key === "candidate.photo") {
    return `
      <td class="template-card-thumbnail-photo-cell" style="text-align:${align};">
        <img src="${escapeHtml(templateSampleCandidatePhotoPath)}" alt="수험생 사진" />
      </td>
    `;
  } else if (!value) {
    value = column.label || "";
  }

  return `<td style="text-align:${align};">${escapeHtml(value)}</td>`;
}

function renderImageElement(element) {
  const label = element?.type === "candidatePhoto" ? "사진" : String(element?.config?.alt || "이미지");

  if (element?.type === "candidatePhoto") {
    return `
      <div class="template-card-page-element template-card-image-placeholder template-card-candidate-photo-preview" style="${getElementStyle(element)}">
        <img src="${escapeHtml(templateSampleCandidatePhotoPath)}" alt="수험생 사진" />
      </div>
    `;
  }

  return `
    <div class="template-card-page-element template-card-image-placeholder" style="${getElementStyle(element)}">
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function renderLineElement(element) {
  const style = element?.config?.style || {};
  const isVertical = String(element?.config?.direction || "").includes("vertical");

  return `
    <div
      class="template-card-page-element template-card-line-element ${isVertical ? "vertical" : ""}"
      style="${getElementStyle(element, `border-color:${escapeHtml(style.strokeColor || "#516585")};border-width:${Math.max(1, pointToPixel(style.strokeWidth || 1))}px;`)}"
    ></div>
  `;
}

function renderBoxElement(element) {
  const style = element?.config?.style || {};
  const borderWidth = Math.max(1, pointToPixel(style.borderWidth || 1));
  const borderRadius = element?.type === "ellipse" ? "999px" : formatPx(pointToPixel(style.radius || 0));

  return `
    <div
      class="template-card-page-element template-card-box-element"
      style="${getElementStyle(
        element,
        [
          `background:${escapeHtml(style.backgroundColor || "transparent")}`,
          `border:${borderWidth}px ${escapeHtml(style.borderStyle || "solid")} ${escapeHtml(style.borderColor || "#516585")}`,
          `border-radius:${borderRadius}`,
        ].join(";"),
      )}"
    ></div>
  `;
}

function renderLegacyElement(element) {
  if (!element || element.visible === false) {
    return "";
  }

  switch (element.type) {
    case "table":
      return renderTableElement(element);
    case "candidatePhoto":
    case "image":
      return renderImageElement(element);
    case "line":
      return renderLineElement(element);
    case "rect":
    case "ellipse":
      return renderBoxElement(element);
    case "checkbox":
      return renderTextElement({
        ...element,
        config: {
          content: `${element?.config?.checked ? "☑" : "□"} ${element?.config?.label || "확인"}`,
          style: element?.config?.style || {},
        },
      });
    case "signatureBox":
      return renderTextElement({
        ...element,
        config: {
          content: element?.config?.label || "서명",
          style: element?.config?.style || {},
        },
      });
    case "pageNumber":
    case "text":
    case "dataText":
    default:
      return renderTextElement(element);
  }
}

function renderCandidateBlockGrid(config = {}) {
  const normalizedConfig = normalizeCandidateBlockGridConfig(config);
  const totalBlocks = getCandidateBlockGridTotal(normalizedConfig);
  const hasColumnNameRow = Boolean(normalizedConfig.columnNameRow?.enabled);
  const columnNameRowHeight = hasColumnNameRow
    ? pointValueToCssPixel(normalizedConfig.columnNameRow?.heightPt || 0)
    : 0;
  const x = pointValueToCssPixel(normalizedConfig.xPt);
  const y = pointValueToCssPixel(normalizedConfig.yPt);
  const width = pointValueToCssPixel(normalizedConfig.widthPt);
  const height = pointValueToCssPixel(
    normalizedConfig.heightPt > 0
      ? normalizedConfig.heightPt + (hasColumnNameRow ? normalizedConfig.columnNameRow?.heightPt || 0 : 0)
      : 0,
  );
  const blockTemplateHtml = replacePreviewTokens(normalizedConfig.blockTemplateHtml);
  const columnNameTemplateHtml = replacePreviewTokens(normalizedConfig.columnNameRow?.templateHtml || "");
  const hasTable = /<table[\s>]/i.test(blockTemplateHtml);
  const style = [
    `grid-template-columns:repeat(${normalizedConfig.columns}, minmax(0, 1fr))`,
    `grid-template-rows:${getCandidateBlockGridTemplateRows(normalizedConfig, columnNameRowHeight)}`,
    `row-gap:${hasColumnNameRow ? 0 : normalizedConfig.gapYPt}pt`,
    `column-gap:${normalizedConfig.gapXPt}pt`,
    x > 0 || y > 0 ? `position:absolute;left:${formatPx(x)};top:${formatPx(y)}` : "",
    width > 0 ? `width:${formatPx(width)}` : "",
    height > 0 ? `height:${formatPx(height)}` : "",
  ].filter(Boolean).join(";");

  return `
    <div class="examlist-candidate-block-grid template-card-candidate-block-grid" style="${style}">
      ${hasColumnNameRow ? Array.from({ length: normalizedConfig.columns }, (_item, index) => `
        <div class="examlist-candidate-block examlist-candidate-block-column-name" data-candidate-block-column-name="true" style="grid-row:1;grid-column:${index + 1};">
          ${columnNameTemplateHtml}
        </div>
      `).join("") : ""}
      ${Array.from({ length: totalBlocks }, (_item, index) => {
        const gridPosition = getColumnMajorGridPosition(index, normalizedConfig);
        const renderedRow = getRenderedCandidateBlockGridRow(gridPosition.row, hasColumnNameRow);

        return `
          <div class="examlist-candidate-block${hasTable ? " has-candidate-block-table" : ""}" data-candidate-block-instance="${index + 1}" style="grid-row:${renderedRow};grid-column:${gridPosition.column};">
            ${blockTemplateHtml}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function decorateThumbnailDocumentContent(rootElement) {
  rootElement?.querySelectorAll?.("img").forEach((imageElement) => {
    imageElement.loading = "lazy";
    imageElement.decoding = "async";
    imageElement.draggable = false;
  });
}

function applyDocumentPreviewReplacements(html, page) {
  const candidateBlockGridHtml = page?.settings?.candidateBlockGrid?.enabled
    ? renderCandidateBlockGrid(page.settings.candidateBlockGrid)
    : "";

  if (typeof document === "undefined") {
    return replacePreviewTokens(html);
  }

  const template = document.createElement("template");
  template.innerHTML = replacePreviewTokens(html);

  if (candidateBlockGridHtml) {
    const gridTarget = template.content.querySelector("[data-candidate-block-grid]");

    if (gridTarget) {
      gridTarget.outerHTML = candidateBlockGridHtml;
    } else {
      template.content.append(document.createRange().createContextualFragment(candidateBlockGridHtml));
    }
  }

  decorateThumbnailDocumentContent(template.content);
  return template.innerHTML;
}

function renderDocumentThumbnail(page) {
  const sourceHtml = getPageDocumentHtml(page);

  if (!sourceHtml) {
    return "";
  }

  const safeArea = page?.settings?.safeArea || {};

  return `
    <div
      class="template-card-document-body editor-document-surface"
      style="padding:${formatPx(pointToPixel(safeArea.top || 28.35))} ${formatPx(pointToPixel(safeArea.right || 28.35))} ${formatPx(pointToPixel(safeArea.bottom || 28.35))} ${formatPx(pointToPixel(safeArea.left || 28.35))};"
    >
      ${applyDocumentPreviewReplacements(sourceHtml, page)}
    </div>
  `;
}

function renderLegacyThumbnail(page) {
  const elements = Array.isArray(page?.elements)
    ? [...page.elements].sort((left, right) => (toNumber(left?.zIndex) || 0) - (toNumber(right?.zIndex) || 0))
    : [];

  return elements.map(renderLegacyElement).join("");
}

function renderPlaceholderThumbnail() {
  return `
    <div class="template-preview">
      <div class="template-sheet-placeholder" aria-hidden="true">
        <span class="template-sheet-placeholder-title"></span>
        <span class="template-sheet-placeholder-line long"></span>
        <span class="template-sheet-placeholder-line"></span>
        <span class="template-sheet-placeholder-line"></span>
        <span class="template-sheet-placeholder-block"></span>
      </div>
    </div>
  `;
}

function renderPreviewHtmlThumbnail(template, page, layout) {
  const widthPx = pointToPixel(getThumbnailPageWidthPt(template, page, layout));
  const heightPx = pointToPixel(getThumbnailPageHeightPt(template, page, layout));
  const scale = Math.min(MAX_THUMBNAIL_SCALE, MAX_THUMBNAIL_WIDTH_PX / Math.max(widthPx, 1));
  const previewStyle = `--template-card-page-width:${formatPx(widthPx)};--template-card-page-height:${formatPx(heightPx)};--template-card-thumbnail-scale:${scale};`;

  return `
    <div class="template-preview template-preview-frame" style="${previewStyle}">
      <iframe
        class="template-card-preview-frame"
        loading="lazy"
        srcdoc="${escapeHtml(template.thumbnailHtml)}"
        title="${escapeHtml(template.name || "양식 미리보기")}"
        tabindex="-1"
        aria-hidden="true"
      ></iframe>
    </div>
  `;
}

export function renderTemplateCardThumbnail(template) {
  const layout = template?.layout && typeof template.layout === "object" ? template.layout : null;
  const page = getThumbnailPage(layout);

  if (String(template?.thumbnailHtml || "").trim()) {
    return renderPreviewHtmlThumbnail(template, page, layout);
  }

  if (!page) {
    return renderPlaceholderThumbnail();
  }

  const widthPx = pointToPixel(getPageWidthPt(page, layout));
  const heightPx = pointToPixel(getPageHeightPt(page, layout));
  const scale = Math.min(MAX_THUMBNAIL_SCALE, MAX_THUMBNAIL_WIDTH_PX / Math.max(widthPx, 1));
  const hasDocumentHtml =
    Boolean(String(page?.settings?.documentHtml || "").trim()) ||
    String(page?.settings?.editorMode || "").trim() === "document" ||
    Boolean(page?.settings?.candidateBlockGrid?.enabled);
  const bodyMarkup = hasDocumentHtml ? renderDocumentThumbnail(page) : renderLegacyThumbnail(page);

  const previewStyle = `--template-card-page-width:${formatPx(widthPx)};--template-card-page-height:${formatPx(heightPx)};--template-card-thumbnail-scale:${scale};`;

  return `
    <div class="template-preview" style="${previewStyle}">
      <article
        class="template-render-sheet template-card-thumbnail-sheet"
        style="${previewStyle}background:${escapeHtml(page?.settings?.backgroundColor || "#ffffff")};"
        aria-hidden="true"
      >
        ${bodyMarkup || ""}
      </article>
    </div>
  `;
}
