const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeTemplateLayout } = require("../pdf-templates/layout");
const { createTemplateListThumbnailRenderer } = require("./list-thumbnail");

test("template list thumbnail renders with sample candidates without reading real candidates", async () => {
  let candidateReadCount = 0;
  const renderThumbnail = createTemplateListThumbnailRenderer({
    candidateService: {
      async findCandidates() {
        candidateReadCount += 1;
        return {
          items: [{ name: "실제지원자" }],
          total: 1,
        };
      },
    },
    schoolSettingsService: {
      async getSchoolSettings() {
        return {};
      },
    },
  });
  const layout = normalizeTemplateLayout(
    {
      dataTagSettings: {
        sampleData: {
          "candidate.name": "샘플지원자",
        },
      },
      pages: [
        {
          settings: {
            documentHtml: "<p>이름 {{candidate.name}}</p>",
            editorMode: "document",
          },
          type: "content",
        },
      ],
    },
    {
      description: "썸네일",
      generationUnit: "room",
      name: "썸네일",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-list-thumbnail-test",
  );
  const thumbnail = await renderThumbnail({
    generationUnit: "room",
    id: "template-list-thumbnail-test",
    layout,
    name: "썸네일",
    schoolId: "school-1",
  });

  assert.equal(candidateReadCount, 0);
  assert.match(thumbnail.html, /샘플지원자/);
  assert.doesNotMatch(thumbnail.html, /실제지원자/);
});

