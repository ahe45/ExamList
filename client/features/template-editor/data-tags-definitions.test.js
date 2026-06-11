const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

class FakeClassList {
  constructor() {
    this.values = new Set(["template-token"]);
  }

  toggle(className, force) {
    if (force) {
      this.values.add(className);
    } else {
      this.values.delete(className);
    }
  }
}

class FakeTextNode {
  constructor(textContent = "", parentElement = null) {
    this.parentElement = parentElement;
    this.removed = false;
    this.textContent = textContent;
  }

  remove() {
    this.removed = true;
  }
}

class FakeElement {
  constructor(tagName = "span", attributes = {}) {
    this.attributes = { ...attributes };
    this.children = [];
    this.classList = new FakeClassList();
    this.dataset = {};
    this.tagName = tagName.toUpperCase();
    this.textNodes = [];
    this.title = "";
  }

  append(child) {
    this.children.push(child);
  }

  closest(selector) {
    return selector === "svg" && this.tagName.toLowerCase() === "svg" ? this : null;
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
}

class FakeRoot {
  constructor(tokens = []) {
    this.tokens = tokens;
  }

  querySelectorAll(selector) {
    return selector === ".template-token[data-template-tag-value]" ? this.tokens : [];
  }
}

test("normalizeTokenLabels preserves styled token text markup inside candidate block tables", async () => {
  const styledTextElement = new FakeElement("span", {
    style: "font-size:18pt;color:#dc2626;font-weight:700;",
  });
  const styledTextNode = new FakeTextNode("#성명", styledTextElement);

  styledTextElement.textNodes = [styledTextNode];

  const tokenElement = new FakeElement("span");
  tokenElement.dataset.templateTagValue = "candidate.name";
  tokenElement.children = [styledTextElement];
  tokenElement.textNodes = [styledTextNode];

  const previousDocument = global.document;
  const previousNodeFilter = global.NodeFilter;

  global.NodeFilter = { SHOW_TEXT: 4 };
  global.document = {
    createTreeWalker(element) {
      const textNodes = [...(element.textNodes || [])];
      let index = -1;

      return {
        currentNode: null,
        nextNode() {
          index += 1;
          this.currentNode = textNodes[index] || null;
          return Boolean(this.currentNode);
        },
      };
    },
  };

  try {
    const { normalizeTokenLabels } = await importClientModule("data-tags-definitions.js");

    normalizeTokenLabels(
      new FakeRoot([tokenElement]),
      [
        {
          example: "홍길동",
          iconKey: "user",
          key: "candidate.name",
          label: "성명",
          token: "candidate.name",
        },
      ],
      { showIcons: false, showSampleData: false },
    );

    assert.equal(tokenElement.dataset.templateTagValue, "candidate.name");
    assert.equal(tokenElement.dataset.templateTagFormatSupported, undefined);
    assert.equal(tokenElement.children[0], styledTextElement);
    assert.equal(styledTextElement.getAttribute("style"), "font-size:18pt;color:#dc2626;font-weight:700;");
    assert.equal(styledTextNode.textContent, "성명");
  } finally {
    global.document = previousDocument;
    global.NodeFilter = previousNodeFilter;
  }
});

test("normalizeTokenLabels marks only format-supported date and time tokens", async () => {
  const previousDocument = global.document;
  const previousNodeFilter = global.NodeFilter;
  const dateToken = new FakeElement("span");
  const nameToken = new FakeElement("span");

  dateToken.dataset.templateTagValue = "candidate.examDate";
  nameToken.dataset.templateTagValue = "candidate.name";

  global.NodeFilter = { SHOW_TEXT: 4 };
  global.document = {
    createTextNode(textContent) {
      return new FakeTextNode(textContent);
    },
    createTreeWalker(element) {
      const textNodes = [...(element.textNodes || [])];
      let index = -1;

      return {
        currentNode: null,
        nextNode() {
          index += 1;
          this.currentNode = textNodes[index] || null;
          return Boolean(this.currentNode);
        },
      };
    },
  };

  try {
    const { normalizeTokenLabels } = await importClientModule("data-tags-definitions.js");

    normalizeTokenLabels(
      new FakeRoot([dateToken, nameToken]),
      [
        {
          example: "2026-03-28",
          key: "candidate.examDate",
          label: "시험날짜",
          token: "candidate.examDate",
          type: "date",
        },
        {
          example: "홍길동",
          key: "candidate.name",
          label: "이름",
          token: "candidate.name",
          type: "string",
        },
      ],
      { showIcons: false, showSampleData: false },
    );

    assert.equal(dateToken.dataset.templateTagFormatSupported, "true");
    assert.equal(nameToken.dataset.templateTagFormatSupported, undefined);
  } finally {
    global.document = previousDocument;
    global.NodeFilter = previousNodeFilter;
  }
});

test("normalizeTokenLabels formats sample display with token data format settings", async () => {
  const previousDocument = global.document;
  const previousNodeFilter = global.NodeFilter;
  const dateToken = new FakeElement("span");
  const dateTextNode = new FakeTextNode("시험날짜", dateToken);

  dateToken.dataset.templateTagValue = "candidate.examDate";
  dateToken.dataset.templateTagFormatType = "date";
  dateToken.dataset.templateTagFormat = "YYYY.MM.DD (ddd)";
  dateToken.textNodes = [dateTextNode];

  global.NodeFilter = { SHOW_TEXT: 4 };
  global.document = {
    createTreeWalker(element) {
      const textNodes = [...(element.textNodes || [])];
      let index = -1;

      return {
        currentNode: null,
        nextNode() {
          index += 1;
          this.currentNode = textNodes[index] || null;
          return Boolean(this.currentNode);
        },
      };
    },
  };

  try {
    const { normalizeTokenLabels } = await importClientModule("data-tags-definitions.js");

    normalizeTokenLabels(
      new FakeRoot([dateToken]),
      [
        {
          example: "2026-11-28",
          key: "candidate.examDate",
          label: "시험날짜",
          token: "candidate.examDate",
          type: "date",
        },
      ],
      { showIcons: false, showSampleData: true },
    );

    assert.equal(dateTextNode.textContent, "2026.11.28 (토)");
    assert.equal(dateToken.dataset.templateTagExample, "2026-11-28");
  } finally {
    global.document = previousDocument;
    global.NodeFilter = previousNodeFilter;
  }
});
