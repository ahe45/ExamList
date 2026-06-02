const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

class FakeHTMLElement {
  constructor({
    clientHeight = 0,
    clientWidth = 0,
    closestMap = {},
    offsetHeight = 0,
    offsetWidth = 0,
    rect = {},
    queryMap = {},
    style = {},
  } = {}) {
    this.clientHeight = clientHeight;
    this.clientWidth = clientWidth;
    this.closestMap = closestMap;
    this.offsetHeight = offsetHeight;
    this.offsetWidth = offsetWidth;
    this.rect = {
      height: rect.height || 0,
      width: rect.width || 0,
    };
    this.queryMap = queryMap;
    this.style = style;
  }

  closest(selector) {
    return this.closestMap[selector] || null;
  }

  contains(element) {
    return element instanceof FakeHTMLElement;
  }

  getBoundingClientRect() {
    return this.rect;
  }

  querySelector(selector) {
    return this.queryMap[selector] || null;
  }
}

class FakeTableElement extends FakeHTMLElement {}

global.HTMLElement = FakeHTMLElement;
global.HTMLTableElement = FakeTableElement;
global.window = {
  getComputedStyle() {
    return {
      getPropertyValue() {
        return "";
      },
    };
  },
};

test("object element size uses explicit table pixel size before rendered border box", async () => {
  const { getObjectElementSize } = await importClientModule("object-alignment-metrics.js");
  const documentElement = new FakeHTMLElement({
    clientHeight: 1000,
    clientWidth: 800,
    rect: { height: 1000, width: 800 },
  });
  const surfaceElement = new FakeHTMLElement({
    queryMap: {
      ".template-doc": documentElement,
    },
  });
  const tableElement = new FakeTableElement({
    rect: { height: 82, width: 502 },
    style: {
      height: "80px",
      width: "500px",
    },
  });

  assert.deepEqual(getObjectElementSize(tableElement, surfaceElement), {
    height: 80,
    width: 500,
  });
});

