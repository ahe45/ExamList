const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

function createClassList(initialClasses = []) {
  const classes = new Set(initialClasses);

  return {
    add(value) {
      classes.add(value);
    },
    contains(value) {
      return classes.has(value);
    },
    remove(value) {
      classes.delete(value);
    },
    setFromString(value) {
      classes.clear();
      String(value || "")
        .split(/\s+/)
        .filter(Boolean)
        .forEach((className) => classes.add(className));
    },
    toString() {
      return Array.from(classes).join(" ");
    },
  };
}

function createFakeElement(attributes = {}) {
  const elementAttributes = new Map(Object.entries(attributes));
  const classList = createClassList();
  const element = {
    children: [],
    classList,
    style: {},
    textContent: "",
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    closest() {
      return this;
    },
    contains(node) {
      return node === this;
    },
    getAttribute(name) {
      return elementAttributes.get(name) || "";
    },
    getBoundingClientRect() {
      return { bottom: 128, height: 36, left: 80, top: 92, width: 40 };
    },
    hasAttribute(name) {
      return elementAttributes.has(name);
    },
    matches() {
      return false;
    },
    removeAttribute(name) {
      elementAttributes.delete(name);
    },
    setAttribute(name, value) {
      elementAttributes.set(name, String(value));
    },
  };

  Object.defineProperty(element, "className", {
    get() {
      return classList.toString();
    },
    set(value) {
      classList.setFromString(value);
    },
  });

  return element;
}

test("template editor toolbar tooltip shows immediately and suppresses native title", async () => {
  const listeners = {};
  const tooltipElement = createFakeElement();
  const buttonElement = createFakeElement({ title: "굵게" });
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;

  globalThis.document = {
    body: createFakeElement(),
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    createElement() {
      tooltipElement.getBoundingClientRect = () => ({ height: 28, width: 52 });
      return tooltipElement;
    },
  };
  globalThis.window = {
    addEventListener(type, handler) {
      listeners[`window:${type}`] = handler;
    },
    innerHeight: 800,
    innerWidth: 1200,
  };

  try {
    const { attachTemplateEditorToolbarTooltips } = await importClientModule("toolbar-tooltip.js");

    attachTemplateEditorToolbarTooltips();
    listeners.pointerover({ target: buttonElement });

    assert.equal(tooltipElement.textContent, "굵게");
    assert.equal(tooltipElement.classList.contains("hidden"), false);
    assert.equal(buttonElement.getAttribute("title"), "");
    assert.equal(buttonElement.getAttribute("data-template-editor-toolbar-tooltip-title"), "굵게");

    listeners.pointerout({ relatedTarget: null });

    assert.equal(tooltipElement.classList.contains("hidden"), true);
    assert.equal(buttonElement.getAttribute("title"), "굵게");
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});
