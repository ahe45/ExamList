const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

test("getDocumentSurfaceOverflowInfo reports the largest surface/root overflow", async () => {
  const { getDocumentSurfaceOverflowInfo, getDocumentOverflowMessage } = await importClientModule("document-overflow.js");
  const root = {
    clientHeight: 100,
    clientWidth: 120,
    scrollHeight: 118,
    scrollWidth: 126,
  };
  const surface = {
    clientHeight: 200,
    clientWidth: 200,
    querySelector: () => root,
    scrollHeight: 203,
    scrollWidth: 260,
  };

  const info = getDocumentSurfaceOverflowInfo(surface);

  assert.deepEqual(info, {
    hasOverflow: true,
    heightOverflow: 18,
    widthOverflow: 60,
  });
  assert.equal(getDocumentOverflowMessage(info), "A4 용지 영역을 초과했습니다 (세로 18px, 가로 60px). 초과된 내용은 저장할 수 없습니다.");
});

test("getDocumentSurfaceOverflowInfo ignores empty trailing paragraphs", async () => {
  const { getDocumentSurfaceOverflowInfo } = await importClientModule("document-overflow.js");
  const originalElement = global.Element;
  const originalNode = global.Node;

  class FakeElement {
    constructor({ childNodes = [], matches = false, rects = [] } = {}) {
      this.childNodes = childNodes;
      this.nextSibling = null;
      this.nodeType = 1;
      this.rects = rects;
      this.shouldMatchParagraph = matches;
    }

    closest() {
      return null;
    }

    getClientRects() {
      return this.rects;
    }

    matches(selector) {
      return selector === "p" ? this.shouldMatchParagraph : false;
    }
  }

  try {
    global.Element = FakeElement;
    global.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 };

    const content = new FakeElement({
      rects: [{ bottom: 96, height: 12, left: 0, right: 100, top: 84, width: 100 }],
    });
    const trailingParagraph = new FakeElement({
      childNodes: [{ nodeType: 1, matches: (selector) => selector === "br" }],
      matches: true,
      rects: [{ bottom: 124, height: 16, left: 0, right: 100, top: 108, width: 100 }],
    });
    const root = {
      getBoundingClientRect: () => ({ bottom: 100, height: 100, left: 0, right: 100, top: 0, width: 100 }),
      ownerDocument: {},
      querySelector: () => null,
      querySelectorAll: () => [content, trailingParagraph],
    };
    const surface = {
      getBoundingClientRect: () => ({ bottom: 100, height: 100, left: 0, right: 100, top: 0, width: 100 }),
      querySelector: () => root,
    };

    const info = getDocumentSurfaceOverflowInfo(surface);

    assert.deepEqual(info, {
      hasOverflow: false,
      heightOverflow: 0,
      widthOverflow: 0,
    });
  } finally {
    global.Element = originalElement;
    global.Node = originalNode;
  }
});
