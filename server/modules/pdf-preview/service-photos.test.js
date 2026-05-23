const test = require("node:test");
const assert = require("node:assert/strict");

const { createPdfPreviewService } = require("./service");
const {
  buildPreviewSampleCandidates,
  sampleCandidatePhotoFileId,
} = require("./sample-candidates");
const {
  createHttpError,
  createTemplateWithCandidatePhoto,
  createTemplateWithDocumentPhoto,
  createTemplateWithTable,
} = require("./service-test-helpers");

function createPhotoCandidateService({ hydrateCandidatesWithPhotos }) {
  return {
    async findCandidates() {
      return {
        items: [
          {
            examNo: "26010001",
            name: "홍길동",
            photoFileId: "26010001.png",
            photoUrl: "",
            roomName: "101호",
          },
        ],
      };
    },
    hydrateCandidatesWithPhotos,
  };
}

test("resolvePreviewPayload hydrates candidate photos when template has a photo column", async () => {
  let hydrateCallCount = 0;
  const previewService = createPdfPreviewService({
    candidateService: createPhotoCandidateService({
      async hydrateCandidatesWithPhotos(candidates) {
        hydrateCallCount += 1;
        return candidates.map((candidate) => ({
          ...candidate,
          photoUrl: "data:image/png;base64,ZmFrZQ==",
        }));
      },
    }),
    createHttpError,
    pdfTemplateService: {},
  });

  const previewPayload = await previewService.resolvePreviewPayload({
    template: createTemplateWithTable([
      { key: "candidate.photo", label: "사진", type: "photo", width: 60 },
      { key: "candidate.name", label: "성명", type: "text", width: 96 },
    ]),
  });

  assert.equal(hydrateCallCount, 1);
  assert.equal(previewPayload.candidates[0].photoUrl, "data:image/png;base64,ZmFrZQ==");
});

test("resolvePreviewPayload skips photo hydration when template has no photo column", async () => {
  let hydrateCallCount = 0;
  const previewService = createPdfPreviewService({
    candidateService: createPhotoCandidateService({
      async hydrateCandidatesWithPhotos(candidates) {
        hydrateCallCount += 1;
        return candidates;
      },
    }),
    createHttpError,
    pdfTemplateService: {},
  });

  const previewPayload = await previewService.resolvePreviewPayload({
    template: createTemplateWithTable([{ key: "candidate.name", label: "성명", type: "text", width: 96 }]),
  });

  assert.equal(hydrateCallCount, 0);
  assert.equal(previewPayload.candidates[0].photoUrl, "");
});

test("resolvePreviewPayload hydrates candidate photos when template has a candidate photo element", async () => {
  let hydrateCallCount = 0;
  const previewService = createPdfPreviewService({
    candidateService: createPhotoCandidateService({
      async hydrateCandidatesWithPhotos(candidates) {
        hydrateCallCount += 1;
        return candidates.map((candidate) => ({
          ...candidate,
          photoUrl: "data:image/png;base64,ZmFrZQ==",
        }));
      },
    }),
    createHttpError,
    pdfTemplateService: {},
  });

  const previewPayload = await previewService.resolvePreviewPayload({
    template: createTemplateWithCandidatePhoto(),
  });

  assert.equal(hydrateCallCount, 1);
  assert.equal(previewPayload.candidates[0].photoUrl, "data:image/png;base64,ZmFrZQ==");
});

test("resolvePreviewPayload hydrates candidate photos when document html uses candidate photo token", async () => {
  let hydrateCallCount = 0;
  const previewService = createPdfPreviewService({
    candidateService: createPhotoCandidateService({
      async hydrateCandidatesWithPhotos(candidates) {
        hydrateCallCount += 1;
        return candidates.map((candidate) => ({
          ...candidate,
          photoUrl: "data:image/png;base64,ZmFrZQ==",
        }));
      },
    }),
    createHttpError,
    pdfTemplateService: {},
  });

  const previewPayload = await previewService.resolvePreviewPayload({
    template: createTemplateWithDocumentPhoto(),
  });

  assert.equal(hydrateCallCount, 1);
  assert.equal(previewPayload.candidates[0].photoUrl, "data:image/png;base64,ZmFrZQ==");
});

test("previewTemplate renders the configured candidate photo sample data", async () => {
  const previewService = createPdfPreviewService({
    candidateService: {
      async findCandidates() {
        return { items: [] };
      },
    },
    createHttpError,
    pdfTemplateService: {},
  });

  const preview = await previewService.previewTemplate({
    sampleData: {
      "candidate.photo": "data:image/png;base64,ZmFrZQ==",
    },
    template: createTemplateWithTable([
      { key: "candidate.photo", label: "사진", type: "photo", width: 60 },
      { key: "candidate.name", label: "성명", type: "text", width: 96 },
    ]),
  });

  assert.equal(preview.candidateCount, 25);
  assert.match(preview.previewHtml, /preview-photo-image/);
  assert.match(preview.previewHtml, /data:image\/png;base64,ZmFrZQ==/);
});

test("preview sample candidates keep the bundled candidate photo sample", () => {
  const [candidate] = buildPreviewSampleCandidates({
    "candidate.name": "샘플 성명",
    "candidate.photo": "(사진)",
  });

  assert.equal(candidate.photoFileId, sampleCandidatePhotoFileId);
  assert.match(candidate.photoUrl, /^data:image\/png;base64,/);
  assert.equal(candidate.photo, "(사진)");
});

test("preview sample candidates use photo text as the default photo token value", () => {
  const [candidate] = buildPreviewSampleCandidates({
    "candidate.name": "샘플 성명",
  });

  assert.equal(candidate.photoFileId, sampleCandidatePhotoFileId);
  assert.match(candidate.photoUrl, /^data:image\/png;base64,/);
  assert.equal(candidate.photo, "사진");
});
