const { delay, requestJson } = require("../smoke-utils");

async function waitForServer(port, timeoutMs = 30000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await requestJson({
        path: "/api/auth/session",
        port,
      });

      if (response.statusCode === 200) {
        return;
      }

      lastError = new Error(`서버 응답 상태 ${response.statusCode}`);
    } catch (error) {
      lastError = error;
    }

    await delay(500);
  }

  throw lastError || new Error("서버 시작을 확인하지 못했습니다.");
}

async function waitForDevtools(debugPort, timeoutMs = 15000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await requestJson({
        path: "/json/list",
        port: debugPort,
      });

      if (response.statusCode === 200 && Array.isArray(response.json)) {
        const pageTarget =
          response.json.find((target) => target.type === "page" && target.url === "about:blank" && target.webSocketDebuggerUrl) ||
          response.json.find((target) => target.type === "page" && target.webSocketDebuggerUrl);

        if (pageTarget?.webSocketDebuggerUrl) {
          return pageTarget.webSocketDebuggerUrl;
        }
      }
    } catch (error) {
      lastError = error;
    }

    await delay(250);
  }

  throw lastError || new Error("브라우저 디버그 포트에 연결하지 못했습니다.");
}

function createCdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  const pageErrors = [];
  let nextId = 1;

  function decodeMessageData(data) {
    if (typeof data === "string") {
      return data;
    }

    if (Buffer.isBuffer(data)) {
      return data.toString("utf8");
    }

    return Buffer.from(data).toString("utf8");
  }

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(decodeMessageData(event.data));

    if (message.id && pending.has(message.id)) {
      const { reject, resolve } = pending.get(message.id);

      pending.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message || "CDP 명령 실패"));
      } else {
        resolve(message.result || {});
      }

      return;
    }

    if (message.method === "Runtime.exceptionThrown") {
      const details = message.params?.exceptionDetails || {};
      const exceptionDescription = details.exception?.description || details.exception?.value || "";
      const location = [details.url, details.lineNumber ? `:${details.lineNumber + 1}` : ""].filter(Boolean).join("");

      pageErrors.push(
        [details.text || "브라우저 런타임 오류", exceptionDescription, location ? `at ${location}` : ""]
          .filter(Boolean)
          .join(" "),
      );
    }
  });

  function send(method, params = {}) {
    const id = nextId;

    nextId += 1;

    return new Promise((resolve, reject) => {
      pending.set(id, { reject, resolve });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => {
      resolve({
        close: () => socket.close(),
        getPageErrors: () => [...pageErrors],
        send,
      });
    });
    socket.addEventListener("error", () => {
      reject(new Error("브라우저 WebSocket 연결에 실패했습니다."));
    });
  });
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    awaitPromise: true,
    expression,
    returnByValue: true,
  });

  if (result.exceptionDetails) {
    const details = result.exceptionDetails;
    const exceptionDescription = details.exception?.description || details.exception?.value || "";
    const location = [details.url, details.lineNumber ? `:${details.lineNumber + 1}` : ""].filter(Boolean).join("");

    throw new Error(
      [details.text || "브라우저 스크립트 실행 오류", exceptionDescription, location ? `at ${location}` : ""]
        .filter(Boolean)
        .join(" "),
    );
  }

  return result.result?.value;
}

async function waitForCondition(client, expression, description, timeoutMs = 12000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await evaluate(client, `Boolean(${expression})`)) {
      return;
    }

    await delay(250);
  }

  const diagnostic = await evaluate(
    client,
    `
      JSON.stringify({
        href: location.href,
        pathname: location.pathname,
        readyState: document.readyState,
        topbar: (() => {
          const topbar = document.querySelector("#topbar");
          const rect = topbar?.getBoundingClientRect();
          const style = topbar ? getComputedStyle(topbar) : null;

          return topbar && rect && style
            ? {
                left: rect.left,
                position: style.position,
                right: rect.right,
                styleLeft: style.left,
                styleRight: style.right,
                width: rect.width,
                windowWidth: window.innerWidth
              }
            : null;
        })(),
        brand: (() => {
          const brand = document.querySelector("#brandHome");
          const badge = brand?.querySelector(".brand-badge");
          const title = brand?.querySelector("h1");
          const brandStyle = brand ? getComputedStyle(brand) : null;
          const badgeRect = badge?.getBoundingClientRect();
          const titleStyle = title ? getComputedStyle(title) : null;

          return brand && badgeRect && brandStyle && titleStyle
            ? {
                badgeHeight: badgeRect.height,
                badgeWidth: badgeRect.width,
                columnGap: brandStyle.columnGap,
                paddingLeft: brandStyle.paddingLeft,
                titleFontSize: titleStyle.fontSize
              }
            : null;
        })(),
        logoutButton: (() => {
          const button = document.querySelector("#logoutButton");
          const style = button ? getComputedStyle(button) : null;

          return button && style
            ? {
                backgroundColor: style.backgroundColor,
                borderRadius: style.borderRadius,
                borderTopStyle: style.borderTopStyle,
                columnGap: style.columnGap,
                display: style.display,
                gap: style.gap,
                minHeight: style.minHeight,
                paddingLeft: style.paddingLeft
            }
            : null;
        })(),
        workspaceSidebar: (() => {
          const sidebar = document.querySelector("#workspaceSidebar");
          const activeItem = document.querySelector(".workspace-nav-item.active");
          const rect = sidebar?.getBoundingClientRect();
          const style = sidebar ? getComputedStyle(sidebar) : null;

          return sidebar && rect && style
            ? {
                activeLabel: activeItem?.textContent.trim() || "",
                activeView: activeItem?.dataset.goView || "",
                ariaHidden: sidebar.getAttribute("aria-hidden"),
                display: style.display,
                left: Math.round(rect.left),
                width: Math.round(rect.width)
              }
            : null;
        })(),
        editorLayoutChecks: window.__examlistSmokeEditorLayoutChecks || null,
        candidateGridLayoutChecks: window.__examlistSmokeCandidateGridChecks || null,
        editorTableMetrics: (() => {
          const table = document.querySelector('#templateEditorSurface .template-doc table');

          if (!table) {
            return null;
          }

          return {
            columnCount: table.querySelectorAll('colgroup col').length,
            columns: [...table.querySelectorAll('colgroup col')].map((column) => column.style.width || ''),
            rows: [...table.rows].map((row) => [...row.cells].map((cell) => Math.round(cell.getBoundingClientRect().width))),
            tableStyleWidth: table.style.width,
            tableWidth: Math.round(table.getBoundingClientRect().width)
          };
        })(),
        editorSurfaceHtml: String(document.querySelector('#templateEditorSurface .template-doc')?.innerHTML || "").slice(0, 500),
        candidateBlockTableMetrics: (() => {
          const blocks = [...document.querySelectorAll('#templateEditorSurface [data-candidate-block-instance]')];

          return blocks.map((block, index) => {
            const table = block.querySelector('table');
            const blockRect = block.getBoundingClientRect();
            const tableRect = table?.getBoundingClientRect();
            const tableStyle = table ? getComputedStyle(table) : null;

            return {
              blockClassName: block.className,
              childNodes: [...block.childNodes].map((node) => ({
                name: node.nodeType === Node.TEXT_NODE ? "#text" : node.nodeName,
                text: String(node.textContent || "").replace(/\s+/g, " ").slice(0, 20)
              })),
              blockHeight: Math.round(blockRect.height),
              blockWidth: Math.round(blockRect.width),
              index,
              tableDataset: table?.dataset?.candidateBlockTable || "",
              tableHeight: Math.round(tableRect?.height || 0),
              tableStyleDisplay: tableStyle?.display || "",
              tableStyleHeight: tableStyle?.height || "",
              tableStyleWidth: tableStyle?.width || "",
              tableWidth: Math.round(tableRect?.width || 0)
            };
          });
        })(),
        title: document.title,
        text: (document.body?.innerText || "").slice(0, 500)
      })
    `,
  ).catch(() => "");

  const pageErrors = typeof client.getPageErrors === "function" ? client.getPageErrors() : [];

  throw new Error(
    `${description} 조건을 만족하지 못했습니다.${diagnostic ? ` 현재 상태: ${diagnostic}` : ""}${
      pageErrors.length ? ` 페이지 오류: ${JSON.stringify(pageErrors)}` : ""
    }`,
  );
}

async function navigate(client, url) {
  await client.send("Page.navigate", { url });
  await waitForCondition(client, "document.readyState !== 'loading'", `${url} 로드`);
}

module.exports = {
  createCdpClient,
  evaluate,
  navigate,
  waitForCondition,
  waitForDevtools,
  waitForServer,
};
