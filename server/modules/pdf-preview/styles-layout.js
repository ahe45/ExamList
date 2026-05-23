function getPreviewLayoutStyles() {
  return `
    :root {
      color-scheme: light;
    }

    * {
      box-sizing: border-box;
    }

    body {
      background: #cfd7e5;
      color: #102445;
      font-family: "Noto Sans KR", "Malgun Gothic", sans-serif;
      margin: 0;
      padding: 24px;
    }

    .preview-document {
      display: grid;
      gap: 24px;
      justify-content: center;
    }

    .preview-page {
      background: #fff;
      box-shadow: 0 24px 48px rgba(13, 24, 42, 0.18);
      overflow: hidden;
      position: relative;
    }

    .preview-document-body {
      box-sizing: border-box;
      color: #102445;
      font-family: "Noto Sans KR", "Malgun Gothic", sans-serif;
      font-size: 11pt;
      height: 100%;
      line-height: calc(1em + 1pt);
      min-height: 100%;
      overflow: hidden;
      padding: 28.35pt;
      width: 100%;
      word-break: break-word;
    }

    .preview-recognition-marks {
      inset: 0;
      pointer-events: none;
      position: absolute;
      z-index: 50;
    }

    .preview-recognition-mark {
      background: #000000;
      display: block;
      position: absolute;
    }

    .preview-page-number {
      bottom: 10pt;
      color: #102445;
      font-size: 10pt;
      font-weight: 700;
      left: 0;
      line-height: 1;
      pointer-events: none;
      position: absolute;
      right: 0;
      text-align: center;
      z-index: 60;
    }

    .preview-document-body > :first-child {
      margin-top: 0;
    }

    .preview-document-body > :last-child {
      margin-bottom: 0;
    }
  `;
}

module.exports = {
  getPreviewLayoutStyles,
};
