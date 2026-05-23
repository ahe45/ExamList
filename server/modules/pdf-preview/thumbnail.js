const { buildPreviewSampleCandidates, previewSampleCandidateCount } = require("./sample-candidates");
const { getPreviewDocumentStyles } = require("./styles");
const { escapeHtml } = require("./renderer-html-utils");
const { renderPreviewDocumentParts } = require("./renderer");

const thumbnailGeneratedAt = new Date("2026-05-13T00:00:00.000Z");

function getPageSize(page = {}) {
  return {
    heightPt: Number(page?.heightPt) || 842,
    widthPt: Number(page?.widthPt) || 595,
  };
}

function findThumbnailPage(renderedPages = []) {
  return (
    renderedPages.find((page) => page.type === "content" && !page.isOtherRoomPage) ||
    renderedPages.find((page) => page.type === "content") ||
    renderedPages.find((page) => !page.isCoverPage) ||
    renderedPages[0] ||
    null
  );
}

function renderThumbnailDocument({ pageHtml, pageSize, template }) {
  const widthPt = Number(pageSize?.widthPt) || 595;
  const heightPt = Number(pageSize?.heightPt) || 842;
  const thumbnailStyles = `
    html,
    body {
      background: transparent !important;
      height: ${heightPt}pt;
      margin: 0 !important;
      overflow: hidden;
      padding: 0 !important;
      width: ${widthPt}pt;
    }

    .preview-document {
      display: block;
      gap: 0;
      height: ${heightPt}pt;
      justify-content: initial;
      margin: 0;
      padding: 0;
      width: ${widthPt}pt;
    }

    .preview-page {
      box-shadow: none !important;
      margin: 0;
    }
  `;

  return `
    <!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(template?.name || "썸네일")}</title>
        <style>${getPreviewDocumentStyles(template)}</style>
        <style>${thumbnailStyles}</style>
      </head>
      <body>
        <main class="preview-document">${pageHtml}</main>
      </body>
    </html>
  `;
}

function renderTemplateContentThumbnail(template, options = {}) {
  if (!template?.layout) {
    return null;
  }

  const layoutSampleData =
    template.layout?.dataTagSettings && typeof template.layout.dataTagSettings === "object"
      ? template.layout.dataTagSettings.sampleData
      : {};
  const hasOptionSampleData =
    options.sampleData &&
    typeof options.sampleData === "object" &&
    !Array.isArray(options.sampleData) &&
    Object.keys(options.sampleData).length > 0;
  const sampleData = hasOptionSampleData ? options.sampleData : layoutSampleData || {};
  const parts = renderPreviewDocumentParts({
    candidates: Array.isArray(options.candidates) && options.candidates.length
      ? options.candidates
      : buildPreviewSampleCandidates(sampleData, previewSampleCandidateCount),
    emptyValueData: options.emptyValueData || null,
    generatedAt: options.generatedAt || thumbnailGeneratedAt,
    sampleData,
    schoolSettings: options.schoolSettings || {},
    template,
  });
  const thumbnailPage = findThumbnailPage(parts.pages);

  if (!thumbnailPage) {
    return null;
  }

  const pageSize = getPageSize(thumbnailPage.page);

  return {
    heightPt: pageSize.heightPt,
    html: renderThumbnailDocument({
      pageHtml: thumbnailPage.html,
      pageSize,
      template,
    }),
    sourcePageId: String(thumbnailPage.page?.id || ""),
    sourcePageNumber: Number(thumbnailPage.pageNumber) || 0,
    widthPt: pageSize.widthPt,
  };
}

module.exports = {
  findThumbnailPage,
  renderTemplateContentThumbnail,
};
