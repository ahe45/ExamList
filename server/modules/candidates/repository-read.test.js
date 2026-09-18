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
      admission: "논술",
      schoolId: "school-1",
      track: "수시",
    },
    "admission,track",
    { excludeSelfFilters: true },
  );

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].params, {
    schoolId: "school-1",
    track: "수시",
  });
  assert.deepEqual(calls[1].params, {
    admission: "논술",
    schoolId: "school-1",
  });
});

test("findCandidates reads, filters, and sorts by OPT10", async () => {
  const calls = [];
  const repository = createCandidateReadRepository({
    createHttpError: (statusCode, message, errorCode) => Object.assign(new Error(message), { errorCode, statusCode }),
    async query(sql, params) {
      calls.push({ params, sql });
      return calls.length === 1 ? [{ total: 0 }] : [];
    },
  });

  await repository.findCandidates({
    opt10: "추가옵션",
    sortDirection: "desc",
    sortKey: "opt10",
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].params.opt10, "추가옵션");
  assert.match(calls[0].sql, /WHERE opt10 = :opt10/);
  assert.match(calls[1].sql, /\bopt10,/);
  assert.match(calls[1].sql, /opt10 DESC/);
});

test("server grid filters use vetted columns, bound values, stable order and page offset", async () => {
  const calls = [];
  const repository = createCandidateReadRepository({ createHttpError: (statusCode, message) => Object.assign(new Error(message), { statusCode }), query: async (sql, params) => { calls.push({ sql, params }); return sql.includes("COUNT(*)") ? [{ total: 91 }] : []; } });
  const result = await repository.findCandidates({ schoolId: "school", gridFilters: { roomCode: ["R1", "R2"], name: ["O'Reilly"] }, sortKey: "name", sortDirection: "desc", page: 2, limit: 30 });
  assert.equal(result.total, 91); assert.equal(result.page, 2);
  for (const call of calls) { assert.match(call.sql, /TRIM\(COALESCE\(room_code/); assert.deepEqual(call.params.grid_roomCode, ["R1", "R2"]); assert.deepEqual(call.params.grid_name, ["O'Reilly"]); assert.doesNotMatch(call.sql, /O'Reilly/); }
  assert.equal(calls[1].params.offset, 30); assert.match(calls[1].sql, /name DESC/); assert.match(calls[1].sql, /id ASC/);
});
test("grid option values use the whole school instead of current page filters", async () => {
  let captured;
  const repository = createCandidateReadRepository({ createHttpError: (statusCode, message) => Object.assign(new Error(message), { statusCode }), query: async (sql, params) => { captured = { sql, params }; return [{ value: "R10" }, { value: "R2" }]; } });
  const values = await repository.findCandidateGridOptions({ schoolId: "school", gridFilters: { name: ["person"] } }, "roomCode");
  assert.deepEqual(values, ["R2", "R10"]); assert.doesNotMatch(captured.sql, /grid_name/);
  await assert.rejects(repository.findCandidateGridOptions({ schoolId: "school" }, "invalid"), { statusCode: 400 });
});
