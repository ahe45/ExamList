const assert = require("node:assert/strict");
const test = require("node:test");

const geometry = require("./image-session-geometry.js");

test("image resize geometry converts visual pointer movement to logical pixels", () => {
  const nextRect = geometry.getTemplateEditorImageResizeRect(
    {
      directionX: 1,
      directionY: 1,
      maxDocumentHeight: 300,
      maxDocumentWidth: 300,
      scaleX: 2,
      scaleY: 0.5,
      startHeight: 40,
      startLeft: 0,
      startTop: 0,
      startWidth: 100,
      startX: 10,
      startY: 20,
    },
    {
      clientX: 50,
      clientY: 40,
      shiftKey: false,
    },
    5,
  );

  assert.equal(nextRect.width, 120);
  assert.equal(nextRect.height, 80);
});
