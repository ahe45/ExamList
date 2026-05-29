import test from "node:test";
import assert from "node:assert/strict";

import { renderTemplateListView } from "./renderers.js";

test("template create modal defaults to the default template option", () => {
  const html = renderTemplateListView({
    access: { permissions: { manageTemplates: true } },
    templates: {
      cardEditor: {},
      createModal: {
        isOpen: true,
        mode: "default",
      },
      items: [],
      total: 0,
    },
  });

  assert.match(html, /새 양식/);
  assert.match(html, /data-template-create-form/);
  assert.match(html, /value="default"\s+checked/);
  assert.match(html, /기본 템플릿/);
  assert.match(html, /빈 템플릿/);
  assert.match(html, /다른 학교 양식 복사/);
});

test("template create modal renders school and template selection for cross-school copy", () => {
  const html = renderTemplateListView({
    access: { permissions: { manageTemplates: true } },
    templates: {
      cardEditor: {},
      createModal: {
        isOpen: true,
        mode: "copy",
        schools: [{ id: "school-source", name: "서울고", code: "SEOUL" }],
        selectedSchoolId: "school-source",
        selectedTemplateId: "template-source",
        sourceTemplates: [
          {
            description: "복사 대상",
            id: "template-source",
            name: "원본 양식",
          },
        ],
      },
      items: [],
      total: 0,
    },
  });

  assert.match(html, /data-template-create-school/);
  assert.match(html, /서울고/);
  assert.match(html, /data-template-create-source-template/);
  assert.match(html, /원본 양식/);
  assert.match(html, /value="template-source"\s+checked/);
});

test("template management buttons stay visible but disabled for read-only school access", () => {
  const html = renderTemplateListView({
    access: {
      permissions: {
        deleteTemplates: true,
        manageTemplates: true,
      },
      schoolAccess: {
        canManage: false,
        schoolId: "school-readonly",
      },
    },
    templates: {
      cardEditor: {},
      createModal: { isOpen: false },
      items: [
        {
          description: "읽기 전용",
          id: "template-1",
          name: "양식",
          updatedAt: "2026-05-20T00:00:00.000Z",
        },
      ],
      total: 1,
    },
  });

  assert.match(html, /data-action="create-template"[\s\S]*disabled/);
  assert.match(html, /data-action="duplicate-template"[\s\S]*disabled/);
  assert.match(html, /data-action="delete-template"[\s\S]*disabled/);
});
