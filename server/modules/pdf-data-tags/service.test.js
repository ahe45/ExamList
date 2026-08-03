const test = require("node:test");
const assert = require("node:assert/strict");

const { buildCandidateTags, buildOtherTags, createPdfDataTagService } = require("./service");

test("getCatalog builds tags from school settings and candidate columns", async () => {
  const service = createPdfDataTagService({
    getCandidateFieldMap: () => ({
      "candidate.admissionYear": "school_settings.academic_year",
      "candidate.designatedSort": "designated_sort",
      "candidate.examStartTime": "time",
      "candidate.examEndTime": "end_time",
      "candidate.campusName": "school_settings.campus_name",
      "candidate.campusCode": "school_settings.campus_code",
      "candidate.examNo": "examinee_no",
      "candidate.temporaryNo": "temporary_no",
      "candidate.name": "name",
      "candidate.groupName": "group_name",
      "candidate.departmentName": "unit",
      "candidate.opt1": "opt1",
      "candidate.opt10": "opt10",
      "candidate.photo": "photo_name",
    }),
    async getSchoolSettings() {
      return {
        academicYear: "2027",
        campusCode: "SEOUL",
        campusName: "서울캠퍼스",
        schoolCode: "SEOUL01",
        schoolName: "한국대학교",
      };
    },
  });
  const catalog = await service.getCatalog();
  const groups = catalog.groups.map((group) => group.key);
  const schoolTags = catalog.groups.find((group) => group.key === "school").tags;
  const candidateTags = catalog.groups.find((group) => group.key === "candidate").tags;
  const roomTags = catalog.groups.find((group) => group.key === "room").tags;
  const otherTags = catalog.groups.find((group) => group.key === "etc").tags;

  assert.deepEqual(groups, ["school", "candidate", "room", "etc"]);
  assert.deepEqual(
    schoolTags.map((tag) => tag.key),
    ["school.name", "school.code"],
  );
  assert.deepEqual(
    schoolTags.map((tag) => tag.example),
    ["한국대학교", "SEOUL01"],
  );
  assert.deepEqual(
    candidateTags.map((tag) => tag.key),
    [
      "candidate.admissionYear",
      "candidate.campusName",
      "candidate.campusCode",
      "candidate.departmentName",
      "candidate.examStartTime",
      "candidate.examEndTime",
      "candidate.examNo",
      "candidate.temporaryNo",
      "candidate.name",
      "candidate.groupName",
      "candidate.opt1",
      "candidate.opt10",
      "candidate.photo",
    ],
  );
  assert.equal(candidateTags.find((tag) => tag.key === "candidate.admissionYear").example, "2027학년도");
  assert.equal(candidateTags.find((tag) => tag.key === "candidate.campusName").example, "서울캠퍼스");
  assert.equal(candidateTags.find((tag) => tag.key === "candidate.campusCode").sourceColumn, "school_settings.campus_code");
  assert.equal(candidateTags.some((tag) => tag.key === "candidate.designatedSort"), false);
  assert.equal(candidateTags.find((tag) => tag.key === "candidate.examStartTime").label, "시작시간");
  assert.equal(candidateTags.find((tag) => tag.key === "candidate.examEndTime").label, "종료시간");
  assert.equal(candidateTags.find((tag) => tag.key === "candidate.photo").label, "수험생 사진");
  assert.equal(candidateTags.find((tag) => tag.key === "candidate.departmentName").sourceColumn, "unit");
  assert.equal(candidateTags.find((tag) => tag.key === "candidate.opt1").label, "OPT1");
  assert.equal(candidateTags.find((tag) => tag.key === "candidate.opt10").label, "OPT10");
  assert.deepEqual(
    roomTags.map((tag) => [tag.key, tag.label, tag.type, tag.example]),
    [
      ["room.assignedCount", "배정인원", "number", "24"],
      ["room.otherRoom", "타고사실", "string", ""],
    ],
  );
  assert.deepEqual(otherTags.map((tag) => [tag.key, tag.label, tag.type, tag.example]), [["row.indexInPage", "순번", "number", "1"]]);
});

test("buildCandidateTags appends unknown candidate adapter mappings", () => {
  const tags = buildCandidateTags({
    "candidate.examNo": "examinee_no",
    "candidate.customColumn": "custom_column",
  });

  assert.deepEqual(
    tags.map((tag) => tag.key),
    ["candidate.examNo", "candidate.customColumn"],
  );
  assert.equal(tags.find((tag) => tag.key === "candidate.customColumn").label, "custom Column");
});

test("buildOtherTags exposes the candidate block sequence tag", () => {
  assert.deepEqual(buildOtherTags().map((tag) => tag.key), ["row.indexInPage"]);
});
