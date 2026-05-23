function getPreviewElementStyles() {
  return `
    .preview-element {
      position: absolute;
    }

    .preview-text {
      align-items: flex-start;
      display: flex;
      white-space: pre-wrap;
    }

    .preview-image-wrap {
      align-items: center;
      background: rgba(239, 244, 255, 0.48);
      border: 1px solid rgba(144, 163, 199, 0.48);
      display: flex;
      justify-content: center;
      overflow: hidden;
    }

    .preview-image {
      display: block;
      height: 100%;
      width: 100%;
    }

    .preview-image-placeholder {
      align-items: center;
      color: #50627e;
      display: inline-flex;
      flex-direction: column;
      font-size: 8pt;
      gap: 3pt;
      justify-content: center;
      line-height: 1.2;
      padding: 8pt;
      text-align: center;
    }

    .preview-line-wrap {
      overflow: visible;
    }

    .preview-line-svg {
      display: block;
      height: 100%;
      overflow: visible;
      width: 100%;
    }

    .preview-shape {
      align-items: center;
      display: flex;
      justify-content: center;
      line-height: 1.3;
      overflow: hidden;
      padding: 8pt;
    }

    .preview-shape-ellipse {
      border-radius: 999pt !important;
    }

    .preview-shape-label {
      display: inline-block;
      max-width: 100%;
      overflow-wrap: anywhere;
    }

    .preview-checkbox-element {
      align-items: center;
      display: flex;
      gap: 8pt;
      justify-content: flex-start;
    }

    .preview-checkbox-box {
      align-items: center;
      display: inline-flex;
      flex: 0 0 auto;
      height: 16pt;
      justify-content: center;
      width: 16pt;
    }

    .preview-checkbox-box.checked {
      font-weight: 800;
    }

    .preview-checkbox-label {
      flex: 1 1 auto;
      min-width: 0;
    }

    .preview-signature-box {
      display: grid;
      gap: 6pt;
      grid-template-rows: auto 1fr;
      padding: 10pt 12pt;
    }

    .preview-signature-label {
      color: #2c4166;
      font-size: 9pt;
    }

    .preview-signature-placeholder {
      align-items: center;
      color: #657896;
      display: flex;
      justify-content: center;
      min-height: 100%;
    }

    .preview-table-wrap {
      overflow: hidden;
    }

    .preview-table {
      border-collapse: collapse;
      height: 100%;
      table-layout: fixed;
      width: 100%;
    }

    .preview-table thead th {
      background: #eff4ff;
      border: 1px solid #90a3c7;
      font-size: 9pt;
      font-weight: 700;
      height: 28pt;
      padding: 6pt 4pt;
    }

    .preview-table tbody td {
      border: 1px solid #9eabc2;
      font-size: 8.8pt;
      padding: 4pt;
      vertical-align: middle;
    }

    .preview-table tbody td.preview-photo-token-cell,
    .preview-table tbody td:has(.preview-photo-fit-frame),
    .preview-document-body td:has(.preview-photo-fit-frame),
    .preview-document-body th:has(.preview-photo-fit-frame) {
      line-height: 0;
      overflow: hidden;
      text-align: center;
      vertical-align: middle;
    }

    .preview-photo-fit-frame {
      align-items: center;
      display: flex;
      height: 100%;
      justify-content: center;
      line-height: 0;
      min-height: 0;
      width: 100%;
    }

    .preview-photo-placeholder {
      align-items: center;
      color: #50627e;
      flex-direction: column;
      font-size: 7.2pt;
      gap: 2pt;
      line-height: 1.2;
      min-height: 48pt;
    }

    .preview-photo-image {
      display: block;
      height: auto;
      margin: 0 auto;
      max-height: 100%;
      max-width: 100%;
      object-fit: contain;
      width: auto;
    }

    .preview-photo-token-cell .preview-photo-image,
    .preview-table tbody td:has(.preview-photo-fit-frame) .preview-photo-image,
    .preview-document-body td:has(.preview-photo-fit-frame) .preview-photo-image,
    .preview-document-body th:has(.preview-photo-fit-frame) .preview-photo-image {
      height: 100%;
      width: 100%;
    }

    .preview-checkbox {
      display: inline-block;
      font-size: 12pt;
      line-height: 1;
    }
  `;
}

module.exports = {
  getPreviewElementStyles,
};
