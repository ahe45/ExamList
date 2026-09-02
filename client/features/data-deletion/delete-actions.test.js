import test from "node:test";
import assert from "node:assert/strict";

import { createDataDeletionDeleteActions } from "./delete-actions.js";

test("data deletion renders progress state before sending the delete request", async () => {
  const originalFetch = globalThis.fetch;
  const state = {
    activeScope: "",
    isDeleting: false,
    modal: {
      confirmationOpen: true,
      errorMessage: "",
      filters: {},
      isOpen: true,
      summary: {
        scopes: [{ scope: "templates", totalCount: 1 }],
      },
      selectedScope: "templates",
      selectedTemplateIds: ["template-1"],
    },
    progressOverlay: {
      message: "",
      stageLabel: "",
    },
    statusMessage: "",
    statusType: "",
  };
  const renderSnapshots = [];
  let deleteRequestStarted = false;
  let modalRefreshStarted = false;
  const originalDocument = globalThis.document;
  const originalHTMLElement = globalThis.HTMLElement;
  const originalWindow = globalThis.window;

  class TestElement {
    classList = {
      add() {},
      remove() {},
    };

    appendChild() {}
    addEventListener() {}
    replaceChildren() {}
    setAttribute() {}
  }

  globalThis.fetch = async (url, options = {}) => {
    deleteRequestStarted = true;

    assert.equal(url, "/api/data-deletion/templates");
    assert.equal(options.method, "DELETE");
    assert.equal(state.isDeleting, true);

    return new Response(
      JSON.stringify({
        deletedPdfTemplates: 1,
        filters: {},
        scope: "templates",
        scopeLabel: "양식 데이터",
      }),
      {
        headers: {
          "content-type": "application/json",
        },
        status: 200,
      },
    );
  };
  globalThis.HTMLElement = TestElement;
  globalThis.document = {
    body: new TestElement(),
    createElement: () => new TestElement(),
    getElementById: () => null,
  };
  globalThis.window = {
    clearTimeout() {},
    setTimeout(callback) {
      callback();
      return 0;
    },
  };

  try {
    const { deleteProjectData } = createDataDeletionDeleteActions({
      buildDataDeletionFilterPayload: () => ({}),
      getCurrentSchoolId: () => "school-1",
      getDataDeletionModalState: () => state.modal,
      getDataDeletionState: () => state,
      getScopeItem: () => ({ scope: "templates", title: "양식 데이터" }),
      hasPermission: () => true,
      onStateChange: async () => {
        renderSnapshots.push({
          deleteRequestStarted,
          isDeleting: state.isDeleting,
          modalIsDeleting: state.modal.isDeleting,
          progressMessage: state.progressOverlay.message,
          summaryTotalCount: state.modal.summary?.scopes?.[0]?.totalCount,
        });
      },
      refreshAfterDeletion: async () => {},
      refreshModalAfterDeletion: async () => {
        modalRefreshStarted = true;
        assert.equal(state.isDeleting, true);
        assert.equal(state.modal.isDeleting, true);
        state.modal.summary = {
          scopes: [{ scope: "templates", totalCount: 0 }],
        };
        state.modal.selectedTemplateIds = [];
      },
    });

    await deleteProjectData("templates");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.document = originalDocument;
    globalThis.HTMLElement = originalHTMLElement;
    globalThis.window = originalWindow;
  }

  assert.equal(renderSnapshots[0]?.isDeleting, true);
  assert.equal(renderSnapshots[0]?.modalIsDeleting, true);
  assert.equal(renderSnapshots[0]?.deleteRequestStarted, false);
  assert.match(renderSnapshots[0]?.progressMessage || "", /삭제 대상 데이터를 정리/);
  assert.equal(deleteRequestStarted, true);
  assert.equal(modalRefreshStarted, true);
  assert.equal(state.modal.isOpen, true);
  assert.equal(state.modal.summary?.scopes?.[0]?.totalCount, 0);
  assert.deepEqual(state.modal.selectedTemplateIds, []);
  assert.equal(state.isDeleting, false);
});
