import test from "node:test";
import assert from "node:assert/strict";

import { createCandidateUploadSubmitActions } from "./candidate-upload-submit-actions.js";

function installToastDomStub() {
  const previousDocument = globalThis.document;
  const previousHTMLElement = globalThis.HTMLElement;
  const previousWindow = globalThis.window;
  let toastRoot = null;

  globalThis.HTMLElement = Object;
  globalThis.window = {
    clearTimeout() {},
    setTimeout() {
      return 0;
    },
  };
  globalThis.document = {
    body: {
      appendChild(element) {
        toastRoot = element;
      },
    },
    createElement() {
      return {
        classList: {
          add() {},
          remove() {},
        },
        setAttribute() {},
        replaceChildren(...children) {
          this.children = children;
        },
      };
    },
    getElementById(id) {
      return toastRoot?.id === id ? toastRoot : null;
    },
  };

  return () => {
    globalThis.document = previousDocument;
    globalThis.HTMLElement = previousHTMLElement;
    globalThis.window = previousWindow;
  };
}

test("candidate photo archive submit reuses preview token instead of reuploading ZIP", async (t) => {
  const restoreToastDom = installToastDomStub();
  const previousFetch = globalThis.fetch;
  const requests = [];
  const upload = {
    dataFile: null,
    dataFileName: "",
    errorMessage: "",
    existingDataPolicy: "insert-update",
    isOpen: true,
    isUploading: false,
    mode: "photo-archive",
    photoFile: { name: "candidate-photos.zip", size: 1024 },
    photoFileName: "candidate-photos.zip",
    photoPreview: { previewToken: "preview-token" },
    photoPreviewToken: "preview-token",
    preview: null,
    progressOverlay: { isOpen: false },
    successMessage: "",
  };
  const appState = {
    candidates: {
      successMessage: "",
      upload,
    },
  };
  let loadCount = 0;

  t.after(() => {
    globalThis.fetch = previousFetch;
    restoreToastDom();
  });

  globalThis.fetch = async (url, options = {}) => {
    requests.push({ options, url });
    return {
      headers: {
        get(name) {
          return name.toLowerCase() === "content-type" ? "application/json" : "";
        },
      },
      json: async () => ({ photoSkipped: 1, photoUploaded: 2 }),
      ok: true,
    };
  };

  const actions = createCandidateUploadSubmitActions({
    appState,
    canManageCandidates: () => true,
    ensureCandidateUploadState: () => upload,
    getCurrentSchoolId: () => "school-1",
    loadCandidates: async () => {
      loadCount += 1;
    },
    onStateChange: async () => {},
    previewWorkbookFile: async () => {},
    setCandidateUploadProgressOverlay: async (nextOverlay) => {
      upload.progressOverlay = {
        ...upload.progressOverlay,
        ...nextOverlay,
        isOpen: false,
      };
    },
    waitForProgressPaint: async () => {},
  });

  await actions.uploadSelectedCandidateFile();

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/api/candidates/photo-archive");
  assert.equal(requests[0].options.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    previewToken: "preview-token",
    schoolId: "school-1",
  });
  assert.equal(upload.photoFile, null);
  assert.equal(upload.photoPreview, null);
  assert.equal(upload.photoPreviewToken, "");
  assert.equal(loadCount, 1);
});

test("candidate workbook submit opens a persistent error dialog when no file is selected", async () => {
  const upload = {
    dataFile: null,
    dataFileName: "",
    errorDialogOpen: false,
    errorMessage: "",
    existingDataPolicy: "insert-update",
    isOpen: true,
    isUploading: false,
    mode: "workbook",
    preview: null,
    progressOverlay: { isOpen: false },
    successMessage: "",
  };
  const appState = {
    candidates: {
      successMessage: "",
      upload,
    },
  };
  let stateChangeCount = 0;

  const actions = createCandidateUploadSubmitActions({
    appState,
    canManageCandidates: () => true,
    ensureCandidateUploadState: () => upload,
    getCurrentSchoolId: () => "school-1",
    loadCandidates: async () => {},
    onStateChange: async () => {
      stateChangeCount += 1;
    },
    previewWorkbookFile: async () => {},
    setCandidateUploadProgressOverlay: async () => {},
    waitForProgressPaint: async () => {},
  });

  await actions.uploadSelectedCandidateFile();

  assert.equal(upload.errorDialogOpen, true);
  assert.equal(upload.errorMessage, "XLSX 파일을 먼저 선택하세요.");
  assert.equal(stateChangeCount, 1);
});
