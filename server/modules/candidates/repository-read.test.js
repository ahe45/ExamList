const test = require("node:test");
const assert = require("node:assert/strict");

const { createCandidateReadRepository } = require("./repository-read");

test("findCandidateGroups supports multi-field grouping", async () => {
  let capturedSql = "";
  let capturedParams = null;
  const repository = createCandidateReadRepository({
    createHttpError: (statusCode, message, errorCode) => Object.assign(new Error(message), { errorCode, statusCode }),
    async query(sql, params) {
      capturedSql = sql;
      capturedParams = params;

      return [
        {
          admissionCode: "A",
          buildingCode: "B",
          candidateCount: 12,
          examDate: "2026-05-19",
          periodCode: "P1",
          roomCode: "R101",
          seriesCode: "S",
          unitCode: "U",
        },
      ];
    },
  });

  const groups = await repository.findCandidateGroups(
    {
      schoolId: "school-1",
    },
    ["admissionCode", "seriesCode", "examDate", "periodCode", "unitCode", "buildingCode", "roomCode"],
  );

  assert.match(capturedSql, /GROUP BY admission_code, series_code, exam_date, period_code, unit_code, building_code, room_code/);
  assert.deepEqual(capturedParams, { schoolId: "school-1" });
  assert.deepEqual(groups, [
    {
      candidateCount: 12,
      filters: {
        admissionCode: "A",
        buildingCode: "B",
        examDate: "2026-05-19",
        periodCode: "P1",
        roomCode: "R101",
        seriesCode: "S",
        unitCode: "U",
      },
      name: "A / S / 2026-05-19 / P1 / U / B / R101",
    },
  ]);
});

test("findCandidateFilterOptions can exclude the requested field from its own filters", async () => {
  const calls = [];
  const repository = createCandidateReadRepository({
    createHttpError: (statusCode, message, errorCode) => Object.assign(new Error(message), { errorCode, statusCode }),
    async query(sql, params) {
      calls.push({ params, sql });

      return [{ candidateCount: 1, value: "value" }];
    },
  });

  await repository.findCandidateFilterOptions(
    {
      campus: "글로벌캠퍼스",
      schoolId: "school-1",
      track: "수시",
    },
    "campus,track",
    { excludeSelfFilters: true },
  );

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].params, {
    schoolId: "school-1",
    track: "수시",
  });
  assert.deepEqual(calls[1].params, {
    campus: "글로벌캠퍼스",
    schoolId: "school-1",
  });
});
