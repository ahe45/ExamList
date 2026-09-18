const test = require("node:test");
const assert = require("node:assert/strict");
const { createPdfTemplateReadActions } = require("./service-read");

test("empty template lists and searches return a normal paginated result", async () => {
  for (const keyword of ["", "검색 결과 없음"]) {
    let queries = 0;
    const actions = createPdfTemplateReadActions({
      query: async (sql, params) => {
        queries++;
        assert.match(sql, /COUNT\(\*\)/);
        assert.equal(params.schoolId, "school-empty");
        if (keyword) assert.equal(params.keyword, `%${keyword}%`);
        return [{ total: "0" }];
      },
      renderListThumbnail: () => assert.fail("Empty lists must not render thumbnails"),
    });
    assert.deepEqual(await actions.listTemplates({ schoolId: "school-empty", keyword, page: 2, limit: 20 }), {
      items: [], total: 0, page: 2, limit: 20,
    });
    assert.equal(queries, 1);
  }
});

test("dashboard with no templates returns zero and an empty recent list", async () => {
  const actions = createPdfTemplateReadActions({
    query: async sql => {
      assert.match(sql, /COUNT\(\*\)/);
      return [{ totalTemplates: 0 }];
    },
  });
  assert.deepEqual(await actions.getDashboardTemplateSummary({ schoolId: "school-empty" }), {
    totalTemplates: 0, recentTemplates: [],
  });
});

test("database failures are not misreported as an empty template list", async () => {
  const failure = new Error("Database unavailable");
  const actions = createPdfTemplateReadActions({ query: async () => { throw failure; } });
  await assert.rejects(actions.listTemplates(), error => error === failure);
  await assert.rejects(actions.getDashboardTemplateSummary(), error => error === failure);
});
