const test = require("node:test");
const assert = require("node:assert/strict");

const { calculateRowsPerPage, calculateTableBodyHeight } = require("./pagination");

test("calculateRowsPerPage subtracts repeated header height before row calculation", () => {
  assert.equal(
    calculateRowsPerPage({
      headerHeight: 32,
      repeatHeader: true,
      rowHeight: 42,
      tableHeight: 620,
    }),
    14,
  );
});

test("calculateRowsPerPage ignores header height when repeatHeader is false", () => {
  assert.equal(
    calculateRowsPerPage({
      headerHeight: 32,
      repeatHeader: false,
      rowHeight: 42,
      tableHeight: 620,
    }),
    14,
  );
});

test("calculateTableBodyHeight returns non-negative body height", () => {
  assert.equal(
    calculateTableBodyHeight({
      headerHeight: 100,
      repeatHeader: true,
      tableHeight: 80,
    }),
    0,
  );
});
