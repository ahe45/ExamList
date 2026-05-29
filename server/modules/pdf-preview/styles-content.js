function getPreviewContentStyles() {
  return `
    .preview-document-body h1,
    .preview-document-body h2,
    .preview-document-body h3,
    .preview-document-body p,
    .preview-document-body ul,
    .preview-document-body ol,
    .preview-document-body table,
    .preview-document-body blockquote,
    .preview-document-body figure {
      margin: 0 0 1pt;
    }

    .preview-document-body .template-doc > div:not([data-candidate-block-grid], .examlist-candidate-block-grid, .preview-candidate-block-grid) {
      margin: 0 0 1pt;
    }

    .preview-document-body h1 {
      font-size: 20pt;
      font-weight: 800;
    }

    .preview-document-body h2 {
      font-size: 16pt;
      font-weight: 800;
    }

    .preview-document-body h3 {
      font-size: 14pt;
      font-weight: 700;
    }

    .preview-document-body ul,
    .preview-document-body ol {
      padding-left: 22pt;
    }

    .preview-document-body blockquote {
      background: rgba(238, 243, 251, 0.8);
      border-left: 4pt solid rgba(40, 88, 184, 0.5);
      border-radius: 12pt;
      padding: 12pt 16pt;
    }

    .preview-document-body hr {
      border: 0;
      border-top: 1pt solid rgba(81, 101, 133, 0.35);
      margin: 20pt 0;
    }

    .preview-document-body table {
      border-collapse: collapse;
      table-layout: fixed;
      width: 100%;
    }

    .preview-document-body .template-doc {
      box-sizing: border-box;
      min-height: 100%;
      position: relative;
    }

    .preview-empty-data-fallback,
    .preview-sample-data-fallback {
      color: #bfbfbf !important;
    }

    .preview-document-body .template-data-fit,
    .preview-candidate-block .template-data-fit,
    .preview-table .template-data-fit {
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .preview-document-body td.preview-data-fit-cell,
    .preview-document-body th.preview-data-fit-cell,
    .preview-candidate-block td.preview-data-fit-cell,
    .preview-candidate-block th.preview-data-fit-cell,
    .preview-table td.preview-data-fit-cell,
    .preview-table th.preview-data-fit-cell {
      overflow: hidden;
    }

    .preview-photo-empty-fallback,
    .preview-photo-sample-fallback {
      align-items: center;
      display: flex;
      font-weight: 700;
      height: 100%;
      justify-content: center;
      line-height: 1.2;
      width: 100%;
    }

    .preview-candidate-block-grid {
      display: grid;
      margin: 0;
      width: 100%;
    }

    .preview-candidate-block {
      box-sizing: border-box;
      line-height: calc(1em + 1pt);
      min-height: 15pt;
      overflow: hidden;
    }

    .preview-candidate-block-grid.is-candidate-block-zero-gap-x .preview-candidate-block,
    .preview-candidate-block-grid.is-candidate-block-zero-gap-y .preview-candidate-block {
      clip-path: inset(-1pt);
      overflow: visible;
    }

    .preview-candidate-block-grid.is-candidate-block-zero-gap-x .preview-candidate-block table {
      max-width: none !important;
      width: 100% !important;
    }

    .preview-candidate-block-grid.is-candidate-block-zero-gap-y .preview-candidate-block table {
      height: 100% !important;
      max-height: none !important;
    }

    .preview-candidate-block-grid.is-candidate-block-zero-gap-x .preview-candidate-block:not([data-candidate-block-grid-column="1"]) table,
    .preview-candidate-block-grid.is-candidate-block-zero-gap-x .preview-candidate-block:not([data-candidate-block-grid-column="1"]) table th:first-child,
    .preview-candidate-block-grid.is-candidate-block-zero-gap-x .preview-candidate-block:not([data-candidate-block-grid-column="1"]) table td:first-child {
      border-left-width: 0 !important;
    }

    .preview-candidate-block-grid.is-candidate-block-zero-gap-y .preview-candidate-block:not([data-candidate-block-grid-row="1"]) table,
    .preview-candidate-block-grid.is-candidate-block-zero-gap-y .preview-candidate-block:not([data-candidate-block-grid-row="1"]) table tr:first-child th,
    .preview-candidate-block-grid.is-candidate-block-zero-gap-y .preview-candidate-block:not([data-candidate-block-grid-row="1"]) table tr:first-child td {
      border-top-width: 0 !important;
    }

    .preview-candidate-block p,
    .preview-candidate-block h1,
    .preview-candidate-block h2,
    .preview-candidate-block h3,
    .preview-candidate-block div,
    .preview-candidate-block li,
    .preview-candidate-block blockquote,
    .preview-candidate-block table th,
    .preview-candidate-block table td {
      line-height: calc(1em + 1pt);
    }

    .preview-candidate-block > :first-child {
      margin-top: 0;
    }

    .preview-candidate-block > :last-child {
      margin-bottom: 0;
    }

    .preview-candidate-block table {
      box-sizing: border-box;
      margin: 0;
      max-height: 100%;
      max-width: 100%;
      min-height: 0;
      min-width: 0;
      table-layout: fixed;
    }

    .preview-candidate-block table th,
    .preview-candidate-block table td {
      min-height: 0;
      min-width: 0;
      overflow: hidden;
    }

    .preview-document-body th,
    .preview-document-body td {
      border: 1pt solid rgba(154, 169, 191, 0.9);
      padding: 8pt 10pt;
      vertical-align: top;
    }

    .preview-document-body th {
      background: rgba(238, 243, 251, 0.92);
      font-weight: 800;
    }

    .preview-document-body .editor-document-signature-box {
      align-items: center;
      border: 1pt dashed rgba(81, 101, 133, 0.68);
      border-radius: 18pt;
      display: grid;
      gap: 8pt;
      justify-items: center;
      max-width: 260pt;
      padding: 20pt;
      text-align: center;
    }

    .preview-document-body .editor-document-signature-box figcaption {
      color: #69788f;
      font-size: 10pt;
    }

    .preview-document-figure-image {
      align-items: center;
      background: linear-gradient(180deg, rgba(230, 238, 248, 0.9), rgba(244, 247, 252, 0.95));
      border: 1pt dashed rgba(81, 101, 133, 0.52);
      border-radius: 18pt;
      display: flex;
      justify-content: center;
      min-height: 124pt;
      overflow: hidden;
      padding: 18pt;
    }

    .preview-document-figure-image.placeholder {
      color: #516585;
      font-weight: 700;
    }

    .preview-document-image {
      display: block;
      height: auto;
      max-width: 100%;
    }

    .preview-document-body .template-generated-object {
      background: #ffffff;
      max-width: none;
    }

    .preview-document-body .template-generated-object-barcode {
      object-fit: fill;
    }

    .preview-document-body .template-generated-object-qrcode {
      object-fit: fill;
    }
  `;
}

module.exports = {
  getPreviewContentStyles,
};
