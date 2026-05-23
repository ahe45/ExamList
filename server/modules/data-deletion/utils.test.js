const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createSqlPlaceholders,
  createUniqueValueList,
  parseJsonColumn,
} = require("./utils");

test("createSqlPlaceholders creates one placeholder per value", () => {
  assert.equal(createSqlPlaceholders(["a", "b", "c"]), "?, ?, ?");
  assert.equal(createSqlPlaceholders([]), "");
});

test("createUniqueValueList trims, removes blanks, and de-duplicates values", () => {
  assert.deepEqual(createUniqueValueList([" a ", "", "b", "a", null, " b "]), ["a", "b"]);
});

test("parseJsonColumn parses valid JSON and falls back for invalid values", () => {
  assert.deepEqual(parseJsonColumn('{"name":"template"}', null), { name: "template" });
  assert.deepEqual(parseJsonColumn("{broken", { safe: true }), { safe: true });
  assert.equal(parseJsonColumn("", "fallback"), "fallback");
});
