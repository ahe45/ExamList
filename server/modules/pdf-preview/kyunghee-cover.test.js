const test = require("node:test");
const assert = require("node:assert/strict");
const { buildKyungheeCoverText, resolveKyungheeCoverText } = require("./kyunghee-cover");
const { createPdfPreviewService } = require("./service");
const { renderPreviewDocument } = require("./renderer");

function template() {
  return {
    id: "kyunghee-cover-test", name: "표지", schoolId: "school-test",
    generationUnit: "custom", paperPreset: "A4", orientation: "portrait",
    layout: {
      generation: { unit: "custom", unitFields: ["date", "periodCode", "roomCode"] },
      pages: [{ type: "cover", settings: { editorMode: "document", documentHtml:
        '<p><span data-template-tag-value="document.kyungheeCover" style="font-size:14pt">경희대 표지</span></p>' } }],
    },
  };
}

test("cover groups by department code, preserves numbers and follows designated order without changing OPT", () => {
  const candidates = [
    { unitCode: "A", unit: "같은 이름", examineeNo: "00012", designatedSort: "10", opt1: "수동 입력" },
    { departmentCode: "B", departmentName: "같은 이름", examNo: "A009", designatedSort: "2 " },
    { unitCode: "A", unit: "같은 이름", examineeNo: "00002", designatedSort: "11" },
    { unitCode: "B", unit: "같은 이름", examineeNo: "A010", designatedSort: "3" },
    { unit: "코드 없는 학과", examNo: "90071992547409930002" },
    { unit: "코드 없는 학과", examNo: "90071992547409930001" },
    { unit: "빈 번호", examNo: "" },
  ];
  const before = structuredClone(candidates);
  assert.equal(buildKyungheeCoverText(candidates), [
    "같은 이름\n: A009 ~ A010",
    "같은 이름\n: 00002 ~ 00012",
    "코드 없는 학과\n: 90071992547409930001 ~ 90071992547409930002",
    "빈 번호\n: 수험번호 없음",
  ].join("\n\n"));
  assert.deepEqual(candidates, before);
  assert.equal(buildKyungheeCoverText([]), "");
});

test("cover keeps every department beyond ten and repeats a single candidate's number", () => {
  const candidates = Array.from({ length: 12 }, (_, i) => ({ unit: `학과${i}`, examNo: `00${i}` }));
  const lines = buildKyungheeCoverText(candidates).split("\n\n");
  assert.equal(lines.length, 12);
  assert.equal(lines[11], "학과11\n: 0011 ~ 0011");
});

test("cover reads the entire generation group across query pages while preserving filters and blank group values", async () => {
  const first = { date: "2026-08-08", periodCode: "", roomCode: "006", unitCode: "565", unit: "자유전공학부", examNo: "3005650027" };
  const last = { ...first, examNo: "3005650052" };
  const foreign = { ...first, periodCode: "002", examNo: "9999999999" };
  const queries = [];
  const text = await resolveKyungheeCoverText({
    candidateService: { async findCandidates(query) {
      queries.push(query);
      return { items: query.page === 1 ? [first, foreign] : [last], total: 3, limit: 2 };
    } },
    template: template(), schoolId: "school-test", filters: { admissionCode: "A", keyword: "선택조건" },
    candidatePayload: { items: [first], total: 3 }, samplePage: 2,
  });
  assert.equal(text, "자유전공학부\n: 3005650027 ~ 3005650052");
  assert.equal(queries.length, 2);
  assert.deepEqual(queries.map((q) => [q.schoolId, q.admissionCode, q.keyword, q.date, q.roomCode, q.page]), [
    ["school-test", "A", "선택조건", "2026-08-08", "006", 1],
    ["school-test", "A", "선택조건", "2026-08-08", "006", 2],
  ]);
});

test("complete query results isolate the selected date, period and room without another read", async () => {
  const candidate = { examDate: "2026-08-08", periodCode: "1", roomCode: "1", unit: "학과", examNo: "01" };
  const result = await resolveKyungheeCoverText({
    candidateService: { findCandidates() { assert.fail("unnecessary database read"); } },
    template: template(), schoolId: "school-test", filters: {}, samplePage: 1,
    candidatePayload: { total: 4, items: [candidate,
      { ...candidate, examDate: "2026-08-09", examNo: "99" },
      { ...candidate, periodCode: "2", examNo: "98" },
      { ...candidate, roomCode: "2", examNo: "97" },
    ] },
  });
  assert.equal(result, "학과\n: 01 ~ 01");
});

test("actual preview displays full group ranges even when rendering only one candidate", async () => {
  const first = { date: "2026-08-08", periodCode: "1", roomCode: "1", unit: "건축학과", examNo: "0001" };
  const last = { ...first, examNo: "0020" };
  let calls = 0;
  const service = createPdfPreviewService({
    createHttpError: (status, message) => new Error(message), pdfTemplateService: {},
    candidateService: { async findCandidates(query) {
      calls += 1;
      assert.equal(query.schoolId, "school-test");
      return { items: query.limit === 1 ? [first] : [first, last], total: 2, limit: query.limit };
    } },
  });
  const result = await service.previewTemplate({ template: template(), sampleLimit: 1, renderActualCandidates: true });
  assert.equal(result.candidateCount, 1);
  assert.match(result.previewHtml, /건축학과<br><span[^>]+>: 0001 ~ 0020<\/span>/);
  assert.equal(calls, 2);
});

test("cover renders escaped multiline content in editor spans and raw tokens and allows sample values", () => {
  const value = '학과 <A>\n: 001 ~ 009\n\n학과 B\n: 010 ~ 010';
  const source = template();
  source.layout.pages[0].settings.documentHtml += '<p>{{document.kyungheeCover}}</p>';
  const actual = renderPreviewDocument({ template: source, candidates: [], kyungheeCoverText: value, sampleData: {} });
  assert.equal((actual.html.match(/학과 &lt;A&gt;<br><span[^>]+>: 001 ~ 009<\/span><br><br>학과 B<br><span[^>]+>: 010 ~ 010<\/span>/g) || []).length, 2);
  assert.match(actual.html, /font-size:14pt/);
  const sample = renderPreviewDocument({ template: source, candidates: [], sampleData: { "document.kyungheeCover": "샘플1\n샘플2" } });
  assert.match(sample.html, /샘플1<br>샘플2/);
});
