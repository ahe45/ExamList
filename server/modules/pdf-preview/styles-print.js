const previewPageSizeByPreset = Object.freeze({
  A3: "A3",
  A4: "A4",
  B4: "B4",
  B5: "B5",
  Legal: "Legal",
  Letter: "Letter",
});

function normalizePreviewPrintOrientation(value) {
  return String(value || "").trim().toLowerCase() === "landscape" ? "landscape" : "portrait";
}

function getPreviewPrintPageCss(template = {}) {
  const paper = template?.layout?.paper && typeof template.layout.paper === "object" ? template.layout.paper : {};
  const preset = String(template?.paperPreset || paper.preset || "A4").trim();
  const pageSize = previewPageSizeByPreset[preset] || "A4";
  const orientation = normalizePreviewPrintOrientation(template?.orientation || paper.orientation);

  return `@page { size: ${pageSize} ${orientation}; margin: 0; }`;
}

function getPreviewPrintStyles(template = {}) {
  return `
    ${getPreviewPrintPageCss(template)}

    @media print {
      body {
        background: #fff;
        padding: 0;
      }

      .preview-document {
        gap: 0;
      }

      .preview-page {
        box-shadow: none;
        page-break-after: always;
      }
    }
  `;
}

module.exports = {
  getPreviewPrintStyles,
};
