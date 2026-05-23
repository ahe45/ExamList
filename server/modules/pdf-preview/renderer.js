const { buildPreviewPages, getCandidateBlockGridConfig } = require("./pagination");
const { getPreviewDataFitScript } = require("./data-fit-script");
const { renderPageElement } = require("./elements");
const { getPreviewDocumentStyles } = require("./styles");
const { escapeHtml } = require("./renderer-html-utils");
const { renderDocumentPage } = require("./renderer-document-page");
const { isCoverPage, renderPageNumberSetting, renderRecognitionMarks } = require("./renderer-page-settings");
const { buildRoomTokenMap, createRoomAssignmentCountMap } = require("./room-context");
const {
  buildCandidateTokenMap,
  buildSchoolTokenMap,
  formatDateTimeValue,
  formatDateValue,
  replaceTemplateTokens,
} = require("./tokens");

function createBaseContext({
  candidates,
  emptyValueData = {},
  generatedAt,
  pageNumber,
  representativeCandidate,
  roomAssignmentCountMap,
  sampleData = {},
  schoolSettings = {},
  templateName = "",
  isOtherRoomPage = false,
  totalPages,
}) {
  const candidate = representativeCandidate || {};
  const school = buildSchoolTokenMap(schoolSettings);
  const candidateAdmissionYear = String(candidate.admissionYear || formatDateValue(candidate.examDate, "-").slice(0, 4) || "");
  const resolvedRoomAssignmentCountMap =
    roomAssignmentCountMap instanceof Map ? roomAssignmentCountMap : createRoomAssignmentCountMap(candidates);

  return {
    __emptyValueData: emptyValueData && typeof emptyValueData === "object" && !Array.isArray(emptyValueData) ? emptyValueData : {},
    __isOtherRoomPage: isOtherRoomPage === true,
    __sampleData: sampleData && typeof sampleData === "object" && !Array.isArray(sampleData) ? sampleData : {},
    __sampleFallbackForEmptyDataTags: isOtherRoomPage === true,
    __styleEmptyValueFallback: isOtherRoomPage !== true,
    _roomAssignmentCountMap: resolvedRoomAssignmentCountMap,
    admission: {
      typeName: String(candidate.admissionTypeName || ""),
      unitName: String(candidate.majorName || candidate.departmentName || ""),
      year: school.year || candidateAdmissionYear,
    },
    candidate: buildCandidateTokenMap(candidate, school),
    document: {
      generatedAt: formatDateTimeValue(generatedAt),
      templateName: String(templateName || ""),
      totalCandidates: Array.isArray(candidates) ? candidates.length : 0,
      unitName: String(candidate.roomName || candidate.examName || candidate.admissionTypeName || ""),
    },
    exam: {
      date: formatDateValue(candidate.examDate),
      endTime: String(candidate.examEndTime || candidate.endTime || ""),
      name: String(candidate.examName || ""),
      startTime: String(candidate.examStartTime || candidate.time || ""),
    },
    page: {
      current: pageNumber,
      total: totalPages,
    },
    room: {
      ...buildRoomTokenMap(candidate, resolvedRoomAssignmentCountMap),
      otherRoom: isOtherRoomPage === true ? "타고사실" : "",
    },
    row: {
      index: "",
      indexInPage: "",
      indexInUnit: "",
    },
    school,
  };
}

function getTemplateDataTagSettings(template = {}) {
  return template?.layout?.dataTagSettings && typeof template.layout.dataTagSettings === "object"
    ? template.layout.dataTagSettings
    : {};
}

function renderPreviewDocumentParts({ candidates, emptyValueData = null, generatedAt, sampleData = null, schoolSettings = {}, template }) {
  const previewPages = buildPreviewPages(template?.layout, candidates);
  const totalPages = previewPages.length;
  const dataTagSettings = getTemplateDataTagSettings(template);
  const resolvedSampleData =
    sampleData && typeof sampleData === "object" && !Array.isArray(sampleData)
      ? sampleData
      : dataTagSettings.sampleData || {};
  const resolvedEmptyValueData =
    emptyValueData && typeof emptyValueData === "object" && !Array.isArray(emptyValueData)
      ? emptyValueData
      : dataTagSettings.emptyValueData || resolvedSampleData;
  const pageNumberByIndex = new Map();
  const roomAssignmentCountMap = createRoomAssignmentCountMap(candidates);
  let totalNumberedPages = 0;

  previewPages.forEach((pageInstance, index) => {
    if (isCoverPage(pageInstance.page)) {
      return;
    }

    totalNumberedPages += 1;
    pageNumberByIndex.set(index, totalNumberedPages);
  });

  const pages = previewPages
    .map((pageInstance, index) => {
      const representativeCandidate = pageInstance.representativeCandidate || pageInstance.rows[0] || candidates[0] || null;
      const page = pageInstance.page;
      const baseContext = createBaseContext({
        candidates,
        emptyValueData: resolvedEmptyValueData,
        generatedAt,
        isOtherRoomPage: pageInstance.isOtherRoomPage,
        pageNumber: pageNumberByIndex.get(index) || 0,
        representativeCandidate,
        roomAssignmentCountMap,
        sampleData: resolvedSampleData,
        schoolSettings,
        templateName: template?.name || "",
        totalPages: totalNumberedPages,
      });
      const hasDocumentHtml =
        Boolean(String(page?.settings?.documentHtml || "").trim()) ||
        String(page?.settings?.editorMode || "").trim() === "document" ||
        Boolean(getCandidateBlockGridConfig(page));
      const elements = Array.isArray(page?.elements)
        ? [...page.elements].sort((left, right) => (Number(left.zIndex) || 0) - (Number(right.zIndex) || 0))
        : [];

      const html = `
        <section
          class="preview-page ${hasDocumentHtml ? "preview-page-document" : ""}"
          style="width:${Number(page?.widthPt) || 595}pt;height:${Number(page?.heightPt) || 842}pt;"
        >
          ${renderRecognitionMarks(page)}
          ${
            hasDocumentHtml
              ? renderDocumentPage(page, pageInstance, baseContext)
              : elements.map((element) => renderPageElement(element, pageInstance, baseContext, page)).join("")
          }
          ${renderPageNumberSetting(page, baseContext)}
        </section>
      `;

      return {
        html,
        isCoverPage: isCoverPage(page),
        isOtherRoomPage: pageInstance.isOtherRoomPage === true,
        page,
        pageIndex: index,
        pageNumber: pageNumberByIndex.get(index) || 0,
        type: String(page?.type || "").trim(),
      };
    });

  return {
    pageCount: totalPages,
    pages,
    totalNumberedPages,
  };
}

function renderPreviewHtmlDocument({ bodyHtml, template }) {
  return `
      <!DOCTYPE html>
      <html lang="ko">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(template?.name || "미리보기")}</title>
          <style>${getPreviewDocumentStyles(template)}</style>
        </head>
        <body>
          <main class="preview-document">${bodyHtml}</main>
          ${getPreviewDataFitScript()}
        </body>
      </html>
    `;
}

function renderPreviewDocument(options = {}) {
  const parts = renderPreviewDocumentParts(options);
  const html = parts.pages.map((page) => page.html).join("");

  return {
    html: renderPreviewHtmlDocument({
      bodyHtml: html,
      template: options.template,
    }),
    pageCount: parts.pageCount,
    pages: parts.pages,
  };
}

module.exports = {
  createBaseContext,
  buildPreviewPages,
  replaceTemplateTokens,
  renderPreviewDocument,
  renderPreviewDocumentParts,
  renderPreviewHtmlDocument,
};
