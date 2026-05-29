const test = require("node:test");
const assert = require("node:assert/strict");

const { createTemplate, normalizeTemplateLayout, renderPreviewDocument } = require("./renderer-test-helpers");

test("renderPreviewDocument repeats photo candidate block grid by page", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          elements: [
            {
              config: {
                content: "표지 {{room.name}} {{document.totalCandidates}}명",
              },
              height: 40,
              type: "dataText",
              width: 300,
              x: 48,
              y: 60,
            },
          ],
          type: "cover",
        },
        {
          repeatable: true,
          settings: {
            documentHtml: '<div class="template-doc"><h2>{{room.name}}</h2><div data-candidate-block-grid="true"></div></div>',
            editorMode: "document",
            candidateBlockGrid: {
              blockTemplateHtml:
                '<table><tbody><tr><td>{{row.indexInPage}}</td><td><span data-template-tag-value="candidate.name">#성명</span></td><td>{{candidate.examNo}}</td></tr></tbody></table>',
              columns: 2,
              enabled: true,
              rows: 2,
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
      name: "미리보기 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-block-grid-test",
  );
  const result = renderPreviewDocument({
    candidates: [
      { examNo: "26010001", name: "홍길동", roomName: "101호" },
      { examNo: "26010002", name: "김영희", roomName: "101호" },
      { examNo: "26010003", name: "박민수", roomName: "101호" },
      { examNo: "26010004", name: "이수진", roomName: "101호" },
      { examNo: "26010005", name: "최현우", roomName: "101호" },
    ],
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    schoolSettings: {
      academicYear: "2026",
      schoolName: "한국대학교",
    },
    template: createTemplate(layout),
  });

  assert.equal(result.pageCount, 3);
  assert.match(result.html, /preview-candidate-block-grid/);
  assert.match(result.html, /grid-auto-flow:column/);
  assert.match(result.html, /grid-template-columns:repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(result.html, /grid-template-rows:repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(result.html, /홍길동/);
  assert.match(result.html, /김영희/);
  assert.match(result.html, /박민수/);
  assert.match(result.html, /이수진/);
  assert.match(result.html, /최현우/);
  assert.match(result.html, /26010005/);
});

test("renderPreviewDocument places candidate block data column-first from the top left on every page", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          repeatable: true,
          settings: {
            documentHtml: '<div class="template-doc"><div data-candidate-block-grid="true"></div></div>',
            editorMode: "document",
            candidateBlockGrid: {
              blockTemplateHtml: "<p>{{candidate.examNo}}</p>",
              columns: 2,
              enabled: true,
              fillEmptyBlocks: true,
              rows: 10,
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
      name: "데이터블록 열 우선 배치 테스트",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-block-grid-column-order-test",
  );
  const result = renderPreviewDocument({
    candidates: Array.from({ length: 25 }, (_item, index) => ({
      examNo: `2601${String(index + 1).padStart(4, "0")}`,
      name: `수험생${index + 1}`,
      roomName: "101호",
    })),
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    template: createTemplate(layout),
  });

  const secondContentPageHtml = result.pages[1]?.html || "";

  assert.equal(result.pageCount, 2);
  assert.match(
    secondContentPageHtml,
    /data-candidate-block-index="1" style="grid-row:1;grid-column:1;">[\s\S]*26010021/,
  );
  assert.match(
    secondContentPageHtml,
    /data-candidate-block-index="5" style="grid-row:5;grid-column:1;">[\s\S]*26010025/,
  );
  assert.doesNotMatch(
    secondContentPageHtml,
    /data-candidate-block-index="11" style="grid-row:1;grid-column:2;">[\s\S]*26010021/,
  );
});

test("renderPreviewDocument preserves zero candidate block grid gaps", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          repeatable: true,
          settings: {
            documentHtml: '<div class="template-doc"><div data-candidate-block-grid="true"></div></div>',
            editorMode: "document",
            candidateBlockGrid: {
              blockTemplateHtml: "<p>{{candidate.examNo}}</p>",
              columns: 3,
              enabled: true,
              gapXPt: 0,
              gapYPt: 0,
              rows: 2,
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
      name: "데이터블록 간격 테스트",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-block-grid-zero-gap-test",
  );
  const result = renderPreviewDocument({
    candidates: [
      { examNo: "26010001", name: "홍길동", roomName: "101호" },
    ],
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    template: createTemplate(layout),
  });

  assert.match(result.html, /grid-template-columns:repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(result.html, /grid-template-rows:repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(result.html, /gap:0pt 0pt/);
  assert.match(result.html, /class="preview-candidate-block-grid is-candidate-block-zero-gap-x is-candidate-block-zero-gap-y"/);
  assert.match(
    result.html,
    /data-candidate-block-grid-row="1" data-candidate-block-grid-column="2" data-candidate-block-index="3" style="grid-row:1;grid-column:2;"/,
  );
  assert.match(result.html, /clip-path: inset\(-1pt\);/);
  assert.match(result.html, /overflow: visible;/);
  assert.match(result.html, /width: 100% !important;/);
  assert.match(result.html, /height: 100% !important;/);
  assert.match(result.html, /\.preview-candidate-block-grid\.is-candidate-block-zero-gap-x \.preview-candidate-block:not\(\[data-candidate-block-grid-column="1"\]\) table/);
  assert.match(result.html, /\.preview-candidate-block-grid\.is-candidate-block-zero-gap-y \.preview-candidate-block:not\(\[data-candidate-block-grid-row="1"\]\) table/);
  assert.match(result.html, /border-left-width: 0 !important;/);
  assert.match(result.html, /border-top-width: 0 !important;/);
});

test("renderPreviewDocument fits candidate photo token to candidate block table cell", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          repeatable: true,
          settings: {
            documentHtml: '<div class="template-doc"><div data-candidate-block-grid="true"></div></div>',
            editorMode: "document",
            candidateBlockGrid: {
              blockTemplateHtml:
                '<table><tbody><tr style="height:72pt;"><td style="padding:6pt 8pt;"><span data-template-tag-value="candidate.photo">#수험생 사진</span></td><td>{{candidate.name}}</td></tr></tbody></table>',
              columns: 1,
              enabled: true,
              heightPt: 96,
              rows: 1,
              variant: "photo",
              widthPt: 220,
            },
          },
          type: "content",
        },
      ],
    },
    {
      description: "미리보기 테스트",
      generationUnit: "room",
      name: "사진 데이터블록 테스트",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-block-grid-photo-fit-test",
  );
  const result = renderPreviewDocument({
    candidates: [
      {
        examNo: "26010001",
        name: "홍길동",
        photoUrl: "data:image/png;base64,ZmFrZQ==",
        roomName: "101호",
      },
    ],
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    template: createTemplate(layout),
  });

  assert.match(result.html, /preview-photo-fit-frame/);
  assert.match(result.html, /preview-photo-image/);
  assert.match(result.html, /object-fit: contain/);
  assert.match(result.html, /max-height: 100%/);
  assert.match(result.html, /max-width: 100%/);
  assert.doesNotMatch(result.html, /height: 52pt/);
  assert.doesNotMatch(result.html, /width: 40pt/);
  assert.doesNotMatch(result.html, /padding: 0 !important/);
});

test("renderPreviewDocument uses empty value data for empty candidate block values with fallback styling", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          repeatable: true,
          settings: {
            documentHtml: '<div class="template-doc"><div data-candidate-block-grid="true"></div></div>',
            editorMode: "document",
            candidateBlockGrid: {
              blockTemplateHtml:
                '<table><tbody><tr><td><span data-template-tag-value="candidate.name">#성명</span></td><td>{{candidate.examNo}}</td></tr><tr><td colspan="2">{{candidate.departmentName}}</td></tr></tbody></table>',
              columns: 2,
              enabled: true,
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
      name: "데이터블록 빈값대체 테스트",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-block-grid-sample-fallback-test",
  );
  const result = renderPreviewDocument({
    candidates: [
      {
        departmentName: "",
        examNo: "26010001",
        name: "",
        roomName: "101호",
      },
    ],
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    emptyValueData: {
      "candidate.departmentName": "빈 모집단위",
      "candidate.examNo": "빈 수험번호",
      "candidate.name": "빈 성명",
    },
    sampleData: {
      "candidate.departmentName": "모집단위",
      "candidate.examNo": "수험번호",
      "candidate.name": "성명",
    },
    template: createTemplate(layout),
  });

  const fallbackMatches = result.html.match(/preview-empty-data-fallback/g) || [];

  assert.match(result.html, /26010001/);
  assert.match(result.html, /<span class="preview-empty-data-fallback">빈 성명<\/span>/);
  assert.match(result.html, /<span class="preview-empty-data-fallback">빈 모집단위<\/span>/);
  assert.match(result.html, /<span class="preview-empty-data-fallback">빈 수험번호<\/span>/);
  assert.doesNotMatch(result.html, /<span class="preview-empty-data-fallback">성명<\/span>/);
  assert.match(result.html, /\.preview-empty-data-fallback,[\s\S]*\.preview-sample-data-fallback \{[\s\S]*color: #bfbfbf !important;/);
  assert.ok(fallbackMatches.length >= 3);
});

test("renderPreviewDocument uses candidate photo empty value text when block photo data is empty", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          repeatable: true,
          settings: {
            documentHtml: '<div class="template-doc"><div data-candidate-block-grid="true"></div></div>',
            editorMode: "document",
            candidateBlockGrid: {
              blockTemplateHtml:
                '<table><tbody><tr><td><span data-template-tag-value="candidate.photo">#수험생 사진</span></td><td>{{candidate.name}}</td></tr></tbody></table>',
              columns: 1,
              enabled: true,
              rows: 2,
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
      name: "사진 빈값대체 테스트",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-block-grid-photo-sample-fallback-test",
  );
  const result = renderPreviewDocument({
    candidates: [
      {
        examNo: "26010001",
        name: "홍길동",
        photoUrl: "",
        roomName: "101호",
      },
    ],
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    emptyValueData: {
      "candidate.photo": "(빈 사진)",
    },
    sampleData: {
      "candidate.photo": "(사진)",
    },
    template: createTemplate(layout),
  });

  assert.match(result.html, /<span class="preview-empty-data-fallback preview-photo-empty-fallback">\(빈 사진\)<\/span>/);
  assert.doesNotMatch(result.html, /\(사진\)/);
  assert.match(result.html, /\.preview-photo-empty-fallback,[\s\S]*\.preview-photo-sample-fallback \{[\s\S]*display: flex;/);
  assert.doesNotMatch(result.html, /이미지 없음/);
});

test("renderPreviewDocument suppresses candidate block generated objects without matching data", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          repeatable: true,
          settings: {
            documentHtml: '<div class="template-doc"><div data-candidate-block-grid="true"></div></div>',
            editorMode: "document",
            candidateBlockGrid: {
              blockTemplateHtml: [
                "<table><tbody><tr>",
                "<td>{{candidate.name}}</td>",
                '<td><img class="template-generated-object template-generated-object-barcode" data-template-object-type="barcode" data-template-object-source="candidate.examNo" src="" alt="바코드" /></td>',
                '<td><img class="template-generated-object template-generated-object-qrcode" data-template-object-type="qrcode" data-template-object-source="candidate.temporaryNo" src="" alt="QR코드" /></td>',
                "</tr></tbody></table>",
              ].join(""),
              columns: 1,
              enabled: true,
              fillEmptyBlocks: true,
              rows: 2,
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
      name: "데이터블록 생성객체 빈값 테스트",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-block-grid-generated-empty-test",
  );
  const result = renderPreviewDocument({
    candidates: [
      {
        examNo: "26010001",
        name: "홍길동",
        roomName: "101호",
        temporaryNo: "",
      },
    ],
    emptyValueData: {
      "candidate.examNo": "빈 수험번호",
      "candidate.temporaryNo": "빈 가번호",
    },
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    template: createTemplate(layout),
  });

  const barcodeImageMatches = result.html.match(/<img\b(?=[^>]*template-generated-object-barcode)/g) || [];
  const qrImageMatches = result.html.match(/<img\b(?=[^>]*template-generated-object-qrcode)/g) || [];

  assert.equal(barcodeImageMatches.length, 1);
  assert.equal(qrImageMatches.length, 0);
  assert.match(result.html, /title="수험번호 바코드"/);
  assert.doesNotMatch(result.html, /title="가번호 QR코드"/);
});

test("renderPreviewDocument keeps candidate block table rows inside the block height", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          repeatable: true,
          settings: {
            documentHtml: '<div class="template-doc"><div data-candidate-block-grid="true"></div></div>',
            editorMode: "document",
            candidateBlockGrid: {
              blockTemplateHtml:
                '<table data-candidate-block-table="true" style="height:100%;width:100%;border-collapse:collapse;"><tbody><tr style="height:24px;"><td style="height:24px;">A</td></tr><tr style="height:24px;"><td style="height:24px;">B</td></tr><tr style="height:24px;"><td style="height:24px;">C</td></tr><tr style="height:24px;"><td style="height:24px;">D</td></tr><tr style="height:24px;"><td style="height:24px;">E</td></tr></tbody></table>',
              columns: 1,
              enabled: true,
              heightPt: 90,
              rows: 1,
              variant: "photo",
              widthPt: 220,
            },
          },
          type: "content",
        },
      ],
    },
    {
      description: "미리보기 테스트",
      generationUnit: "room",
      name: "데이터블록 표 높이 테스트",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-block-grid-table-height-test",
  );
  const result = renderPreviewDocument({
    candidates: [
      {
        examNo: "26010001",
        name: "홍길동",
        roomName: "101호",
      },
    ],
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    template: createTemplate(layout),
  });

  const rowHeightMatches = Array.from(result.html.matchAll(/<tr\b[^>]*style="[^"]*height:\s*([^;"']+)/g)).map(
    (match) => match[1],
  );

  assert.equal(rowHeightMatches.length, 5);
  assert.ok(rowHeightMatches.every((height) => height === "23.8px"));
  assert.match(result.html, /<td style="height: 23\.8px;">A<\/td>/);
  assert.match(result.html, /\.preview-candidate-block table th,[\s\S]*\.preview-candidate-block table td \{[\s\S]*overflow: hidden;/);
});

test("renderPreviewDocument does not stretch smaller candidate block table rows to the block height", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          repeatable: true,
          settings: {
            documentHtml: '<div class="template-doc"><div data-candidate-block-grid="true"></div></div>',
            editorMode: "document",
            candidateBlockGrid: {
              blockTemplateHtml:
                '<table data-candidate-block-table="true" style="height:40px;width:120px;border-collapse:collapse;"><tbody><tr style="height:20px;"><td style="height:20px;">A</td></tr><tr style="height:20px;"><td style="height:20px;">B</td></tr></tbody></table>',
              columns: 1,
              enabled: true,
              heightPt: 90,
              rows: 1,
              variant: "photo",
              widthPt: 220,
            },
          },
          type: "content",
        },
      ],
    },
    {
      description: "미리보기 테스트",
      generationUnit: "room",
      name: "데이터블록 표 자유 높이 테스트",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-block-grid-table-free-height-test",
  );
  const result = renderPreviewDocument({
    candidates: [
      {
        examNo: "26010001",
        name: "홍길동",
        roomName: "101호",
      },
    ],
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    template: createTemplate(layout),
  });

  const rowHeightMatches = Array.from(result.html.matchAll(/<tr\b[^>]*style="[^"]*height:\s*([^;"']+)/g)).map(
    (match) => match[1],
  );

  assert.deepEqual(rowHeightMatches, ["20px", "20px"]);
  assert.match(result.html, /<table\b[^>]*style="[^"]*height:40px/);
  assert.doesNotMatch(result.html, /height:\s*59\.5px/);
});

test("renderPreviewDocument constrains rowspanned candidate photos inside candidate block table height", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          repeatable: true,
          settings: {
            documentHtml: '<div class="template-doc"><div data-candidate-block-grid="true"></div></div>',
            editorMode: "document",
            candidateBlockGrid: {
              blockTemplateHtml:
                '<table data-candidate-block-table="true" style="height:89px;width:220px;border-collapse:collapse;"><tbody><tr style="height:22px;"><td style="height:22px;padding:0;" rowspan="4"><span data-template-tag-value="candidate.photo">#사진</span></td><td style="height:22px;">A</td></tr><tr style="height:22px;"><td style="height:22px;">B</td></tr><tr style="height:22px;"><td style="height:22px;">C</td></tr><tr style="height:23px;"><td style="height:23px;">D</td></tr></tbody></table>',
              columns: 1,
              enabled: true,
              heightPt: 69.08,
              rows: 1,
              variant: "photo",
              widthPt: 220,
            },
          },
          type: "content",
        },
      ],
    },
    {
      description: "미리보기 테스트",
      generationUnit: "room",
      name: "데이터블록 사진 높이 테스트",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-block-grid-rowspan-photo-fit-test",
  );
  const result = renderPreviewDocument({
    candidates: [
      {
        examNo: "26010001",
        name: "홍길동",
        photoUrl: "data:image/png;base64,ZmFrZQ==",
        roomName: "101호",
      },
    ],
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    template: createTemplate(layout),
  });

  assert.match(result.html, /<td style="height: 89px;padding:0;" rowspan="4"/);
  assert.match(result.html, /<span class="preview-photo-fit-frame" style="height: 86px; max-height: 86px">/);
  assert.match(
    result.html,
    /<img class="preview-photo-image"[^>]*style="height: 86px; max-height: 86px; width: 100%; object-fit: contain"/,
  );
  assert.doesNotMatch(result.html, /preview-photo-fit-frame[\s\S]*?<\/span>\s*<br\s*\/?>/);
});

test("renderPreviewDocument sorts photo candidate block grid rows by configured field", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          repeatable: true,
          settings: {
            documentHtml: '<div class="template-doc"><div data-candidate-block-grid="true"></div></div>',
            editorMode: "document",
            candidateBlockGrid: {
              blockTemplateHtml: "<p>{{candidate.name}} {{candidate.examNo}}</p>",
              columns: 1,
              enabled: true,
              rows: 2,
              sortDirection: "asc",
              sortKey: "name",
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
      name: "미리보기 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-block-grid-sort-test",
  );
  const result = renderPreviewDocument({
    candidates: [
      { examNo: "26010003", name: "최현우", roomName: "101호" },
      { examNo: "26010001", name: "김영희", roomName: "101호" },
      { examNo: "26010002", name: "박민수", roomName: "101호" },
    ],
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    schoolSettings: {
      academicYear: "2026",
      schoolName: "한국대학교",
    },
    template: createTemplate(layout),
  });

  assert.equal(result.pageCount, 2);
  assert.ok(result.html.indexOf("김영희") < result.html.indexOf("박민수"));
  assert.ok(result.html.indexOf("박민수") < result.html.indexOf("최현우"));
});
