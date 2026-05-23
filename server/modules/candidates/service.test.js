const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeCandidateRecordInput, parseCandidateCsv } = require("./service");

test("parseCandidateCsv maps Korean examinee headers", () => {
  const items = parseCandidateCsv(
    [
      "지정정렬,모집년도,모집시기,캠퍼스명,전형명,계열명,모집단위명,전공명,고사건물명,고사실명,교시명,시작시간,종료시간,수험번호,가번호,전형코드,성명,생년월일,조,OPT1",
      "1,2026,수시,서울캠퍼스,학생부종합,일반,간호학과,간호학,본관,101호,1교시,09:00,10:00,26010001,A001,A-1,홍길동,2007.03.15,A조,비고",
    ].join("\n"),
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].examineeNo, "26010001");
  assert.equal(items[0].name, "홍길동");
  assert.equal(items[0].room, "101호");
  assert.equal(items[0].unit, "간호학과");
  assert.equal(items[0].admissionYear, "2026");
  assert.equal(items[0].designatedSort, "1");
  assert.equal(items[0].temporaryNo, "A001");
  assert.equal(items[0].groupName, "A조");
  assert.equal(items[0].campus, "서울캠퍼스");
  assert.equal(items[0].period, "1교시");
  assert.equal(items[0].time, "09:00");
  assert.equal(items[0].endTime, "10:00");
  assert.equal(items[0].opt1, "비고");
});

test("normalizeCandidateRecordInput creates stable project ids from source", () => {
  const record = normalizeCandidateRecordInput(
    {
      birthDate: "2007.03.15",
      examDate: "2026.10.21",
      examNo: "26010001",
      id: "source-1",
      name: "홍길동",
      roomName: "101호",
    },
    "xlsx",
  );

  assert.match(record.id, /^candidate-/);
  assert.equal(record.sourceId, "source-1");
  assert.equal(record.sourceType, "xlsx");
  assert.equal(record.examDate, "2026-10-21");
  assert.equal(record.birthDate, "2007-03-15");
  assert.equal(record.examineeNo, "26010001");
});
