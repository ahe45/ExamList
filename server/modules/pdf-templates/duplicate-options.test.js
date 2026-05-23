const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeTemplateDuplicateOptions } = require("./duplicate-options");

test("normalizeTemplateDuplicateOptions treats legacy schoolId as lookup and target for same-school copies", () => {
  assert.deepEqual(normalizeTemplateDuplicateOptions({ schoolId: " school-current " }), {
    lookupSchoolId: "school-current",
    schoolId: "school-current",
    sourceSchoolId: "",
    targetSchoolId: "school-current",
  });
});

test("normalizeTemplateDuplicateOptions separates source and target school ids", () => {
  assert.deepEqual(
    normalizeTemplateDuplicateOptions({
      sourceSchoolId: " school-source ",
      targetSchoolId: " school-target ",
    }),
    {
      lookupSchoolId: "school-source",
      schoolId: "",
      sourceSchoolId: "school-source",
      targetSchoolId: "school-target",
    },
  );
});
