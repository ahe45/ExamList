const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

class FakeHTMLElement {
  constructor(tagName) {
    this.ownerDocument = {
      defaultView: {
        HTMLElement: FakeHTMLElement,
      },
    };
    this.tagName = tagName;
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
