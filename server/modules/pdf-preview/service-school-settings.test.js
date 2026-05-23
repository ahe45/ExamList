const test = require("node:test");
const assert = require("node:assert/strict");

const { createPdfPreviewService } = require("./service");
const { createHttpError, createTemplateWithTable } = require("./service-test-helpers");

function createSchoolSettingsPreviewService() {
  return createPdfPreviewService({
    candidateService: {
      async findCandidates() {
        return {
          items: [
            {
              examNo: "26010001",
              name: "홍길동",
              roomName: "101호",
            },
          ],
        };
      },
    },
    createHttpError,
    pdfTemplateService: {},
    schoolSettingsService: {
      async getSchoolSettings() {
        return {
          academicYear: "2026",
          schoolName: "한국대학교",
        };
      },
    },
  });
}

test("resolvePreviewPayload includes school settings for data tags", async () => {
  const previewService = createSchoolSettingsPreviewService();

  const previewPayload = await previewService.resolvePreviewPayload({
    template: createTemplateWithTable([{ key: "candidate.name", label: "성명", type: "text", width: 96 }]),
  });

  assert.equal(previewPayload.schoolSettings.academicYear, "2026");
  assert.equal(previewPayload.schoolSettings.schoolName, "한국대학교");
});

test("previewTemplate renders school setting data tags", async () => {
  const template = createTemplateWithTable([{ key: "candidate.name", label: "성명", type: "text", width: 96 }]);
  template.layout.pages[0].elements.unshift({
    config: {
      content: "{{school.academicYear}} {{school.name}}",
    },
    height: 32,
    type: "dataText",
    width: 240,
    x: 40,
    y: 32,
  });
  const previewService = createSchoolSettingsPreviewService();

  const preview = await previewService.previewTemplate({ template });

  assert.match(preview.previewHtml, /2026학년도 한국대학교/);
});
