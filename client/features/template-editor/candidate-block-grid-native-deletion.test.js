const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

let activeSelection = null;
let ownerDocument = null;

class FakeTextNode {
  constructor(textContent = "") {
    this.nodeType = TEXT_NODE;
    this.textContent = textContent;
    this.parentNode = null;
    this.parentElement = null;
    this.ownerDocument = ownerDocument;
  }
}

class FakeHTMLElement {
  constructor(tagName, { childNodes = [], innerHTML = "", isGrid = false } = {}) {
    this.nodeType = ELEMENT_NODE;
    this.tagName = String(tagName || "div").toUpperCase();
    this.childNodes = [];
    this.innerHTML = innerHTML;
    this.isGrid = isGrid;
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.parentElement = null;

    childNodes.forEach((childNode) => {
      this.appendChild(childNode);
    });
  }

  appendChild(childNode) {
    childNode.parentNode = this;
    childNode.parentElement = this;
    childNode.ownerDocument = ownerDocument;
    this.childNodes.push(childNode);
    return childNode;
  }

  contains(targetNode) {
    let currentNode = targetNode || null;

    while (currentNode) {
      if (currentNode === this) {
        return true;
      }

      currentNode = currentNode.parentNode || currentNode.parentElement || null;
    }

    return false;
  }

  closest(selector) {
    let currentNode = this;

    while (currentNode instanceof FakeHTMLElement) {
      if (currentNode.matches(selector)) {
        return currentNode;
      }

      currentNode = currentNode.parentElement;
    }

    return null;
  }

  matches(selector) {
    if (selector === "[data-candidate-block-grid], .examlist-candidate-block-grid") {
      return this.isGrid;
    }

    if (selector === "[data-candidate-block-grid]") {
      return this.isGrid;
    }

    if (selector === ".examlist-candidate-block-grid") {
      return this.isGrid;
    }

    if (selector === "p, div, h1, h2, h3, blockquote, ul, ol") {
      return ["P", "DIV", "H1", "H2", "H3", "BLOCKQUOTE", "UL", "OL"].includes(this.tagName);
    }

    return false;
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (node) => {
      if (!(node instanceof FakeHTMLElement)) {
        return;
      }

      if (node.matches(selector)) {
        matches.push(node);
      }

      node.childNodes.forEach(visit);
    };

    this.childNodes.forEach(visit);
    return matches;
  }
}

ownerDocument = {
  defaultView: {
    Element: FakeHTMLElement,
    HTMLElement: FakeHTMLElement,
  },
};

global.Node = {
  ELEMENT_NODE,
  TEXT_NODE,
};
global.Element = FakeHTMLElement;
global.HTMLElement = FakeHTMLElement;
global.HTMLButtonElement = FakeHTMLElement;
global.HTMLInputElement = FakeHTMLElement;
global.HTMLSelectElement = FakeHTMLElement;
global.window = {
  addEventListener() {},
  getSelection() {
    return activeSelection;
  },
  removeEventListener() {},
};
global.document = {
  createElement(tagName) {
    return new FakeHTMLElement(tagName);
  },
};

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

function setSelectionRange(range) {
  activeSelection = range
    ? {
        getRangeAt(index) {
          assert.equal(index, 0);
          return range;
        },
        rangeCount: 1,
      }
    : {
        getRangeAt() {
          throw new Error("No selection range is available");
        },
        rangeCount: 0,
      };
}

function createRange({
  collapsed = true,
  commonAncestorContainer,
  intersectsNode = () => false,
  startContainer,
  startOffset = 0,
} = {}) {
  return {
    collapsed,
    commonAncestorContainer: commonAncestorContainer || startContainer,
    intersectsNode,
    startContainer,
    startOffset,
  };
}

test("candidate block native deletion guard allows collapsed text editing away from boundaries", async () => {
  const { shouldPreventCandidateBlockGridNativeDeletion } = await importClientModule("candidate-block-grid-adapter.js");
  const textNode = new FakeTextNode("ABC");
  const paragraphNode = new FakeHTMLElement("p", { childNodes: [textNode] });
  const surfaceElement = new FakeHTMLElement("div", { childNodes: [paragraphNode] });

  setSelectionRange(createRange({ startContainer: textNode, startOffset: 1 }));

  assert.equal(shouldPreventCandidateBlockGridNativeDeletion({ key: "Backspace" }, surfaceElement), false);
  assert.equal(shouldPreventCandidateBlockGridNativeDeletion({ key: "Delete" }, surfaceElement), false);
});

test("candidate block native deletion guard prevents collapsed deletion next to a grid", async () => {
  const { shouldPreventCandidateBlockGridNativeDeletion } = await importClientModule("candidate-block-grid-adapter.js");
  const backwardTextNode = new FakeTextNode("ABC");
  const backwardGridNode = new FakeHTMLElement("div", { isGrid: true });
  const backwardSurfaceElement = new FakeHTMLElement("div", {
    childNodes: [backwardGridNode, backwardTextNode],
  });

  setSelectionRange(createRange({ startContainer: backwardTextNode, startOffset: 0 }));

  assert.equal(shouldPreventCandidateBlockGridNativeDeletion({ key: "Backspace" }, backwardSurfaceElement), true);

  const forwardTextNode = new FakeTextNode("ABC");
  const forwardGridNode = new FakeHTMLElement("div", { isGrid: true });
  const forwardSurfaceElement = new FakeHTMLElement("div", {
    childNodes: [forwardTextNode, forwardGridNode],
  });

  setSelectionRange(createRange({ startContainer: forwardTextNode, startOffset: 3 }));

  assert.equal(shouldPreventCandidateBlockGridNativeDeletion({ key: "Delete" }, forwardSurfaceElement), true);
});

test("candidate block native deletion guard prevents deletion from a blank boundary host beside a grid", async () => {
  const { shouldPreventCandidateBlockGridNativeDeletion } = await importClientModule("candidate-block-grid-adapter.js");
  const blankParagraphNode = new FakeHTMLElement("p", { innerHTML: " <br> &nbsp; <br /> " });
  const gridNode = new FakeHTMLElement("div", { isGrid: true });
  const surfaceElement = new FakeHTMLElement("div", {
    childNodes: [blankParagraphNode, gridNode],
  });

  setSelectionRange(createRange({ startContainer: blankParagraphNode, startOffset: 0 }));

  assert.equal(shouldPreventCandidateBlockGridNativeDeletion({ key: "Delete" }, surfaceElement), true);
});

test("candidate block native deletion guard prevents non-collapsed ranges that include a grid", async () => {
  const { shouldPreventCandidateBlockGridNativeDeletion } = await importClientModule("candidate-block-grid-adapter.js");
  const gridNode = new FakeHTMLElement("div", { isGrid: true });
  const paragraphNode = new FakeHTMLElement("p", { childNodes: [new FakeTextNode("ABC")] });
  const surfaceElement = new FakeHTMLElement("div", {
    childNodes: [paragraphNode, gridNode],
  });

  setSelectionRange(createRange({
    collapsed: false,
    commonAncestorContainer: surfaceElement,
    intersectsNode: (node) => node === gridNode,
    startContainer: paragraphNode,
    startOffset: 0,
  }));

  assert.equal(shouldPreventCandidateBlockGridNativeDeletion({ key: "Backspace" }, surfaceElement), true);
});

test("candidate block native deletion guard ignores selections outside the document surface", async () => {
  const { shouldPreventCandidateBlockGridNativeDeletion } = await importClientModule("candidate-block-grid-adapter.js");
  const surfaceElement = new FakeHTMLElement("div", {
    childNodes: [new FakeHTMLElement("div", { isGrid: true })],
  });
  const outsideTextNode = new FakeTextNode("outside");

  setSelectionRange(createRange({ startContainer: outsideTextNode, startOffset: 0 }));

  assert.equal(shouldPreventCandidateBlockGridNativeDeletion({ key: "Backspace" }, surfaceElement), false);
  assert.equal(shouldPreventCandidateBlockGridNativeDeletion({ key: "Delete" }, surfaceElement), false);
});
