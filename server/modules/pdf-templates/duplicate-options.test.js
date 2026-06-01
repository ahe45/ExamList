const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeTemplateDuplicateOptions } = require("./duplicate-options");

test("normalizeTemplateDuplicateOptions treats legacy schoolId as lookup and target for same-school copies", () => {
  assert.deepEqual(normalizeTemplateDuplicateOptions({ schoolId: " school-current " }), {
    description: "",
    hasDescription: false,
    lookupSchoolId: "school-current",
    name: "",
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
      description: "",
      hasDescription: false,
      lookupSchoolId: "school-source",
      name: "",
      schoolId: "",
      sourceSchoolId: "school-source",
      targetSchoolId: "school-target",
    },
  );
});

test("normalizeTemplateDuplicateOptions keeps copied template metadata overrides", () => {
  assert.deepEqual(
    normalizeTemplateDuplicateOptions({
      description: " 새 설명 ",
      name: " 새 양식 ",
      sourceSchoolId: "school-source",
      targetSchoolId: "school-target",
    }),
    {
      description: "새 설명",
      hasDescription: true,
      lookupSchoolId: "school-source",
      name: "새 양식",
      schoolId: "",
      sourceSchoolId: "school-source",
      targetSchoolId: "school-target",
    },
  );
});
