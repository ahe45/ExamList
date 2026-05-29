const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

class FakeHTMLElement {
  constructor(tagName, { childNodes = [], isGrid = false } = {}) {
    this.childNodes = childNodes;
    this.isGrid = isGrid;
    this.ownerDocument = {
      defaultView: {
        HTMLElement: FakeHTMLElement,
      },
    };
    this.tagName = tagName;
  }

  matches(selector) {
    return this.isGrid && selector === "[data-candidate-block-grid], .examlist-candidate-block-grid";
  }
}

test("candidate block boundary node helper ignores blank text nodes", async () => {
  const { isIgnorableCandidateBlockBoundaryNode } = await importClientModule("candidate-block-grid-boundary.js");

  assert.equal(isIgnorableCandidateBlockBoundaryNode({ nodeType: 3, textContent: "" }, FakeHTMLElement), true);
  assert.equal(isIgnorableCandidateBlockBoundaryNode({ nodeType: 3, textContent: " \n\t " }, FakeHTMLElement), true);
  assert.equal(isIgnorableCandidateBlockBoundaryNode({ nodeType: 3, textContent: "A" }, FakeHTMLElement), false);
});

test("candidate block boundary node helper ignores only BR elements", async () => {
  const { isIgnorableCandidateBlockBoundaryNode } = await importClientModule("candidate-block-grid-boundary.js");

  assert.equal(isIgnorableCandidateBlockBoundaryNode(new FakeHTMLElement("BR"), FakeHTMLElement), true);
  assert.equal(isIgnorableCandidateBlockBoundaryNode(new FakeHTMLElement("DIV"), FakeHTMLElement), false);
  assert.equal(isIgnorableCandidateBlockBoundaryNode({ tagName: "BR" }, FakeHTMLElement), false);
});

test("candidate block boundary host helper treats line breaks and nonbreaking spaces as blank", async () => {
  const {
    isBlankCandidateBlockBoundaryHost,
    normalizeCandidateBlockBoundaryHostHtml,
  } = await importClientModule("candidate-block-grid-boundary.js");

  assert.equal(normalizeCandidateBlockBoundaryHostHtml(" <br> &nbsp; <br /> "), "");
  assert.equal(isBlankCandidateBlockBoundaryHost({ innerHTML: " <br> &nbsp; <br /> " }), true);
  assert.equal(isBlankCandidateBlockBoundaryHost({ innerHTML: "<span></span>" }), false);
  assert.equal(isBlankCandidateBlockBoundaryHost({ innerHTML: "text" }), false);
  assert.equal(isBlankCandidateBlockBoundaryHost(null), true);
});

test("candidate block boundary sibling helper scans forward while skipping ignorable nodes", async () => {
  const { getAdjacentCandidateBlockBoundaryNode } = await importClientModule("candidate-block-grid-boundary.js");
  const targetNode = new FakeHTMLElement("DIV");
  const parentNode = {
    childNodes: [
      { nodeType: 3, textContent: " " },
      new FakeHTMLElement("BR"),
      targetNode,
    ],
  };

  assert.equal(getAdjacentCandidateBlockBoundaryNode(parentNode, 0, "forward"), targetNode);
  assert.equal(getAdjacentCandidateBlockBoundaryNode(parentNode, 0, ""), targetNode);
});

test("candidate block boundary sibling helper scans backward while skipping ignorable nodes", async () => {
  const { getAdjacentCandidateBlockBoundaryNode } = await importClientModule("candidate-block-grid-boundary.js");
  const targetNode = new FakeHTMLElement("DIV");
  const parentNode = {
    childNodes: [
      targetNode,
      new FakeHTMLElement("BR"),
      { nodeType: 3, textContent: " " },
    ],
  };

  assert.equal(getAdjacentCandidateBlockBoundaryNode(parentNode, 2, "backward"), targetNode);
});

test("candidate block boundary sibling helper returns null when no non-ignorable node exists", async () => {
  const { getAdjacentCandidateBlockBoundaryNode } = await importClientModule("candidate-block-grid-boundary.js");
  const parentNode = {
    childNodes: [
      { nodeType: 3, textContent: " " },
      new FakeHTMLElement("BR"),
    ],
  };

  assert.equal(getAdjacentCandidateBlockBoundaryNode(parentNode, 0, "forward"), null);
  assert.equal(getAdjacentCandidateBlockBoundaryNode(parentNode, 1, "backward"), null);
  assert.equal(getAdjacentCandidateBlockBoundaryNode(parentNode, -1, "forward"), null);
  assert.equal(getAdjacentCandidateBlockBoundaryNode(parentNode, 2, "backward"), null);
  assert.equal(getAdjacentCandidateBlockBoundaryNode(null, 0, "forward"), null);
});

test("candidate block boundary grid helper returns the current grid node", async () => {
  const { getCandidateBlockGridFromBoundaryNode } = await importClientModule("candidate-block-grid-boundary.js");
  const gridNode = new FakeHTMLElement("DIV", { isGrid: true });

  assert.equal(getCandidateBlockGridFromBoundaryNode(gridNode, "forward"), gridNode);
  assert.equal(getCandidateBlockGridFromBoundaryNode(gridNode, "backward"), gridNode);
});

test("candidate block boundary grid helper scans nested nodes forward", async () => {
  const { getCandidateBlockGridFromBoundaryNode } = await importClientModule("candidate-block-grid-boundary.js");
  const gridNode = new FakeHTMLElement("DIV", { isGrid: true });
  const wrapperNode = new FakeHTMLElement("SPAN", {
    childNodes: [
      { nodeType: 3, textContent: " " },
      new FakeHTMLElement("BR"),
      gridNode,
    ],
  });
  const rootNode = new FakeHTMLElement("DIV", {
    childNodes: [
      { nodeType: 3, textContent: " " },
      wrapperNode,
    ],
  });

  assert.equal(getCandidateBlockGridFromBoundaryNode(rootNode, "forward"), gridNode);
  assert.equal(getCandidateBlockGridFromBoundaryNode(rootNode, ""), gridNode);
});

test("candidate block boundary grid helper scans nested nodes backward", async () => {
  const { getCandidateBlockGridFromBoundaryNode } = await importClientModule("candidate-block-grid-boundary.js");
  const gridNode = new FakeHTMLElement("DIV", { isGrid: true });
  const wrapperNode = new FakeHTMLElement("SPAN", {
    childNodes: [
      gridNode,
      new FakeHTMLElement("BR"),
      { nodeType: 3, textContent: " " },
    ],
  });
  const rootNode = new FakeHTMLElement("DIV", {
    childNodes: [
      wrapperNode,
      new FakeHTMLElement("BR"),
      { nodeType: 3, textContent: " " },
    ],
  });

  assert.equal(getCandidateBlockGridFromBoundaryNode(rootNode, "backward"), gridNode);
});

test("candidate block boundary grid helper stops at non-grid leaf nodes", async () => {
  const { getCandidateBlockGridFromBoundaryNode } = await importClientModule("candidate-block-grid-boundary.js");
  const leafNode = new FakeHTMLElement("SPAN");
  const rootNode = new FakeHTMLElement("DIV", {
    childNodes: [
      { nodeType: 3, textContent: " " },
      leafNode,
    ],
  });

  assert.equal(getCandidateBlockGridFromBoundaryNode(rootNode, "forward"), null);
  assert.equal(getCandidateBlockGridFromBoundaryNode({ nodeType: 3, textContent: "text" }, "forward"), null);
  assert.equal(getCandidateBlockGridFromBoundaryNode(null, "forward"), null);
});
