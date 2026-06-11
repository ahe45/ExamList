import test from "node:test";
import assert from "node:assert/strict";

import { bindPdfGenerationEventHandlers } from "./pdf-generation-event-bindings.js";

function createPdfGenerationClickEvent(selector, element) {
  return {
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    target: {
      closest(query) {
        return query === selector ? element : null;
      },
    },
  };
}

function createPdfGenerationContext(table) {
  const pdfGenerations = {
    items: Array.from({ length: 95 }, (_, index) => ({ id: `generation-${index + 1}` })),
    selectedGenerationIds: [],
    table,
  };
  let renderCount = 0;
  const context = {
    appConfig: {},
    appState: { currentView: "pdfGenerationHistory", pdfGenerations, route: {} },
    clampPdfGenerationPage: () => {
      const totalPages = Math.max(1, Math.ceil(pdfGenerations.items.length / Math.max(1, Number(table.pageSize) || 1)));

      table.page = Math.min(Math.max(1, Number(table.page) || 1), totalPages);
      return totalPages;
    },
    closePdfGenerationFilterMenu: () => {},
    closePdfGenerationPageSizeMenu: () => {},
    getPdfGenerationTableState: () => table,
    onStateChange: async () => {
      renderCount += 1;
    },
  };

  return {
    context: new Proxy(context, {
      get(target, property) {
        return property in target ? target[property] : async () => {};
      },
    }),
    getRenderCount: () => renderCount,
  };
}

function createPdfAuditLogContext(auditTable) {
  const pdfGenerations = {
    auditLogs: Array.from({ length: 95 }, (_, index) => ({
      action: index % 2 ? "pdf_generation_completed" : "pdf_generation_failed",
      createdAt: `2026-05-20T00:${String(index).padStart(2, "0")}:00.000Z`,
      entityType: "pdf_generation",
      id: `audit-${index + 1}`,
      metadata: {},
      status: index % 2 ? "completed" : "failed",
    })),
    auditTable,
  };
  let renderCount = 0;
  const context = {
    appConfig: {},
    appState: { currentView: "pdfHistoryManagement", pdfGenerations, route: {} },
    clampPdfAuditLogPage: () => {
      const totalPages = Math.max(1, Math.ceil(pdfGenerations.auditLogs.length / Math.max(1, Number(auditTable.pageSize) || 1)));

      auditTable.page = Math.min(Math.max(1, Number(auditTable.page) || 1), totalPages);
      return totalPages;
    },
    closePdfAuditLogFilterMenu: () => {
      auditTable.filterMenuKey = "";
    },
    closePdfAuditLogPageSizeMenu: () => {},
    closePdfGenerationFilterMenu: () => {},
    closePdfGenerationPageSizeMenu: () => {},
    getPdfAuditLogTableState: () => auditTable,
    getVisiblePdfAuditLogFilterOptions: () => ["완료", "실패"],
    onStateChange: async () => {
      renderCount += 1;
    },
    setPdfAuditLogFilterValues: (columnKey, values) => {
      auditTable.filters = { ...(auditTable.filters || {}) };

      if (values.length) {
        auditTable.filters[columnKey] = values;
      } else {
        delete auditTable.filters[columnKey];
      }

      auditTable.page = 1;
    },
    togglePdfAuditLogSort: (columnKey) => {
      const [currentSortRule] = Array.isArray(auditTable.sortRules) ? auditTable.sortRules : [];

      if (currentSortRule?.key !== columnKey) {
        auditTable.sortRules = [{ direction: "asc", key: columnKey }];
      } else if (currentSortRule.direction === "asc") {
        auditTable.sortRules = [{ direction: "desc", key: columnKey }];
      } else {
        auditTable.sortRules = [];
      }
    },
  };

  return {
    context: new Proxy(context, {
      get(target, property) {
        return property in target ? target[property] : async () => {};
      },
    }),
    getRenderCount: () => renderCount,
  };
}

function createPdfGenerationArtifactContext(artifactTable) {
  const pdfGenerations = {
    artifactItems: Array.from({ length: 95 }, (_, index) => ({
      createdAt: `2026-05-20T00:${String(index).padStart(2, "0")}:00.000Z`,
      fileName: `artifact-${index + 1}.pdf`,
      id: `artifact-${index + 1}`,
      kind: index % 2 ? "archive" : "merged",
    })),
    artifactTable,
  };
  let renderCount = 0;
  const context = {
    appConfig: {},
    appState: { currentView: "pdfGenerationHistory", pdfGenerations, route: {} },
    clampPdfGenerationArtifactPage: () => {
      const totalPages = Math.max(1, Math.ceil(pdfGenerations.artifactItems.length / Math.max(1, Number(artifactTable.pageSize) || 1)));

      artifactTable.page = Math.min(Math.max(1, Number(artifactTable.page) || 1), totalPages);
      return totalPages;
    },
    closePdfAuditLogFilterMenu: () => {},
    closePdfGenerationArtifactFilterMenu: () => {
      artifactTable.filterMenuKey = "";
    },
    closePdfGenerationArtifactPageSizeMenu: () => {
      artifactTable.pageSizeMenuOpen = false;
    },
    closePdfGenerationFilterMenu: () => {},
    closePdfGenerationPageSizeMenu: () => {},
    getPdfGenerationArtifactTableState: () => artifactTable,
    getVisiblePdfGenerationArtifactFilterOptions: () => ["ZIP", "병합 PDF"],
    onStateChange: async () => {
      renderCount += 1;
    },
    setPdfGenerationArtifactFilterValues: (columnKey, values) => {
      artifactTable.filters = { ...(artifactTable.filters || {}) };

      if (values.length) {
        artifactTable.filters[columnKey] = values;
      } else {
        delete artifactTable.filters[columnKey];
      }

      artifactTable.page = 1;
    },
    togglePdfGenerationArtifactSort: (columnKey) => {
      const [currentSortRule] = Array.isArray(artifactTable.sortRules) ? artifactTable.sortRules : [];

      if (currentSortRule?.key !== columnKey) {
        artifactTable.sortRules = [{ direction: "asc", key: columnKey }];
      } else if (currentSortRule.direction === "asc") {
        artifactTable.sortRules = [{ direction: "desc", key: columnKey }];
      } else {
        artifactTable.sortRules = [];
      }
    },
  };

  return {
    context: new Proxy(context, {
      get(target, property) {
        return property in target ? target[property] : async () => {};
      },
    }),
    getRenderCount: () => renderCount,
  };
}

test("PDF generation pagination previous and next buttons update the current page", async () => {
  const listeners = {};
  const originalDocument = globalThis.document;

  globalThis.document = {
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
  };

  try {
    const table = { filters: {}, page: 2, pageSize: 30, pageSizeMenuOpen: false, sortRules: [] };
    const { context, getRenderCount } = createPdfGenerationContext(table);

    bindPdfGenerationEventHandlers(context);

    const nextEvent = createPdfGenerationClickEvent("[data-pdf-generation-grid-nav]", {
      dataset: { pdfGenerationGridNav: "next" },
      disabled: false,
    });
    const previousEvent = createPdfGenerationClickEvent("[data-pdf-generation-grid-nav]", {
      dataset: { pdfGenerationGridNav: "prev" },
      disabled: false,
    });

    await listeners.click(nextEvent);
    assert.equal(table.page, 3);
    assert.equal(nextEvent.defaultPrevented, true);

    await listeners.click(previousEvent);
    assert.equal(table.page, 2);
    assert.equal(previousEvent.defaultPrevented, true);
    assert.equal(getRenderCount(), 2);

    await listeners.change(createPdfGenerationClickEvent("[data-pdf-generation-grid-page-picker]", {
      value: "4",
    }));
    assert.equal(table.page, 4);
    assert.equal(getRenderCount(), 3);
  } finally {
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }
  }
});

test("PDF generation artifact grid supports pagination, sorting, and filters", async () => {
  const listeners = {};
  const originalDocument = globalThis.document;

  globalThis.document = {
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
  };

  try {
    const artifactTable = {
      filterMenuKey: "",
      filterMenuPosition: null,
      filterMenuSearch: "",
      filters: {},
      page: 2,
      pageSize: 30,
      pageSizeMenuOpen: false,
      sortRules: [],
    };
    const { context, getRenderCount } = createPdfGenerationArtifactContext(artifactTable);

    bindPdfGenerationEventHandlers(context);

    const nextEvent = createPdfGenerationClickEvent("[data-pdf-generation-artifact-grid-nav]", {
      dataset: { pdfGenerationArtifactGridNav: "next" },
      disabled: false,
    });
    const previousEvent = createPdfGenerationClickEvent("[data-pdf-generation-artifact-grid-nav]", {
      dataset: { pdfGenerationArtifactGridNav: "prev" },
      disabled: false,
    });

    await listeners.click(nextEvent);
    assert.equal(artifactTable.page, 3);
    assert.equal(nextEvent.defaultPrevented, true);

    await listeners.click(previousEvent);
    assert.equal(artifactTable.page, 2);

    await listeners.click(createPdfGenerationClickEvent("[data-pdf-generation-artifact-grid-sort]", {
      dataset: { pdfGenerationArtifactGridSort: "fileName" },
    }));
    assert.deepEqual(artifactTable.sortRules, [{ direction: "asc", key: "fileName" }]);

    await listeners.change(createPdfGenerationClickEvent("[data-pdf-generation-artifact-filter-option]", {
      checked: true,
      dataset: { filterKey: "kind", filterValue: "ZIP" },
    }));
    assert.deepEqual(artifactTable.filters.kind, ["ZIP"]);
    assert.equal(artifactTable.page, 1);

    await listeners.change(createPdfGenerationClickEvent("[data-pdf-generation-artifact-grid-page-picker]", {
      value: "4",
    }));
    assert.equal(artifactTable.page, 4);
    assert.equal(getRenderCount(), 5);
  } finally {
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }
  }
});

test("PDF audit log grid supports pagination, sorting, and filters", async () => {
  const listeners = {};
  const originalDocument = globalThis.document;

  globalThis.document = {
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
  };

  try {
    const auditTable = {
      filterMenuKey: "",
      filterMenuPosition: null,
      filterMenuSearch: "",
      filters: {},
      page: 2,
      pageSize: 30,
      pageSizeMenuOpen: false,
      sortRules: [],
    };
    const { context, getRenderCount } = createPdfAuditLogContext(auditTable);

    bindPdfGenerationEventHandlers(context);

    const nextEvent = createPdfGenerationClickEvent("[data-pdf-audit-grid-nav]", {
      dataset: { pdfAuditGridNav: "next" },
      disabled: false,
    });
    const previousEvent = createPdfGenerationClickEvent("[data-pdf-audit-grid-nav]", {
      dataset: { pdfAuditGridNav: "prev" },
      disabled: false,
    });

    await listeners.click(nextEvent);
    assert.equal(auditTable.page, 3);
    assert.equal(nextEvent.defaultPrevented, true);

    await listeners.click(previousEvent);
    assert.equal(auditTable.page, 2);

    await listeners.click(createPdfGenerationClickEvent("[data-pdf-audit-grid-sort]", {
      dataset: { pdfAuditGridSort: "action" },
    }));
    assert.deepEqual(auditTable.sortRules, [{ direction: "asc", key: "action" }]);

    await listeners.change(createPdfGenerationClickEvent("[data-pdf-audit-filter-option]", {
      checked: true,
      dataset: { filterKey: "status", filterValue: "완료" },
    }));
    assert.deepEqual(auditTable.filters.status, ["완료"]);
    assert.equal(auditTable.page, 1);

    await listeners.change(createPdfGenerationClickEvent("[data-pdf-audit-grid-page-picker]", {
      value: "4",
    }));
    assert.equal(auditTable.page, 4);
    assert.equal(getRenderCount(), 5);
  } finally {
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }
  }
});
