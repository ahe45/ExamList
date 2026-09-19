const assert = require("node:assert/strict");
const { evaluate } = require("../../smoke-browser-cdp");
const { setupCellObjectAlignment } = require("./cell-object-alignment");

async function runCellObjectKeyboardCheck(client) {
  const press = async (key, windowsVirtualKeyCode) => {
    await client.send("Input.dispatchKeyEvent", { type: "keyDown", key, windowsVirtualKeyCode });
    await client.send("Input.dispatchKeyEvent", { type: "keyUp", key, windowsVirtualKeyCode });
    await evaluate(client, "new Promise(resolve => requestAnimationFrame(resolve))");
  };
  for (const modal of [false, true]) {
    await evaluate(client, `(${setupCellObjectAlignment.toString()})(${modal})`);
    try {
      const original = await evaluate(client, "window.cellObjectAlignment.inspect()");
      const point = await evaluate(client, "window.cellObjectAlignment.clickPoint()");
      await client.send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...point });
      await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...point });
      let previous = await evaluate(client, "window.cellObjectAlignment.inspect()");
      assert.deepEqual(previous.cssSize, original.cssSize, "selecting a cell object at zoom must retain its size");
      for (const [key, code, dx, dy] of [["ArrowRight", 39, 1, 0], ["ArrowDown", 40, 0, 1], ["ArrowLeft", 37, -1, 0], ["ArrowUp", 38, 0, -1]]) {
        await press(key, code);
        const next = await evaluate(client, "window.cellObjectAlignment.inspect()");
        assert.ok(Math.abs(next.left - previous.left - dx) < 0.6 && Math.abs(next.top - previous.top - dy) < 0.6,
          `${modal ? "modal" : "page"} ${key}: object must move one logical pixel: ${JSON.stringify({previous, next})}`);
        assert.deepEqual(next.cssSize, original.cssSize, "arrow movement must not resize the object");
        assert.equal(next.otherText, original.otherText);
        assert.equal(next.inCell, true);
        assert.equal(next.tableHeight, original.tableHeight, "keyboard movement must not resize the table");
        previous = next;
      }
      for (const [alignment, key, code, axis, end] of [
        ["left", "ArrowLeft", 37, "left", false], ["top", "ArrowUp", 38, "top", false],
        ["right", "ArrowRight", 39, "left", true], ["bottom", "ArrowDown", 40, "top", true],
      ]) {
        await evaluate(client, `window.cellObjectAlignment.align('${alignment}')`);
        for (let i = 0; i < 20; i++) await press(key, code);
        const result = await evaluate(client, "window.cellObjectAlignment.inspect()");
        const dimension = axis === "left" ? 0 : 1;
        const expected = end ? result.cellSize[dimension] - result.size[dimension] : 0;
        assert.ok(Math.abs(result[axis] - expected) < 1.1, `${key} must stop at the cell boundary`);
        previous = result;
      }
      const reloaded = await evaluate(client, "window.cellObjectAlignment.reload()");
      assert.ok(Math.abs(reloaded.left - previous.left) < 1 && Math.abs(reloaded.top - previous.top) < 1, "keyboard position must persist");
      const textPoint = await evaluate(client, "window.cellObjectAlignment.textPoint()");
      await client.send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...textPoint });
      await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...textPoint });
      await press("ArrowLeft", 37);
      const textEdited = await evaluate(client, "window.cellObjectAlignment.inspect()");
      assert.equal(textEdited.left, reloaded.left, "text navigation must not move an unselected object");
    } finally { await evaluate(client, "window.cellObjectAlignment.dispose()"); }
  }
}

module.exports = { runCellObjectKeyboardCheck };
