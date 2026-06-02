const test = require("node:test");
const assert = require("node:assert/strict");

const { createTemplate, normalizeTemplateLayout, renderPreviewDocument } = require("./renderer-test-helpers");

test("renderPreviewDocument renders freeform document html and strips unsafe markup", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          settings: {
            pageNumber: {
              enabled: true,
              preset: "pageCurrentTotal",
            },
            documentHtml: "<p>표지</p>",
          },
          type: "cover",
        },
        {
          settings: {
            safeArea: {
              bottom: 20,
              left: 36,
              right: 24,
              top: 12,
            },
            recognitionMarks: {
              enabled: true,
              offsetXPt: 20,
              offsetYPt: 30,
              sizePt: 12,
            },
            pageNumber: {
              enabled: true,
              position: "right",
              preset: "numericCurrentTotal",
            },
            documentHtml: [
              "<h1>{{candidate.name}}</h1>",
              '<p><span class="template-token" data-template-tag-value="candidate.examNo">#candidate.examNo</span></p>',
              '<p><span class="template-token emphasized-token" contenteditable="false" data-template-token="true" spellcheck="false" data-template-tag-value="candidate.examNo" style="font-size:14pt;font-weight:700;color:#123456;background-color:#fff59d;text-decoration:underline;">#candidate.examNo</span></p>',
              '<p><span class="template-token" contenteditable="false" data-template-token="true" spellcheck="false" data-template-tag-value="candidate.name"><span style="font-size:18pt;color:#dc2626;background-color:#fef08a;">#이름</span></span></p>',
              '<p><span class="template-token" data-template-tag-value="candidate.photo">#수험생 사진</span></p>',
              '<p><img class="template-generated-object template-generated-object-barcode" data-template-object-type="barcode" data-template-object-source="candidate.examNo" src="" alt="바코드" /></p>',
              '<p><img class="template-generated-object template-generated-object-qrcode" data-template-object-type="qrcode" data-template-object-source="candidate.name" src="" alt="QR코드" /></p>',
              '<p style="text-align:center;">{{exam.name}} / {{room.name}}</p>',
              '<figure class="editor-document-image-placeholder" data-image-src="{{candidate.photoUrl}}"><span>수험생 사진</span></figure>',
              "<script>alert('x')</script>",
              '<p onclick="alert(1)">안전한 본문</p>',
            ].join(""),
          },
          type: "content",
        },
      ],
    },
    {
      description: "미리보기 테스트",
      generationUnit: "room",
      name: "문서형 미리보기 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-document-html",
  );
  const result = renderPreviewDocument({
    candidates: [
      {
        examNo: "26010001",
        examName: "면접고사",
        name: "홍길동",
        photoUrl: "data:image/png;base64,ZmFrZQ==",
        roomName: "101호",
      },
    ],
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    template: createTemplate(layout),
  });

  const pageNumberMatches = result.html.match(/class="preview-page-number"/g) || [];

  assert.match(result.html, /preview-document-body/);
  assert.match(result.html, /ExamListPreviewDataFit/);
  assert.match(result.html, /@page \{ size: A4 portrait; margin: 0; \}/);
  assert.match(result.html, /\.preview-document-body \{[\s\S]*font-family: "Noto Sans KR", "Malgun Gothic", sans-serif;[\s\S]*font-size: 11pt;/);
  assert.match(result.html, /\.preview-document-body \.template-data-fit,[\s\S]*overflow-wrap: anywhere;/);
  assert.match(result.html, /preview-recognition-marks/);
  assert.equal(pageNumberMatches.length, 1);
  assert.match(result.html, />1\/1</);
  assert.match(result.html, /class="preview-page-number" style="left:64\.35pt;right:52\.35pt;text-align:right;"/);
  assert.match(result.html, /width:12pt;height:12pt;left:20pt;top:30pt;/);
  assert.match(result.html, /width:12pt;height:12pt;right:20pt;bottom:30pt;/);
  assert.match(result.html, /style="padding: 12pt 24pt 20pt 36pt;"/);
  assert.match(result.html, /홍길동/);
  assert.match(result.html, /26010001/);
  assert.match(
    result.html,
    /<span\b(?=[^>]*class="emphasized-token")(?=[^>]*style="font-size:14pt;font-weight:700;color:#123456;background-color:#fff59d;text-decoration:underline;")[^>]*><span class="template-data-fit" data-template-data-fit="true">26010001<\/span><\/span>/,
  );
  assert.match(
    result.html,
    /<span><span style="font-size:18pt;color:#dc2626;background-color:#fef08a;"><span class="template-data-fit" data-template-data-fit="true">홍길동<\/span><\/span><\/span>/,
  );
  assert.doesNotMatch(result.html, /#이름/);
  assert.doesNotMatch(result.html, /data-template-tag-value="candidate\.examNo"/);
  assert.doesNotMatch(result.html, /contenteditable="false"/);
  assert.match(result.html, /title="이름 QR코드"/);
  assert.match(result.html, /면접고사 \/ 101호/);
  assert.match(result.html, /data:image\/svg\+xml/);
  assert.match(result.html, /preview-photo-image/);
  assert.match(result.html, /preview-document-image/);
  assert.match(result.html, /data:image\/png;base64,ZmFrZQ==/);
  assert.doesNotMatch(result.html, /<script[^>]*>\s*alert/i);
  assert.doesNotMatch(result.html, /onclick=/i);
});

test("renderPreviewDocument fits data tag text inside fixed table cell heights", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          settings: {
            documentHtml: [
              '<table style="width:180pt;">',
              "<tbody>",
              '<tr style="height:18pt;">',
              '<td style="height:18pt;padding:2pt 4pt;">',
              '<span class="template-token" data-template-tag-value="candidate.departmentName">#모집단위명</span>',
              "</td>",
              "</tr>",
              "</tbody>",
              "</table>",
            ].join(""),
          },
          type: "content",
        },
      ],
    },
    {
      description: "미리보기 테스트",
      generationUnit: "room",
      name: "데이터태그 셀 맞춤 테스트",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-data-fit-table-cell",
  );
  const result = renderPreviewDocument({
    candidates: [
      {
        departmentName: "아주 긴 모집단위명 데이터가 표 셀 높이를 늘리지 않도록 축소되어야 합니다",
        roomName: "101호",
      },
    ],
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    template: createTemplate(layout),
  });

  assert.match(result.html, /data-template-data-fit="true">아주 긴 모집단위명 데이터/);
  assert.match(result.html, /function fitCell\(cell\)/);
  assert.match(result.html, /cell\.style\.height = formatPx\(targetHeightPx\)/);
  assert.match(result.html, /minimumFontSizePx = 5/);
});

test("renderPreviewDocument appends other room content page for room generation", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          settings: {
            pageNumber: {
              enabled: true,
              preset: "numericCurrentTotal",
            },
            otherRoomPage: {
              enabled: true,
            },
            documentHtml: [
              '<p class="candidate-name"><span class="template-token" data-template-tag-value="candidate.name">#이름</span></p>',
              '<p class="other-room"><span class="template-token" data-template-tag-value="room.otherRoom">#타고사실</span></p>',
            ].join(""),
          },
          type: "content",
        },
      ],
    },
    {
      description: "미리보기 테스트",
      generationUnit: "room",
      name: "타 고사실 페이지 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-other-room-page",
  );
  const result = renderPreviewDocument({
    candidates: [
      {
        name: "홍길동",
        roomName: "101호",
      },
    ],
    emptyValueData: {
      "candidate.name": "빈 이름",
      "room.otherRoom": "빈 타고사실",
    },
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    sampleData: {
      "room.otherRoom": "샘플 타고사실",
    },
    template: createTemplate(layout),
  });

  const pageMatches = result.html.match(/class="preview-page /g) || [];
  const otherRoomPageHtml = result.pages[1]?.html || "";

  assert.equal(result.pageCount, 2);
  assert.equal(pageMatches.length, 2);
  assert.match(result.html, /홍길동/);
  assert.match(otherRoomPageHtml, /홍길동/);
  assert.doesNotMatch(otherRoomPageHtml, /빈 이름/);
  assert.match(result.html, /타고사실/);
  assert.doesNotMatch(result.html, /샘플 타고사실/);
  assert.match(result.html, />1\/2</);
  assert.match(result.html, />2\/2</);
  assert.doesNotMatch(otherRoomPageHtml, /preview-empty-data-fallback[^>]*>홍길동/);
});

test("renderPreviewDocument appends other room content page for custom unit containing room", () => {
  const layout = normalizeTemplateLayout(
    {
      generation: {
        unit: "custom",
        unitFields: ["date", "periodCode", "roomCode"],
      },
      pages: [
        {
          settings: {
            pageNumber: {
              enabled: true,
              preset: "numericCurrentTotal",
            },
            otherRoomPage: {
              enabled: true,
            },
            documentHtml:
              '<p><span class="template-token" data-template-tag-value="candidate.name">#이름</span> <span class="template-token" data-template-tag-value="room.otherRoom">#타고사실</span></p>',
          },
          type: "content",
        },
      ],
    },
    {
      description: "미리보기 테스트",
      generationUnit: "custom",
      name: "사용자 지정 생성 단위 타 고사실 페이지 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-other-room-page-custom-room",
  );
  const result = renderPreviewDocument({
    candidates: [
      {
        examDate: "2026-04-20",
        name: "홍길동",
        periodCode: "P1",
        roomCode: "R101",
        roomName: "101호",
      },
    ],
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    template: {
      ...createTemplate(layout),
      generationUnit: "custom",
    },
  });

  assert.equal(result.pageCount, 2);
  assert.equal(result.pages[1]?.isOtherRoomPage, true);
  assert.match(result.html, /타고사실/);
  assert.match(result.html, />1\/2</);
  assert.match(result.html, />2\/2</);
});

test("renderPreviewDocument styles other room empty value fallbacks only inside candidate blocks", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          settings: {
            otherRoomPage: {
              enabled: true,
            },
            documentHtml: [
              '<p class="outside-token"><span class="template-token" data-template-tag-value="candidate.name">#이름</span></p>',
              '<p class="outside-barcode"><img class="template-generated-object template-generated-object-barcode" data-template-object-type="barcode" data-template-object-source="candidate.examNo" src="" alt="바코드" /></p>',
              '<div data-candidate-block-grid="true"></div>',
            ].join(""),
            editorMode: "document",
            candidateBlockGrid: {
              blockTemplateHtml:
                '<table><tbody><tr><td><span class="template-token" data-template-tag-value="candidate.name">#이름</span></td><td>{{candidate.examNo}}</td><td><img class="template-generated-object template-generated-object-barcode" data-template-object-type="barcode" data-template-object-source="candidate.examNo" src="" alt="바코드" /></td></tr></tbody></table>',
              columns: 1,
              enabled: true,
              emptyBlockLayer: {
                enabled: true,
                templateHtml: '<p>타고사실 빈 블록 레이어</p>',
              },
              fillEmptyBlocks: true,
              rows: 1,
              variant: "photo",
            },
          },
          type: "content",
        },
      ],
    },
    {
      description: "미리보기 테스트",
      generationUnit: "room",
      name: "타 고사실 데이터블록 스타일 테스트",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-other-room-fallback-style",
  );
  const result = renderPreviewDocument({
    candidates: [
      {
        examNo: "26010001",
        name: "홍길동",
        roomName: "101호",
      },
    ],
    emptyValueData: {
      "candidate.examNo": "빈 수험번호",
      "candidate.name": "빈 이름",
    },
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    template: createTemplate(layout),
  });

  const otherRoomPageHtml = result.pages[1]?.html || "";
  const outsideTokenIndex = otherRoomPageHtml.indexOf("outside-token");
  const blockTokenIndex = otherRoomPageHtml.indexOf("preview-candidate-block");
  const outsideTokenHtml = otherRoomPageHtml.slice(outsideTokenIndex, blockTokenIndex);
  const blockTokenHtml = otherRoomPageHtml.slice(blockTokenIndex);

  assert.equal(result.pageCount, 2);
  assert.match(outsideTokenHtml, /홍길동/);
  assert.match(outsideTokenHtml, /title="수험번호 바코드"/);
  assert.match(outsideTokenHtml, /template-generated-object-barcode/);
  assert.doesNotMatch(outsideTokenHtml, /preview-empty-data-fallback/);
  assert.doesNotMatch(otherRoomPageHtml, /타고사실 빈 블록 레이어/);
  assert.match(blockTokenHtml, /<span class="preview-empty-data-fallback">빈 이름<\/span>/);
  assert.match(blockTokenHtml, /<span class="preview-empty-data-fallback">빈 수험번호<\/span>/);
  assert.doesNotMatch(blockTokenHtml, /template-generated-object-barcode/);
});

test("renderPreviewDocument does not append other room page outside room generation", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          settings: {
            otherRoomPage: {
              enabled: true,
            },
            documentHtml: '<p><span class="template-token" data-template-tag-value="room.otherRoom">#타고사실</span></p>',
          },
          type: "content",
        },
      ],
    },
    {
      description: "미리보기 테스트",
      generationUnit: "exam",
      name: "타 고사실 페이지 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-other-room-page-exam",
  );
  const result = renderPreviewDocument({
    candidates: [
      {
        name: "홍길동",
        roomName: "101호",
      },
    ],
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    template: {
      ...createTemplate(layout),
      generationUnit: "exam",
    },
  });

  const pageMatches = result.html.match(/class="preview-page /g) || [];

  assert.equal(result.pageCount, 1);
  assert.equal(pageMatches.length, 1);
  assert.doesNotMatch(result.html, /타고사실<\/span>/);
});
