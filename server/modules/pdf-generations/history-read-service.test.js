const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildResultScopeFromCandidateAggregate,
  createPdfGenerationReadActions,
} = require("./history-read-service");

test("buildResultScopeFromCandidateAggregate keeps only single candidate scope values", () => {
  const resultScope = buildResultScopeFromCandidateAggregate({
    campusDistinct: 1,
    campusValue: "서울",
    trackDistinct: 1,
    trackValue: "수시",
    timeDistinct: 1,
    timeValue: "09:00",
    endTimeDistinct: 1,
    endTimeValue: "10:00",
    majorDistinct: 2,
    majorValue: "국어국문",
  });

  assert.equal(resultScope.campus, "서울");
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
            campusDistinct: 1,
            campusValue: "서울",
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

  assert.equal(result.items[0].resultScope.campus, "서울");
  assert.equal(result.items[0].resultScope.track, "수시");
  assert.equal(result.items[0].resultScope.time, "09:00");
  assert.equal(result.items[0].resultScope.endTime, "10:00");
  assert.equal(queryParams[0].status, "completed");
  assert.equal(queryParams[1].status, "completed");
});
