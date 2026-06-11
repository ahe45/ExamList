const test = require("node:test");
const assert = require("node:assert/strict");

const { buildCandidateTokenMap } = require("./tokens");
const { replaceTemplateTokens } = require("./renderer-test-helpers");

test("replaceTemplateTokens supports format, default, phone, number, mask, and conditional syntax", () => {
  const renderedText = replaceTemplateTokens(
    [
      '{{exam.date | date: "YYYY-MM-DD"}}',
      '{{candidate.phone | phone | default: "-"}}',
      '{{candidate.name | mask: "name"}}',
      '{{candidate.phone | phone | mask: "phone"}}',
      '{{candidate.birthDate | mask: "birthDate"}}',
      '{{candidate.email | mask: "email"}}',
      "{{document.totalCandidates | number}}명",
      '{{room.supervisorName | default: "미정"}}',
      "{{#if room.name}}고사실 {{room.name}}{{else}}고사실 없음{{/if}}",
      "{{#if candidate.photo}}사진 있음{{else}}사진 없음{{/if}}",
    ].join("\n"),
    {
      candidate: {
        birthDate: "2007.03.15",
        email: "sample@example.org",
        name: "홍길동",
        phone: "01012345678",
        photo: "",
      },
      document: {
        totalCandidates: 12345,
      },
      exam: {
        date: "2026.04.21",
      },
      room: {
        name: "101호",
      },
    },
  );

  assert.match(renderedText, /2026-04-21/);
  assert.match(renderedText, /010-1234-5678/);
  assert.match(renderedText, /홍\*동/);
  assert.match(renderedText, /\*\*\*-\*\*\*\*-5678/);
  assert.match(renderedText, /2007\.\*\*\.\*\*/);
  assert.match(renderedText, /s\*+e@e\*+g/);
  assert.match(renderedText, /12,345명/);
  assert.match(renderedText, /미정/);
  assert.match(renderedText, /고사실 101호/);
  assert.match(renderedText, /사진 없음/);
});

test("replaceTemplateTokens prefers preview sample data by exact tag key", () => {
  const renderedText = replaceTemplateTokens("{{candidate.name}} {{room.assignedCount}}", {
    __sampleData: {
      "candidate.name": "샘플이름",
      "room.assignedCount": "5",
    },
    candidate: {
      name: "실제이름",
    },
    room: {
      assignedCount: 1,
    },
  });

  assert.equal(renderedText, "샘플이름 5");
});

test("replaceTemplateTokens preserves unfiltered uploaded date-like candidate values", () => {
  const renderedText = replaceTemplateTokens(
    [
      "{{candidate.examDate}}",
      "{{candidate.birthDate}}",
      '{{candidate.examDate | date: "YYYY.MM.DD"}}',
    ].join("\n"),
    {
      candidate: buildCandidateTokenMap({
        birthDate: "2006/01/02",
        examDate: "2026-11-28",
      }),
    },
  );

  assert.equal(renderedText, "2026-11-28\n2006/01/02\n2026.11.28");
});

test("replaceTemplateTokens supports two digit year and time filters", () => {
  const renderedText = replaceTemplateTokens(
    [
      "{{candidate.examDate | date: \"YY.MM.DD\"}}",
      "{{candidate.examDate | date: \"YYYY.MM.DD (dddd)\"}}",
      "{{candidate.examStartTime | time: \"A h:mm\"}}",
    ].join("\n"),
    {
      candidate: buildCandidateTokenMap({
        examDate: "2026-03-28",
        examStartTime: "08:40",
      }),
    },
  );

  assert.equal(renderedText, "26.03.28\n2026.03.28 (토요일)\n오전 8:40");
});
