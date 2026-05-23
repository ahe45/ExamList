const { evaluate } = require("./cdp-core");

async function dispatchBrowserKey(client, key, options = {}) {
  const code = options.code || key;
  const keyCode = Number(options.keyCode || 0);
  const params = {
    code,
    key,
    nativeVirtualKeyCode: keyCode,
    windowsVirtualKeyCode: keyCode,
  };

  await client.send("Input.dispatchKeyEvent", { ...params, type: "keyDown" });
  await client.send("Input.dispatchKeyEvent", { ...params, type: "keyUp" });
}

async function dispatchBrowserMouseClick(client, selector) {
  const pointJson = await evaluate(
    client,
    `
      JSON.stringify((() => {
        const element = document.querySelector(${JSON.stringify(selector)});

        if (!element) {
          return null;
        }

        element.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = element.getBoundingClientRect();

        if (!rect.width || !rect.height) {
          return null;
        }

        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      })())
    `,
  );
  const point = pointJson ? JSON.parse(pointJson) : null;

  if (!point) {
    throw new Error(`${selector} 요소를 클릭할 수 없습니다.`);
  }

  await client.send("Input.dispatchMouseEvent", {
    button: "left",
    clickCount: 1,
    type: "mousePressed",
    x: point.x,
    y: point.y,
  });
  await client.send("Input.dispatchMouseEvent", {
    button: "left",
    clickCount: 1,
    type: "mouseReleased",
    x: point.x,
    y: point.y,
  });
}

async function dispatchBrowserMouseClickAtPoint(client, point) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error("브라우저 클릭 좌표를 확인할 수 없습니다.");
  }

  await client.send("Input.dispatchMouseEvent", {
    button: "left",
    clickCount: 1,
    type: "mousePressed",
    x: point.x,
    y: point.y,
  });
  await client.send("Input.dispatchMouseEvent", {
    button: "left",
    clickCount: 1,
    type: "mouseReleased",
    x: point.x,
    y: point.y,
  });
}

async function getBrowserPoint(client, expression, description) {
  const pointJson = await evaluate(
    client,
    `
      JSON.stringify((() => {
        const point = (${expression});

        if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
          return null;
        }

        return { x: point.x, y: point.y };
      })())
    `,
  );
  const point = pointJson ? JSON.parse(pointJson) : null;

  if (!point) {
    throw new Error(`${description} 좌표를 확인할 수 없습니다.`);
  }

  return point;
}

async function dispatchBrowserMouseDrag(client, startPoint, endPoint, options = {}) {
  const modifiers = Number(options.modifiers || 0);
  const steps = Math.max(1, Math.round(Number(options.steps || 4)));

  await client.send("Input.dispatchMouseEvent", {
    modifiers,
    type: "mouseMoved",
    x: startPoint.x,
    y: startPoint.y,
  });
  await client.send("Input.dispatchMouseEvent", {
    button: "left",
    buttons: 1,
    clickCount: 1,
    modifiers,
    type: "mousePressed",
    x: startPoint.x,
    y: startPoint.y,
  });

  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;

    await client.send("Input.dispatchMouseEvent", {
      button: "left",
      buttons: 1,
      modifiers,
      type: "mouseMoved",
      x: startPoint.x + (endPoint.x - startPoint.x) * progress,
      y: startPoint.y + (endPoint.y - startPoint.y) * progress,
    });
  }

  await client.send("Input.dispatchMouseEvent", {
    button: "left",
    buttons: 0,
    clickCount: 1,
    modifiers,
    type: "mouseReleased",
    x: endPoint.x,
    y: endPoint.y,
  });
}

module.exports = {
  dispatchBrowserKey,
  dispatchBrowserMouseClick,
  dispatchBrowserMouseClickAtPoint,
  dispatchBrowserMouseDrag,
  getBrowserPoint,
};
