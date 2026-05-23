import test from "node:test";
import assert from "node:assert/strict";

import { renderCandidateTable } from "./candidate-table-renderer.js";

test("candidate grid does not render filter strip when filters are active", () => {
  const html = renderCandidateTable({
    access: {
      permissions: {
        manageCandidates: true,
      },
    },
    candidates: {
      items: [],
      loading: true,
      table: {
        filters: {
          campus: ["서울"],
        },
      },
    },
  });

  assert.doesNotMatch(html, /class="filter-strip"/);
  assert.doesNotMatch(html, /적용된 필터/);
});

test("candidate grid page-size picker uses the admitcard option set", () => {
  const html = renderCandidateTable({
    access: {
      permissions: {
        manageCandidates: true,
      },
    },
    candidates: {
      items: Array.from({ length: 1234 }, (_, index) => ({ id: `candidate-${index + 1}` })),
      loading: false,
      table: {
        page: 1,
        pageSize: 30,
        pageSizeMenuOpen: true,
      },
    },
  });

  assert.match(html, /data-candidate-page-size-option="30"/);
  assert.match(html, /data-candidate-page-size-option="2000"/);
  assert.match(html, /data-candidate-grid-nav="next"[\s\S]*data-candidate-grid-page="2"/);
  assert.match(html, /data-candidate-grid-page-picker/);
  assert.match(html, /class="table-pagination-divider"/);
  assert.match(html, /data-candidate-grid-page-picker[\s\S]*class="page-picker-label">page<\/span>/);
  assert.match(html, /<option value="2"[\s\S]*>2<\/option>/);
  assert.match(html, /2,000개/);
  assert.match(html, /1-30 \/ 총 1,234건/);
  assert.match(html, /모두 표시/);
  assert.doesNotMatch(html, /data-candidate-page-size-option="20"/);
});
