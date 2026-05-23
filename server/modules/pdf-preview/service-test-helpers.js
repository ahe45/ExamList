const { normalizeTemplateLayout } = require("../pdf-templates/layout");

function createHttpError(statusCode, message, errorCode = "") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}

function createTemplateWithTable(columns) {
  return {
    description: "미리보기 서비스 테스트",
    generationUnit: "room",
    id: "template-preview-service-test",
    layout: normalizeTemplateLayout(
      {
        pages: [
          {
            elements: [
              {
                config: {
                  columns,
                  pagination: {
                    fillEmptyRows: true,
                    headerHeight: 24,
                    repeatHeader: true,
                    rowHeight: 28,
                  },
                },
                height: 120,
                type: "table",
                width: 320,
                x: 40,
                y: 80,
              },
            ],
            repeatable: true,
            type: "content",
          },
        ],
      },
      {
        description: "미리보기 서비스 테스트",
        generationUnit: "room",
        name: "미리보기 서비스 테스트 템플릿",
        orientation: "portrait",
        paperPreset: "A4",
      },
      "template-preview-service-test",
    ),
    name: "미리보기 서비스 테스트 템플릿",
    orientation: "portrait",
    paperPreset: "A4",
  };
}

function createTemplateWithCandidatePhoto() {
  return {
    description: "미리보기 서비스 테스트",
    generationUnit: "room",
    id: "template-preview-service-photo-element",
    layout: normalizeTemplateLayout(
      {
        pages: [
          {
            elements: [
              {
                height: 128,
                type: "candidatePhoto",
                width: 96,
                x: 40,
                y: 40,
              },
            ],
            type: "content",
          },
        ],
      },
      {
        description: "미리보기 서비스 테스트",
        generationUnit: "room",
        name: "미리보기 서비스 테스트 템플릿",
        orientation: "portrait",
        paperPreset: "A4",
      },
      "template-preview-service-photo-element",
    ),
    name: "미리보기 서비스 테스트 템플릿",
    orientation: "portrait",
    paperPreset: "A4",
  };
}

function createTemplateWithDocumentPhoto() {
  return {
    description: "미리보기 서비스 테스트",
    generationUnit: "room",
    id: "template-preview-service-document-photo",
    layout: normalizeTemplateLayout(
      {
        pages: [
          {
            settings: {
              documentHtml:
                '<p>수험생 사진</p><figure class="editor-document-image-placeholder" data-image-src="{{candidate.photoUrl}}"><span>수험생 사진</span></figure>',
            },
            type: "content",
          },
        ],
      },
      {
        description: "미리보기 서비스 테스트",
        generationUnit: "room",
        name: "미리보기 서비스 테스트 템플릿",
        orientation: "portrait",
        paperPreset: "A4",
      },
      "template-preview-service-document-photo",
    ),
    name: "미리보기 서비스 테스트 템플릿",
    orientation: "portrait",
    paperPreset: "A4",
  };
}

module.exports = {
  createHttpError,
  createTemplateWithCandidatePhoto,
  createTemplateWithDocumentPhoto,
  createTemplateWithTable,
};
