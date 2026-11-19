const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildResultScopeFromCandidateAggregate,
  createPdfGenerationReadActions,
} = require("./history-read-service");

test("batch progress uses current statuses without loading templates or candidate scopes", async () => {
  const actions = createPdfGenerationReadActions({
    getBatchRow: async () => ({ id: "batch-1", totalRequested: 4, status: "queued" }),
    getBatchGenerationRows: async (id, options) => {
      assert.equal(id, "batch-1");
      assert.deepEqual(options, { statusOnly: true });
      return ["completed", "failed", "running", "queued"].map(status => ({ status }));
    },
    query: async () => { throw new Error("Progress must not infer candidate scopes"); },
  });
  const result = await actions.getPdfGenerationBatch("batch-1", { includeItems: false });
  assert.equal(result.status, "running");
  assert.equal(result.progressPercent, 50);
  assert.equal(result.succeededCount, 1);
  assert.equal(result.failedCount, 1);
  assert.equal(result.runningCount, 1);
  assert.equal(result.queuedCount, 1);
  assert.equal(result.items, undefined);
});

test("buildResultScopeFromCandidateAggregate keeps only single candidate scope values", () => {
  const resultScope = buildResultScopeFromCandidateAggregate({
    trackDistinct: 1,
    trackValue: "수시",
    timeDistinct: 1,
    timeValue: "09:00",
    endTimeDistinct: 1,
    endTimeValue: "10:00",
    majorDistinct: 2,
    majorValue: "국어국문",
  });

  assert.equal(resultScope.track, "수시");
  assert.equal(resultScope.time, "09:00");
  assert.equal(resultScope.endTime, "10:00");
  assert.equal(resultScope.major, undefined);
});

test("listPdfGenerations infers missing display scope from current candidate data", async () => {
  const queryParams = [];
  const readActions = createPdfGenerationReadActions({
    createHttpError: (statusCode, message, errorCode) => Object.assign(new Error(message), { errorCode, statusCode }),
    getBatchGenerationRows: async () => [],
    getBatchRow: async () => null,
    query: async (sql, params) => {
      queryParams.push(params);

      if (sql.includes("COUNT(*) AS total")) {
        return [{ total: 1 }];
      }

      if (sql.includes("FROM candidate_records")) {
        return [
          {
            admissionDistinct: 1,
            admissionValue: "논술",
            buildingDistinct: 1,
            buildingValue: "1고사관",
            endTimeDistinct: 1,
            endTimeValue: "10:00",
            examDateDistinct: 1,
            examDateValue: "2026-05-19",
            groupDistinct: 0,
            groupValue: "",
            majorDistinct: 0,
            majorValue: "",
            periodDistinct: 1,
            periodValue: "1교시",
            roomDistinct: 1,
            roomValue: "101호",
            seriesDistinct: 1,
            seriesValue: "인문",
            timeDistinct: 1,
            timeValue: "09:00",
            trackDistinct: 1,
            trackValue: "수시",
            unitDistinct: 1,
            unitValue: "인문대학",
          },
        ];
      }

      return [
        {
          candidateCount: 12,
          generationUnit: "roomCode",
          id: "generation-1",
          pageCount: 1,
          progressPercent: 100,
          requestJson: JSON.stringify({
            filters: {
              admissionCode: "A01",
              roomCode: "R101",
            },
            generationUnit: "roomCode",
            targetName: "R101",
          }),
          schoolId: "school-1",
          status: "completed",
          targetName: "R101",
          templateName: "고사실 템플릿",
        },
      ];
    },
  });

  const result = await readActions.listPdfGenerations({ schoolId: "school-1" });

  assert.equal(result.items[0].resultScope.track, "수시");
  assert.equal(result.items[0].resultScope.time, "09:00");
  assert.equal(result.items[0].resultScope.endTime, "10:00");
  assert.equal(queryParams[0].status, "completed");
  assert.equal(queryParams[1].status, "completed");
});

test("listPdfGenerations reconstructs older mixed cells from the saved PDF page", async () => {
  const snapshot = {
    candidatePage: 2,
    candidateSort: { sortKey: "name", sortDirection: "desc" },
    filters: { date: "2026-11-21", periodCode: "1", major: "성호관" },
    generationUnit: "custom",
    generationUnitFields: ["date", "periodCode", "major"],
    resultScope: { admission: "생성 당시 전형", track: "수시" },
    sampleLimit: 2,
  };
  const oldRow = { id: "older", schoolId: "school-1", candidateCount: 2, requestJson: JSON.stringify(snapshot) };
  const savedRow = {
    ...oldRow,
    id: "newer",
    requestJson: JSON.stringify({
      ...snapshot,
      resultScopeValues: { admission: ["전형A", "전형B"], unit: [], room: ["103호"] },
    }),
  };
  let lookups = 0;
  const actions = createPdfGenerationReadActions({
    candidateService: {
      async findCandidates(filters) {
        lookups += 1;
        assert.deepEqual(filters, {
          ...snapshot.filters,
          ...snapshot.candidateSort,
          schoolId: "school-1",
          page: 2,
          limit: 2,
        });
        const group = { date: "2026-11-21", periodCode: "1", major: "성호관", admission: "현재 전형" };
        return { items: [
          { ...group, unit: "국문과", room: "101호" },
          { ...group, unit: "영문과", room: "102호" },
        ] };
      },
    },
    query: async (sql) => sql.includes("COUNT(*) AS total") ? [{ total: 2 }] : [oldRow, savedRow],
  });

  const result = await actions.listPdfGenerations({ schoolId: "school-1" });
  assert.equal(lookups, 1);
  assert.deepEqual(result.items[0].resultScopeValues, {
    admission: ["생성 당시 전형"], unit: ["국문과", "영문과"], room: ["101호", "102호"],
  });
  assert.deepEqual(result.items[1].resultScopeValues, {
    admission: ["전형A", "전형B"], unit: [], room: ["103호"],
  });
});
