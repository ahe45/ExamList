// Exercises the editor in Chromium without touching application accounts or data.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { getAvailablePort, resolveBrowserPath } = require("./smoke-utils");
const {
  createCdpClient,
  evaluate,
  waitForDevtools,
} = require("./smoke-browser-cdp");

async function run() {
  const browserPath = resolveBrowserPath();
  if (!browserPath) throw new Error("Chrome or Edge is required");
  const project = path.resolve(__dirname, "..");
  const profile = await fs.mkdtemp(
    path.join(os.tmpdir(), "examlist-editor-port-"),
  );
  const server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    if (pathname === "/") {
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(
        '<!doctype html><html lang="ko"><head><meta charset="utf-8"></head><body><main id="editor"></main><script src="/client/template-editor-runtime/loader.js"></script></body></html>',
      );
      return;
    }
    const file = path.resolve(project, `.${pathname}`);
    if (
      !file.startsWith(project + path.sep) ||
      !/^\/(client|shared|styles)\//.test(pathname)
    ) {
      response.writeHead(404).end();
      return;
    }
    try {
      response.setHeader(
        "Content-Type",
        file.endsWith(".css") ? "text/css" : "application/javascript",
      );
      response.end(await fs.readFile(file));
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const debugPort = await getAvailablePort();
  const browser = spawn(
    browserPath,
    [
      "--headless",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1600,1100",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { windowsHide: true, stdio: "ignore" },
  );
  let client;
  try {
    client = await createCdpClient(await waitForDevtools(debugPort));
    await client.send("Runtime.enable");
    await client.send("Page.enable");
    await client.send("Page.navigate", { url: `http://127.0.0.1:${port}/` });
    const { waitForCondition } = require("./smoke-browser-cdp");
    await waitForCondition(
      client,
      "window.ExamListTemplateEditorRuntimeLoader",
      "editor loader",
    );
    const result = await evaluate(client, `(${browserChecks.toString()})()`);
    assert.equal(result.failed.length, 0, JSON.stringify(result, null, 2));
    const blankPaperPoint = await evaluate(client, `(${setupBlankPaperCaretCheck.toString()})()`);
    await client.send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...blankPaperPoint });
    await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...blankPaperPoint });
    const caretResult = await evaluate(client, `(() => {
      const host = document.querySelector('[data-template-object-caret-host]');
      const selection = getSelection();
      return {
        inHost: !!host && (selection.anchorNode === host || host.contains(selection.anchorNode)),
        hostHeight: host?.getBoundingClientRect().height,
        flowHeight: host ? host.offsetHeight + parseFloat(getComputedStyle(host).marginBottom) : -1,
        indicatorVisible: !!host?.hasAttribute('data-template-object-caret-active') && getComputedStyle(host.querySelector('.template-object-caret'), '::after').content === '\"\"',
        caretLineHeight: host ? parseFloat(getComputedStyle(host).lineHeight) : 0,
        paintedCaretHeight: selection.rangeCount ? selection.getRangeAt(0).getBoundingClientRect().height : 0,
        serializedGuard: window.blankPaperEditor.getHtml().includes('template-object-caret') || window.blankPaperEditor.getHtml().includes('\\u200B'),
        textBefore: document.querySelector('[data-template-editor-runtime-surface] table')?.textContent,
      };
    })()`);
    assert.equal(caretResult.inHost, true, "blank-paper click must place the caret below the object");
    assert.equal(caretResult.flowHeight, 0, "caret must not reserve a blank line");
    assert.ok(caretResult.hostHeight > 0 && caretResult.indicatorVisible, "empty caret must paint even when the browser suppresses its native caret");
    assert.ok(caretResult.caretLineHeight > 0, "native caret needs a visible line box");
    assert.ok(caretResult.paintedCaretHeight > 0, "empty caret must have a paintable text position before typing");
    assert.equal(caretResult.serializedGuard, false, "focusing a blank caret must not save its temporary marker");
    await client.send("Input.imeSetComposition", { text: "표", selectionStart: 1, selectionEnd: 1 });
    const composingCaret = await evaluate(client, `(() => {
      const anchor = getSelection().anchorNode;
      const element = anchor.nodeType === 1 ? anchor : anchor.parentElement;
      return { nativeVisible: getComputedStyle(element).caretColor !== 'rgba(0, 0, 0, 0)', lineHeight: element.closest('p').getBoundingClientRect().height };
    })()`);
    assert.ok(composingCaret.nativeVisible && composingCaret.lineHeight > 0, "IME composition must switch to the visible native caret");
    await client.send("Input.insertText", { text: "표 아래 입력" });
    const typedResult = await evaluate(client, `(() => {
      const surface = document.querySelector('[data-template-editor-runtime-surface]');
      const paragraph = Array.from(surface.querySelectorAll('.template-doc > p')).find(p => p.textContent.includes('표 아래 입력'));
      const html = window.blankPaperEditor.getHtml();
      return { typedBelow: !!paragraph && paragraph.getBoundingClientRect().height > 0, tableText: surface.querySelector('table').textContent, serializedGuard: html.includes('template-object-caret') || html.includes('\\u200B') };
    })()`);
    assert.equal(typedResult.typedBelow, true, "typing after clicking empty paper must create a visible text line");
    assert.equal(typedResult.tableText, caretResult.textBefore, "typing must not modify the table cell");
    assert.equal(typedResult.serializedGuard, false, "typed text must serialize without the temporary caret marker");
    result.passed.push("native blank-paper click shows the zero-space caret below a floating table and accepts typing");
    assert.deepEqual(client.getPageErrors(), []);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    client?.close();
    browser.kill();
    server.close();
    await fs
      .rm(profile, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 200,
      })
      .catch(() => {});
  }
}

async function setupBlankPaperCaretCheck() {
  const root = document.querySelector("#editor");
  root.replaceChildren();
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "/styles/features/template-editor/document-surface.css";
  await new Promise((resolve, reject) => {
    css.onload = resolve;
    css.onerror = reject;
    document.head.append(css);
  });
  window.blankPaperEditor = await ExamListTemplateEditorRuntimeLoader.createTemplateEditor({
    baseUrl: "/client/template-editor-runtime/",
    root,
    initialHtml: '<div class="template-doc"><table style="position:absolute;left:0;top:0;width:300px;height:100px"><tr><td>기본 양식 표</td></tr></table></div>',
  });
  const surface = root.querySelector("[data-template-editor-runtime-surface]");
  const tableRect = surface.querySelector("table").getBoundingClientRect();
  const paperRect = surface.querySelector(".template-doc").getBoundingClientRect();
  return { x: paperRect.left + paperRect.width / 2, y: tableRect.bottom + 140 };
}

async function browserChecks() {
  const root = document.querySelector("#editor");
  const editor = await ExamListTemplateEditorRuntimeLoader.createTemplateEditor(
    {
      baseUrl: "/client/template-editor-runtime/",
      root,
      initialHtml: '<div class="template-doc"><p>처음</p></div>',
      tags: [
        {
          key: "candidate.name",
          label: "이름",
          token: "@{이름}",
          example: "홍길동",
        },
      ],
    },
  );
  const surface = root.querySelector("[data-template-editor-runtime-surface]");
  const state = editor.state.templateEditor;
  const passed = [],
    failed = [];
  const expect = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const check = async (name, action) => {
    try {
      await action();
      passed.push(name);
    } catch (error) {
      failed.push({ name, error: error.message });
    }
  };
  const tick = () => new Promise((resolve) => setTimeout(resolve, 30));
  const reset = (html) => {
    editor.setHtml('<div class="template-doc">' + html + "</div>");
    surface.focus();
  };
  const select = (node, start = 0, endNode = node, end = start) => {
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(endNode, end);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    state.savedRange = range.cloneRange();
    state.savedSelectionSnapshot = null;
    return range;
  };
  const clipboard = (type, data = {}, target = surface) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: {
        getData: (key) => data[key] || "",
        setData: (key, value) => {
          data[key] = value;
        },
      },
    });
    target.dispatchEvent(event);
    return { event, data };
  };
  await check(
    "copied tables retain geometry, styles and safe content; undo/redo",
    () => {
      reset(
        '<table id="original" style="width:300px;height:100px"><colgroup><col style="width:90px"><col style="width:210px"></colgroup><tbody><tr><td style="font-family:serif;color:rgb(255, 0, 0);padding:4px">왼쪽</td><td>오른쪽</td></tr></tbody></table><p>다음</p>',
      );
      const table = surface.querySelector("table");
      table.classList.add("is-selected-table-object");
      state.selectedTableElement = table;
      getSelection().removeAllRanges();
      const { event, data } = clipboard("copy", {}, document.body);
      expect(
        event.defaultPrevented && data["text/plain"] === "왼쪽\t오른쪽",
        "whole table must copy without a text range",
      );
      expect(
        !data["text/html"].includes('id="original"') &&
          !data["text/html"].includes("is-selected-table-object"),
        "transient state copied",
      );
      data["text/html"] = data["text/html"]
        .replace("<td", '<td onclick="alert(1)"')
        .replace("</td>", "<script>alert(1)</script></td>");
      expect(
        clipboard("paste", data).event.defaultPrevented,
        "table paste not handled",
      );
      expect(
        surface.querySelectorAll("table").length === 2,
        "table not inserted",
      );
      const copy = surface.querySelectorAll("table")[1];
      expect(
        copy.textContent === "왼쪽오른쪽" &&
          !copy.querySelector("script,[onclick]"),
        "unsafe pasted HTML",
      );
      expect(copy.style.width === table.style.width, "table width changed");
      expect(copy.style.height === table.style.height, "table height changed");
      expect(
        Array.from(
          copy.querySelectorAll("col"),
          (col) => col.style.width,
        ).join() ===
          Array.from(
            table.querySelectorAll("col"),
            (col) => col.style.width,
          ).join(),
        "column proportions changed",
      );
      expect(
        copy.querySelector("td").style.color === "rgb(255, 0, 0)",
        "table color lost",
      );
      expect(
        copy.querySelector("td").style.padding === "4px",
        "cell padding lost",
      );
      editor.undo();
      expect(
        surface.querySelectorAll("table").length === 1,
        "paste undo failed",
      );
      editor.redo();
      expect(
        surface.querySelectorAll("table").length === 2,
        "paste redo failed",
      );
      const input = document.createElement("input");
      root.append(input);
      input.focus();
      expect(
        !clipboard("copy", {}, input).event.defaultPrevented,
        "input copy intercepted",
      );
      expect(
        !clipboard("paste", data, input).event.defaultPrevented,
        "input paste intercepted",
      );
      input.remove();
      surface.focus();
      expect(
        !clipboard("paste", { "text/plain": "일반 텍스트" }).event
          .defaultPrevented,
        "ordinary text paste intercepted",
      );
    },
  );
  await check(
    "cell Delete clears selected contents and keeps table/other cells",
    () => {
      reset(
        '<table style="width:300px"><tbody><tr><td>지울 내용</td><td>유지</td></tr></tbody></table>',
      );
      const table = surface.querySelector("table"),
        cells = Array.from(table.rows[0].cells);
      state.tableSelection = {
        table,
        selectedCells: [cells[0]],
        anchorCell: cells[0],
        focusCell: cells[0],
      };
      cells[0].classList.add("is-selected-cell");
      const event = new KeyboardEvent("keydown", {
        key: "Delete",
        bubbles: true,
        cancelable: true,
      });
      surface.dispatchEvent(event);
      expect(event.defaultPrevented, "delete not handled");
      expect(
        surface.querySelectorAll("td").length === 2 &&
          cells[0].textContent === "" &&
          cells[1].textContent === "유지",
        "table content/structure damaged",
      );
      editor.undo();
      expect(
        surface.querySelector("td").textContent === "지울 내용",
        "cell clear undo failed",
      );
    },
  );
  await check("Korean composition survives queued sync and Enter", async () => {
    reset("<p>작</p>");
    const paragraph = surface.querySelector("p");
    const composition = (type) =>
      surface.dispatchEvent(new CompositionEvent(type, { bubbles: true }));
    composition("compositionstart");
    composition("compositionend");
    composition("compositionstart");
    paragraph.textContent = "작ㅅ";
    editor.sync();
    const enter = new KeyboardEvent("keydown", {
      key: "Enter",
      isComposing: true,
      bubbles: true,
      cancelable: true,
    });
    surface.dispatchEvent(enter);
    await tick();
    expect(
      paragraph.isConnected &&
        paragraph.textContent === "작ㅅ" &&
        state.isComposing,
      "in-progress IME replaced",
    );
    expect(!enter.defaultPrevented, "IME Enter intercepted");
    paragraph.textContent = "작성";
    composition("compositionend");
    await tick();
    expect(
      !state.isComposing && editor.getHtml().includes("작성"),
      "committed IME not synchronized",
    );
  });
  await check(
    "BR-separated lines align individually and preserve text selection",
    () => {
      reset(
        '<p style="text-align:left"><b>첫 줄<br><br><span>제목</span></b><br>마지막</p><p>다른 문단</p>',
      );
      const title = surface.querySelector("b > span").firstChild;
      select(title, 0, title, 2);
      editor.applyCommand("justifyCenter");
      const content = surface.querySelector(".template-doc"),
        lines = content.firstElementChild.children;
      expect(
        lines.length === 4 &&
          lines[2].style.textAlign === "center" &&
          !lines[0].style.textAlign,
        "other lines aligned or empty line lost",
      );
      expect(
        getSelection().toString() === "제목",
        "alignment lost selected text",
      );
      editor.applyCommand("justifyFull");
      expect(
        lines[2].style.textAlignLast === "justify",
        "distributed alignment missing",
      );
      editor.applyCommand("justifyLeft");
      expect(lines[2].style.textAlignLast === "auto", "distribution not reset");
      const html = ExamListDocumentHtmlSanitizer.sanitizeHtml(editor.getHtml());
      expect(html.includes("text-align-last: auto"), "save drops alignment");
    },
  );
  await check("formatting is one undo step and maintains selection", async () => {
    reset(
      '<p style="line-height:20px;font-size:10px">앞 <span>선택한 글</span> 뒤</p>',
    );
    const text = surface.querySelector("span").firstChild;
    select(text, 0, text, text.length);
    const before = editor.getHtml(),
      historyBefore = state.historyIndex;
    editor.applyCommand("fontSizePx", "24");
    expect(
      getSelection().toString() === "선택한 글",
      "font size loses selection",
    );
    const formattedStyle = getComputedStyle(
      getSelection().anchorNode.parentElement,
    );
    expect(
      Math.abs(
        parseFloat(formattedStyle.lineHeight) -
          parseFloat(formattedStyle.fontSize) -
          10,
      ) < 0.2,
      "fixed line height did not preserve the authored 10px spacing",
    );
    expect(
      state.historyIndex === historyBefore + 1,
      "format generates multiple undo steps",
    );
    editor.undo();
    expect(
      editor.getHtml() === before,
      "format undo does not restore original",
    );
    editor.redo();
    const { bindLineHeightControl } = await import("/client/features/template-editor/editor-line-height-control.js");
    const toolbarHost = root.querySelector("[data-template-editor-runtime-toolbar]");
    const dispose = bindLineHeightControl({ editor, surfaceElement: surface, toolbarHost });
    try {
      const walker = document.createTreeWalker(surface.querySelector("p"), NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (walker.currentNode.textContent === "선택한 글") {
          select(walker.currentNode, 0, walker.currentNode, walker.currentNode.textContent.length);
          break;
        }
      }
      document.dispatchEvent(new Event("selectionchange"));
      toolbarHost.querySelector('[data-template-line-height-option="5"]').click();
      const style = getComputedStyle(walker.currentNode.parentElement);
      expect(Math.abs(parseFloat(style.lineHeight) - parseFloat(style.fontSize) - 5 * 4 / 3) < 0.2, "spacing control did not update enlarged inline text");
    } finally { dispose(); }
  });
  await check(
    "tag caret is editable and omitted from serialized HTML",
    async () => {
      reset("<p><br></p>");
      select(surface.querySelector("p"), 0);
      editor.insertTag("@{이름}");
      expect(
        surface.querySelector(".template-token") &&
          !surface.querySelector("p br"),
        "tag inserted with an extra placeholder line",
      );
      reset(
        '<p><span class="template-token" contenteditable="false" data-template-tag-value="@{이름}">이름</span></p>',
      );
      const token = surface.querySelector(".template-token");
      const range = document.createRange();
      range.setStartAfter(token);
      range.collapse(true);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
      const guard = surface.querySelector(".template-token-caret");
      expect(guard, "tag has no editable caret");
      guard.append(" 뒤쪽");
      const html = editor.getHtml();
      expect(
        html.includes(" 뒤쪽") &&
          !html.includes("template-token-caret") &&
          !html.includes("\u200B"),
        "caret serialization changed typed text",
      );
      await tick();
    },
  );
  await check("blank lines remain deletable until the final caret host", () => {
    reset("<p><br></p><p><br></p>");
    select(surface.querySelectorAll("p")[1], 0);
    const event = new KeyboardEvent("keydown", {
      key: "Backspace",
      bubbles: true,
      cancelable: true,
    });
    surface.dispatchEvent(event);
    expect(
      !event.defaultPrevented,
      "multiple blank lines incorrectly protected",
    );
    reset("<p><br></p>");
    const last = new KeyboardEvent("keydown", {
      key: "Backspace",
      bubbles: true,
      cancelable: true,
    });
    surface.dispatchEvent(last);
    expect(
      last.defaultPrevented && surface.querySelector(".template-doc p"),
      "last caret host removed",
    );
  });
  await check(
    "object caret placeholders take no space but typed text and intentional blank lines remain",
    async () => {
      const hostFlow = await import("/client/features/template-editor/object-flow-reflow.js");
      for (const sync of [hostFlow.syncTemplateEditorObjectFlowObjects, ExamListTemplateEditorObjectFlowReflow.syncTemplateEditorObjectFlowObjects]) {
        reset('<table style="width:200px;height:100px"><tr><td>표</td></tr></table>');
        const doc = surface.querySelector(".template-doc");
        sync(doc);
        let caret = doc.querySelector("[data-template-object-caret-host]");
        expect(caret && caret.getBoundingClientRect().height === 0, "automatic caret paragraph reserves height");
        const saved = editor.getHtml();
        expect(!saved.includes("data-template-object-caret-host") && !saved.includes("<p><br></p>"), "automatic blank line was serialized");
        select(caret, 0);
        document.execCommand("insertText", false, "아래 내용");
        sync(doc);
        caret = doc.querySelector("p");
        expect(caret.textContent.includes("아래 내용") && caret.getBoundingClientRect().height > 0, "typing below the object stayed collapsed");
        caret.innerHTML = "<br><br>";
        sync(doc);
        expect(!caret.hasAttribute("data-template-object-caret-host") && caret.getBoundingClientRect().height > 0, "intentional line breaks collapsed");
        caret.innerHTML = "<br>";
        caret.insertAdjacentHTML("afterend", "<p><br></p>");
        sync(doc);
        editor.setHtml(editor.getHtml());
        const restoredDoc = surface.querySelector(".template-doc");
        sync(restoredDoc);
        const restoredLines = restoredDoc.querySelectorAll("p");
        expect(restoredLines.length === 2 && restoredLines[0].getBoundingClientRect().height === 0 && restoredLines[1].getBoundingClientRect().height > 0, "saved intentional blank line was lost");
      }
    },
  );
  await check(
    "data-block modal keeps Apply below the canvas and supports scaled table dragging and cancel/apply",
    async () => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href =
        "/styles/features/template-editor/document-surface/candidate-block-grid.css";
      await new Promise((resolve, reject) => {
        css.onload = resolve;
        css.onerror = reject;
        document.head.append(css);
      });
      const overlayCss = document.createElement("link");
      overlayCss.rel = "stylesheet";
      overlayCss.href = "/styles/features/template-editor/document-surface/image-selection.css";
      await new Promise((resolve, reject) => {
        overlayCss.onload = resolve;
        overlayCss.onerror = reject;
        document.head.append(overlayCss);
      });
      const { createCandidateBlockGridElement } =
        await import("/client/features/template-editor/candidate-block-grid-renderer.js");
      const { normalizeCandidateBlockGridConfig } =
        await import("/client/features/template-editor/candidate-block-grid-config.js");
      const {
        openCandidateBlockFocusEditor,
        closeCandidateBlockFocusEditor,
        cancelCandidateBlockFocusEditor,
      } =
        await import("/client/features/template-editor/candidate-block-grid-focus-editor.js");
      const config = normalizeCandidateBlockGridConfig({
        enabled: true,
        variant: "photo",
        rows: 1,
        columns: 1,
        widthPt: 300,
        heightPt: 150,
        blockTemplateHtml: "<p>기존 내용</p>",
      });
      const selectedPage = {
        id: "test-page",
        type: "content",
        settings: { candidateBlockGrid: config },
      };
      reset(createCandidateBlockGridElement(config).outerHTML);
      const block = surface.querySelector(
        "[data-candidate-block-template-role='source']",
      );
      let dirtyCount = 0;
      const open = () =>
        openCandidateBlockFocusEditor({
          blockElement: block,
          editor,
          surfaceElement: surface,
          selectedPage,
          onDirty: () => dirtyCount++,
        });
      try {
        expect(open(), "modal did not open");
        let modal = surface.querySelector(
          "[data-template-editor-runtime-active-surface='true']",
        );
        modal.focus();
        select(modal.querySelector("p").firstChild, 2);
        let warnings = 0;
        const warning = () => warnings++;
        surface.addEventListener("template-editor-paste-error", warning);
        clipboard(
          "paste",
          {
            "text/html":
              '<table data-template-table-clipboard="true" style="width:1000px;height:600px"><tr><td>큰 표</td></tr></table>',
          },
          modal,
        );
        expect(
          warnings === 1 && !modal.querySelector("table"),
          "oversized table was squeezed or inserted",
        );
        surface.removeEventListener("template-editor-paste-error", warning);
        editor.applyCommand("justifyRight");
        expect(
          modal.querySelector("p").style.textAlign === "right",
          "modal alignment targeted parent document",
        );
        expect(cancelCandidateBlockFocusEditor(), "cancel failed");
        expect(
          dirtyCount === 0 &&
            selectedPage.settings.candidateBlockGrid.blockTemplateHtml ===
              "<p>기존 내용</p>",
          "cancel changed saved data",
        );
        expect(open(), "modal did not reopen");
        modal = surface.querySelector(
          "[data-template-editor-runtime-active-surface='true']",
        );
        modal.innerHTML = "<p><br></p>";
        modal.focus();
        select(modal.querySelector("p"), 0);
        clipboard(
          "paste",
          {
            "text/html":
              '<table data-template-table-clipboard="true" style="width:200px;height:60px"><colgroup><col style="width:70px"><col style="width:130px"></colgroup><tr><td>복사</td><td>유지</td></tr></table>',
          },
          modal,
        );
        expect(
          modal.querySelector("table")?.style.width === "200px",
          "modal paste width changed",
        );
        const layer = modal.closest("[data-candidate-block-focus-layer]");
        const apply = layer.querySelector("[data-candidate-block-focus-apply]");
        const cancel = layer.querySelector("[data-candidate-block-focus-cancel]");
        const viewportRect = layer.querySelector("[data-candidate-block-focus-viewport]").getBoundingClientRect();
        const buttonRect = apply.getBoundingClientRect();
        const panelRect = layer.getBoundingClientRect();
        expect(buttonRect.top >= viewportRect.bottom && buttonRect.bottom <= panelRect.bottom, "Apply overlaps editor or escapes panel");
        expect(buttonRect.width >= 64 && buttonRect.height >= 32 && Math.abs(cancel.getBoundingClientRect().top - buttonRect.top) < 1, "action buttons are malformed");
        // Canvas zoom combines with the modal's own magnification.
        layer.style.transform = "scale(0.8)";
        layer.style.transformOrigin = "top left";
        const table = modal.querySelector("table");
        const tableRect = table.getBoundingClientRect();
        table.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0, pointerId: 71, clientX: tableRect.left + 1, clientY: tableRect.top + 3 }));
        const overlay = surface.querySelector("[data-template-table-object-overlay='selection']");
        const handle = overlay?.querySelector("[data-template-table-object-move-handle]");
        expect(state.selectedTableElement === table && handle && getComputedStyle(handle).display !== "none", "table move handle is hidden");
        const overlayRect = overlay.getBoundingClientRect();
        expect(Math.abs(overlayRect.left - tableRect.left) <= 1 && Math.abs(overlayRect.top - tableRect.top) <= 1 && Math.abs(overlayRect.width - tableRect.width) <= 1, "table handles are misplaced under canvas zoom");
        const handleRect = handle.getBoundingClientRect();
        const pointer = { bubbles: true, cancelable: true, button: 0, pointerId: 72, clientX: handleRect.left + 12, clientY: handleRect.top + 12 };
        handle.dispatchEvent(new PointerEvent("pointerdown", pointer));
        const move = state.tableObjectMoveSession;
        expect(move?.isCandidateBlockTable, "block drag did not start");
        window.dispatchEvent(new PointerEvent("pointermove", { ...pointer, clientX: pointer.clientX + 20 * move.scaleX, clientY: pointer.clientY + 15 * move.scaleY }));
        window.dispatchEvent(new PointerEvent("pointerup", pointer));
        expect(modal.contains(table) && parseFloat(table.style.left) === move.startLeft + 20 && parseFloat(table.style.top) === move.startTop + 15, "scaled drag moved the wrong distance or escaped block");
        apply.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0 }));
        expect(!document.querySelector("[data-candidate-block-focus-layer]"), "Apply button did not close modal");
        const saved =
          selectedPage.settings.candidateBlockGrid.blockTemplateHtml;
        expect(
          saved.includes("복사") && saved.includes("200px") && dirtyCount === 1,
          "modal change not committed once",
        );
        expect(
          !saved.includes("template-editor-table-selection"),
          "selection UI saved",
        );
        expect(saved.includes("left: 20px") && saved.includes("top: 15px"), "moved table position was not saved");
        const serialized = editor.getHtml();
        editor.setHtml(serialized);
        expect(
          surface.querySelector("table")?.style.width === "200px",
          "table width lost on reload",
        );
      } finally {
        cancelCandidateBlockFocusEditor();
        css.remove();
        overlayCss.remove();
      }
    },
  );
  await check("data-block movement after saving updates the current page and survives repeated saves", async () => {
    const { bindCandidateBlockGridControls, commitCandidateBlockGridControlsToPage } = await import("/client/features/template-editor/candidate-block-grid-adapter.js");
    const { createCandidateBlockGridElement, buildCandidateBlockGridHtml } = await import("/client/features/template-editor/candidate-block-grid-renderer.js");
    const { normalizeCandidateBlockGridConfig } = await import("/client/features/template-editor/candidate-block-grid-config.js");
    const { collapseCandidateBlockGridForStorage } = await import("/client/features/template-editor/candidate-block-grid-dom.js");
    const page = { id: "save-position", type: "content", settings: { candidateBlockGrid: normalizeCandidateBlockGridConfig({ enabled: true, rows: 10, columns: 2, widthPt: 450, heightPt: 600, yPt: 112.5, gapXPt: 1, gapYPt: 1, blockTemplateHtml: "<p>수험생</p>" }) } };
    const appState = { templateEditor: { selectedPageId: page.id, template: { layout: { pages: [page] } } } };
    reset('<p style="height:38px;margin:0">제목</p><table style="position:absolute;top:44px;left:0;width:600px;height:49px"><tr><td>시험시간 / 고사실번호 / 고사장</td></tr></table>');
    const doc = surface.querySelector(".template-doc");
    doc.style.position = "relative";
    doc.style.setProperty("height", "1045px", "important");
    doc.style.setProperty("width", "716px", "important");
    doc.append(createCandidateBlockGridElement(page.settings.candidateBlockGrid));
    const panel = document.createElement("div");
    document.body.append(panel);
    const dispose = bindCandidateBlockGridControls({ appState, editor, pagePropertiesHost: panel, selectedPage: page, surfaceElement: surface });
    try {
      for (let save = 0; save < 3; save += 1) {
        // A successful save replaces the page payload while the mounted editor stays alive.
        appState.templateEditor.template = structuredClone(appState.templateEditor.template);
        const currentPage = appState.templateEditor.template.layout.pages[0];
        const grid = surface.querySelector("[data-candidate-block-grid]");
        const top = 120 + save * 4;
        grid.style.top = `${top}px`;
        grid.dispatchEvent(new CustomEvent("examlist:object-flow-layoutchange", { bubbles: true }));
        expect(currentPage.settings.candidateBlockGrid.yPt === top * .75, `movement was written to the stale pre-save page: ${JSON.stringify({ current: currentPage.settings.candidateBlockGrid.yPt, old: page.settings.candidateBlockGrid.yPt, top, position: grid.style.position })}`);
        commitCandidateBlockGridControlsToPage({ pagePropertiesHost: panel, selectedPage: currentPage, surfaceElement: surface });
        expect(parseFloat(surface.querySelector("[data-candidate-block-grid]").style.top) === top, "save restored an earlier block position");
        const stored = document.createElement("div");
        stored.innerHTML = editor.getHtml();
        collapseCandidateBlockGridForStorage(stored);
        currentPage.settings.documentHtml = stored.innerHTML;
        const restored = document.createElement("div");
        restored.innerHTML = buildCandidateBlockGridHtml(currentPage);
        expect(restored.querySelectorAll("[data-candidate-block-grid]").length === 1, "reload duplicated the data-block placeholder");
        expect(Math.abs(parseFloat(restored.querySelector("[data-candidate-block-grid]").style.top) - top) <= 1, `reload changed the saved position: ${JSON.stringify(Array.from(restored.querySelectorAll("[data-candidate-block-grid]"), e => e.getAttribute("style")))}`);
      }
      const grid = surface.querySelector("[data-candidate-block-grid]");
      const handle = grid.querySelector("[data-candidate-block-grid-move-handle]");
      grid.focus();
      const pointer = { bubbles: true, cancelable: true, button: 0, pointerId: 84, clientX: 10, clientY: 200 };
      handle.dispatchEvent(new PointerEvent("pointerdown", pointer));
      window.dispatchEvent(new PointerEvent("pointermove", { ...pointer, clientY: pointer.clientY + 40 - parseFloat(grid.style.top) }));
      window.dispatchEvent(new PointerEvent("pointerup", pointer));
      await tick();
      expect(surface.contains(grid), "moving a focused grid detached it during blur synchronization");
      expect(doc.querySelector("table").getBoundingClientRect().top >= grid.getBoundingClientRect().bottom - 1, "upward grid drag failed to push the header table down");
    } finally {
      dispose?.();
      panel.remove();
    }
  });
  await check("all page objects reserve rows, push text and each other, and retain moved order after serialization at any zoom", async () => {
    const hostFlow = await import("/client/features/template-editor/object-flow-reflow.js");
    for (const flow of [hostFlow, ExamListTemplateEditorObjectFlowReflow]) {
      for (const zoom of [.6, 1, 1.5]) {
        const host = document.createElement("div");
        host.className = "template-editor-surface editor-document-surface";
        host.style.cssText = `transform:scale(${zoom});transform-origin:top left`;
        host.innerHTML = '<div class="template-doc" style="position:relative;width:600px;height:900px;border:1px solid"><p style="height:20px;line-height:20px;margin:0">앞 문장</p><table style="position:absolute;top:20px;left:0;width:200px;height:40px;border-collapse:collapse"><tr><td>표</td></tr></table><p style="height:20px;line-height:20px;margin:0">중간 문장</p><div data-candidate-block-grid="true" style="position:absolute;top:80px;left:0;width:200px;height:50px">데이터 블록</div><p style="height:20px;line-height:20px;margin:0">다음 문장</p><img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2230%22/%3E" style="position:absolute;top:150px;left:0;width:40px;height:30px"><p style="height:20px;line-height:20px;margin:0">마지막 문장</p></div>';
        document.body.append(host);
        let doc = host.firstElementChild;
        const assertRows = () => {
          const rows = Array.from(doc.children).filter(e => !e.hasAttribute("data-template-object-flow-spacer") && !e.hasAttribute("data-template-object-caret-host"));
          for (let i = 1; i < rows.length; i += 1) {
            expect(rows[i].getBoundingClientRect().top >= rows[i - 1].getBoundingClientRect().bottom - 1, `${zoom}: overlapping ${rows[i - 1].tagName} / ${rows[i].tagName}`);
          }
        };
        const move = (element, top) => {
          const movementY = top - parseFloat(element.style.top);
          element.style.top = `${top}px`;
          flow.reflowTemplateEditorObjectRows(element, { documentElement: doc, activeTop: top, activeHeight: element.offsetHeight, movementY, strictGeometry: true });
          assertRows();
        };
        try {
          flow.syncTemplateEditorObjectFlowObjects(doc);
          assertRows();
          move(doc.querySelector("img"), 10);
          expect(doc.firstElementChild.hasAttribute("data-template-object-flow-spacer"), "image did not move before the first text row");
          move(doc.querySelector("table"), 240);
          move(doc.querySelector("[data-candidate-block-grid]"), 60);
          const img = doc.querySelector("img");
          img.style.height = "90px";
          flow.reflowTemplateEditorObjectRows(img, { documentElement: doc, activeTop: parseFloat(img.style.top), activeHeight: 90, reorderByPosition: false, strictGeometry: true });
          assertRows();
          const geometry = () => Array.from(doc.children).filter(e => e.matches("table,img,[data-candidate-block-grid]")).map(e => [e.tagName, parseFloat(e.style.top), e.offsetHeight]);
          const before = geometry();
          for (let i = 0; i < 20; i += 1) flow.syncTemplateEditorObjectFlowObjects(doc);
          expect(JSON.stringify(before) === JSON.stringify(geometry()), "repeated sync drifted object positions");
          const clone = doc.cloneNode(true);
          window.ExamListDocumentHtmlSanitizer.stripTransientDocumentState(clone);
          doc.replaceWith(clone);
          doc = clone;
          flow.syncTemplateEditorObjectFlowObjects(doc);
          assertRows();
          expect(JSON.stringify(before) === JSON.stringify(geometry()), "save/reload lost object order or positions");
          const naturalTable = doc.querySelector("table");
          naturalTable.style.position = "static";
          flow.reflowTemplateEditorObjectRows(naturalTable, { documentElement: doc, activeHeight: naturalTable.offsetHeight });
          expect(!doc.querySelector('[data-template-object-flow-spacer][data-template-object-flow-kind="table"]'), "an in-flow table reserved its height twice");
        } finally { host.remove(); }
      }
    }
  });
  await check("table and image pointer drags update their rows during the gesture", async () => {
    reset('<p style="margin:0;height:24px">앞 문장</p><table style="position:absolute;top:24px;left:0;width:200px;height:60px"><tr><td>표</td></tr></table><p style="margin:0;height:24px">뒷 문장</p><img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2240%22/%3E" style="position:absolute;top:110px;left:0;width:80px;height:40px"><p style="margin:0;height:24px">마지막</p>');
    const doc = surface.querySelector(".template-doc");
    doc.style.position = "relative";
    ExamListTemplateEditorObjectFlowReflow.syncTemplateEditorObjectFlowObjects(doc);
    const table = doc.querySelector("table");
    const rect = table.getBoundingClientRect();
    table.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0, pointerId: 81, clientX: rect.left - 1, clientY: rect.top + 2 }));
    expect(state.selectedTableElement === table, `table selection failed: ${JSON.stringify({ rect: rect.toJSON(), selection: state.selectedTableElement?.outerHTML, readOnly: surface.getAttribute("contenteditable") })}`);
    const handle = surface.querySelector("[data-template-table-object-overlay='selection'] [data-template-table-object-move-handle]");
    expect(handle, "table move handle missing");
    const handleRect = handle.getBoundingClientRect();
    const pointer = { bubbles: true, cancelable: true, button: 0, pointerId: 82, clientX: handleRect.left + 12, clientY: handleRect.top + 12 };
    handle.dispatchEvent(new PointerEvent("pointerdown", pointer));
    expect(state.tableObjectMoveSession, "table drag did not start");
    window.dispatchEvent(new PointerEvent("pointermove", { ...pointer, clientY: pointer.clientY + 150 }));
    expect(doc.querySelector(`[data-template-object-flow-spacer][data-template-object-flow-id="${table.dataset.templateObjectFlowId}"]`), "table drag discarded its row spacer");
    const tail = Array.from(doc.querySelectorAll("p")).find(e => e.textContent === "마지막");
    expect(tail.getBoundingClientRect().bottom <= table.getBoundingClientRect().top + 1, "downward table drag failed to reorder text above it");
    window.dispatchEvent(new PointerEvent("pointerup", pointer));
    await tick();
    const img = doc.querySelector("img");
    const imageRect = img.getBoundingClientRect();
    const imagePointer = { bubbles: true, cancelable: true, button: 0, pointerId: 83, clientX: imageRect.left + 10, clientY: imageRect.top + 10 };
    img.dispatchEvent(new PointerEvent("pointerdown", imagePointer));
    expect(state.imageMoveSession, "image drag did not start");
    window.dispatchEvent(new PointerEvent("pointermove", { ...imagePointer, clientY: imagePointer.clientY - parseFloat(img.style.top) + 4 }));
    expect(doc.querySelector(`[data-template-object-flow-spacer][data-template-object-flow-id="${img.dataset.templateObjectFlowId}"]`), "image drag has no row spacer");
    const firstText = Array.from(doc.querySelectorAll("p")).find(e => e.textContent === "앞 문장");
    expect(firstText.getBoundingClientRect().top >= img.getBoundingClientRect().bottom - 1, "image did not push the first text row down");
    window.dispatchEvent(new PointerEvent("pointerup", imagePointer));
    await tick();
  });
  editor.destroy();
  await check("bottom-edge table caret does not overflow, while typed content and extra breaks do", async () => {
    const { getDocumentSurfaceOverflowInfo } = await import("/client/features/template-editor/document-overflow.js");
    root.innerHTML = '<div class="editor-document-surface" contenteditable="true"><div class="template-doc" style="position:relative;min-height:0;height:100px;width:200px;padding:0;border:0"><table style="position:absolute;top:50px;left:0;width:200px;height:50px;margin:0;border-collapse:collapse"><tr><td>표</td></tr></table><p data-template-object-caret-host data-template-object-caret-active style="position:absolute;top:100px;left:0"><span class="template-object-caret">\u200B</span></p></div></div>';
    const hostSurface = root.firstElementChild;
    const doc = hostSurface.firstElementChild;
    const caret = doc.querySelector("p");
    hostSurface.focus();
    expect(caret.getBoundingClientRect().bottom > doc.getBoundingClientRect().bottom + 4, "focused caret must extend below the page in this regression fixture");
    expect(!getDocumentSurfaceOverflowInfo(hostSurface).hasOverflow, "visible automatic caret was counted as overflowing content");
    caret.removeAttribute("data-template-object-caret-active");
    expect(!getDocumentSurfaceOverflowInfo(hostSurface).hasOverflow, "inactive zero-width guard was counted as content");
    caret.querySelector("span").append("입력한 내용");
    expect(getDocumentSurfaceOverflowInfo(hostSurface).hasOverflow, "stale caret marker hid real typed text");
    caret.removeAttribute("data-template-object-caret-host");
    caret.innerHTML = "<br><br>";
    expect(getDocumentSurfaceOverflowInfo(hostSurface).hasOverflow, "intentional extra line breaks were ignored");
    caret.remove();
    doc.querySelector("table").style.top = "65px";
    expect(getDocumentSurfaceOverflowInfo(hostSurface).hasOverflow, "real table overflow was ignored");
  });
  await check("overflow uses only a toast, once per episode, without canvas or footer warnings", async () => {
    const { renderTemplateEditorView } = await import("/client/features/template-editor/renderers.js");
    const { createDocumentOverflowRuntime } = await import("/client/features/template-editor/document-overflow-runtime.js");
    const { getDocumentSurfaceOverflowInfo } = await import("/client/features/template-editor/document-overflow.js");
    const { bindEditorStatusToast } = await import("/client/features/template-editor/editor-status-toast.js");
    const { hideToast } = await import("/client/app/toast.js");
    const appState = {
      templateEditor: {
        dataTags: { groups: [] },
        selectedPageId: "page-1",
        template: {
          id: "template-1",
          name: "양식",
          layout: { pages: [{ id: "page-1", name: "본문", type: "content", settings: {} }] },
        },
      },
    };
    const access = { permissions: { manageTemplates: true, previewTemplates: true } };
    const render = () => {
      root.innerHTML = renderTemplateEditorView({ access, editor: appState.templateEditor });
      const hostSurface = root.querySelector("#templateEditorSurface");
      hostSurface.innerHTML = '<div class="template-doc" style="height:100px;width:100px"><p style="height:300px;margin:0">초과 내용</p></div>';
      return hostSurface;
    };
    let hostSurface = render();
    const overflowRuntime = createDocumentOverflowRuntime({
      appState,
      getDocumentSurfaceByPageId: () => hostSurface,
    });
    let dispose = bindEditorStatusToast(hostSurface);
    hideToast();
    try {
      const overflow = getDocumentSurfaceOverflowInfo(hostSurface);
      expect(overflow.hasOverflow, "fixture must overflow actual document bounds");
      overflowRuntime.setDocumentOverflowState("page-1", overflow);
      // Re-rendering must not add a persistent warning anywhere in the editor.
      dispose();
      hostSurface = render();
      dispose = bindEditorStatusToast(hostSurface);
      expect(!root.querySelector("#templateEditorOverflowStatus, .editor-overflow-warning"), "persistent overflow warning remains");
      let firstToast;
      for (let index = 0; index < 2; index++) {
        hostSurface.dispatchEvent(new CustomEvent("template-editor-status", {
          bubbles: true,
          detail: { type: "warning", message: "A4 용지 영역을 초과했습니다. 저장 전 내용 길이를 줄이세요." },
        }));
        await new Promise((resolve) => setTimeout(resolve, 900));
        const toast = document.querySelector("#examlist-toast-root .toast-message");
        expect(toast?.textContent.includes("초과"), "overflow toast is missing");
        if (index === 0) firstToast = toast;
        else expect(toast === firstToast, "typing replaced the toast and restarted its timer");
      }
      expect(appState.templateEditor.hasDocumentOverflow, "save overflow guard was cleared");
      hideToast();
      hostSurface.dispatchEvent(new CustomEvent("template-editor-status", {
        detail: { type: "warning", message: "A4 용지 영역을 초과했습니다 (세로 201px)." },
      }));
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(!document.querySelector("#examlist-toast-root .toast-message"), "changing overflow details repeated the toast");
      hostSurface.querySelector("p").style.height = "20px";
      overflowRuntime.setDocumentOverflowState("page-1", getDocumentSurfaceOverflowInfo(hostSurface));
      expect(!appState.templateEditor.hasDocumentOverflow, "overflow state remains after correction");
      hostSurface.dispatchEvent(new CustomEvent("template-editor-status", { detail: { type: "info", message: "A4" } }));
      await new Promise((resolve) => setTimeout(resolve, 100));
      hostSurface.querySelector("p").style.height = "300px";
      hostSurface.dispatchEvent(new CustomEvent("template-editor-status", {
        detail: { type: "warning", message: "A4 용지 영역을 초과했습니다." },
      }));
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(document.querySelector("#examlist-toast-root .toast-message")?.textContent.includes("초과"), "new overflow episode did not notify");
      hostSurface.dispatchEvent(new CustomEvent("template-editor-table-copied"));
      expect(document.querySelector("#examlist-toast-root")?.textContent.includes("표를 복사했습니다"), "copy feedback was lost");
    } finally {
      dispose();
      hideToast();
    }
  });
  await check("save button follows edits, undo, saving, and the saved baseline", async () => {
    const { renderTemplateEditorView } = await import("/client/features/template-editor/renderers.js");
    const { writeCandidateBlockGridSizeToConfig } = await import("/client/features/template-editor/candidate-block-grid-sessions.js");
    const { mountTemplateEditorRuntime, unmountTemplateEditorRuntime, resetTemplateEditorRuntimeDirtyBaseline, syncTemplateEditorRuntimeToState } = await import("/client/features/template-editor/editor-runtime-adapter.js");
    const template = { id: "dirty-check", name: "양식", layout: { pages: [{ id: "dirty-page", name: "본문", type: "content", settings: { editorMode: "document", documentHtml: '<div class="template-doc"><p>원본<br><br></p><div data-candidate-block-grid="true" class="examlist-candidate-block-grid"></div><table style="position:absolute;left:0;top:500px;width:300px;height:50px"><tr><td>하단 표</td></tr></table></div>', candidateBlockGrid: { enabled: true, variant: "photo", rows: 2, columns: 2, widthPt: 450, heightPt: 150, yPt: 0, blockTemplateHtml: "<p>수험생</p>" } } }] } };
    const page = template.layout.pages[0];
    const savedGrid = JSON.stringify(page.settings.candidateBlockGrid);
    const placeholder = document.createElement("div");
    placeholder.setAttribute("data-candidate-block-grid", "true");
    placeholder.style.cssText = "width:600px;height:20px;position:relative";
    root.append(placeholder);
    writeCandidateBlockGridSizeToConfig(page, placeholder);
    expect(JSON.stringify(page.settings.candidateBlockGrid) === savedGrid, "loading placeholder overwrote the saved grid geometry");
    placeholder.remove();
    const appState = { templateEditor: { dataTags: { groups: [] }, selectedPageId: "dirty-page", template, savedTemplateSnapshot: structuredClone(template), isDirty: false } };
    const access = { permissions: { manageTemplates: true } };
    root.innerHTML = renderTemplateEditorView({ access, editor: appState.templateEditor });
    const button = root.querySelector('[data-action="save-template-layout"]');
    expect(button.disabled, "initial renderer enabled Save without changes");
    const mounted = await mountTemplateEditorRuntime({ access, appState });
    try {
      expect(button.disabled, "mount enabled Save without changes");
      syncTemplateEditorRuntimeToState({ appState });
      expect(!appState.templateEditor.isDirty && button.disabled, "navigation sync marked default settings as an edit");
      const hostSurface = root.querySelector('#templateEditorSurface');
      expect(hostSurface.querySelector('[data-candidate-block-grid]').offsetHeight === 200, "mount changed the saved data-block height");
      const doc = hostSurface.querySelector('.template-doc');
      const grid = doc.querySelector('[data-candidate-block-grid]');
      for (const fraction of [0.5, 0.8, 0.3]) {
        const paper = doc.getBoundingClientRect();
        doc.dispatchEvent(new PointerEvent("pointerdown", {
          bubbles: true, cancelable: true, button: 0,
          clientX: paper.left + paper.width * fraction,
          clientY: grid.getBoundingClientRect().bottom + 25,
        }));
        await tick();
        const anchor = getSelection().anchorNode;
        const caret = grid.nextElementSibling;
        expect(anchor?.nodeType === Node.TEXT_NODE && caret.contains(anchor), "grid blank-paper click lost its caret to a competing handler");
        expect(anchor.parentElement.matches('.template-object-caret'), "grid click selected an element boundary instead of its visible caret");
        expect(Math.abs(getSelection().getRangeAt(0).getBoundingClientRect().left - paper.left) < 3, "grid caret moved to the horizontal click coordinate");
        expect(caret.getBoundingClientRect().top >= grid.getBoundingClientRect().bottom - 2, "grid caret jumped to a preceding row");
      }
      expect(button.disabled, "clicking blank paper marked the document as edited");
      const originalHtml = mounted.getHtml();
      const originalConfig = JSON.stringify(template.layout.pages[0].settings.candidateBlockGrid);
      hostSurface.querySelector("p").append(document.createElement("br"), " 수정");
      mounted.sync();
      await tick();
      expect(!button.disabled, "editing did not enable Save");
      mounted.undo();
      await tick();
      expect(mounted.getHtml() === originalHtml, "undo did not restore the document");
      expect(JSON.stringify(template.layout.pages[0].settings.candidateBlockGrid) === originalConfig, "undo left stale data-block geometry");
      expect(button.disabled, "restoring the original content did not disable Save");
      syncTemplateEditorRuntimeToState({ appState });
      expect(!appState.templateEditor.isDirty && button.disabled, "navigation sync warned after undo restored the original content");
      hostSurface.querySelector("p").append(" 저장할 내용");
      mounted.sync();
      await tick();
      appState.templateEditor.isSaving = true;
      resetTemplateEditorRuntimeDirtyBaseline({ appState });
      expect(button.disabled && button.textContent.includes("저장 중"), "saving state was overwritten");
      appState.templateEditor.isSaving = false;
      appState.templateEditor.savedTemplateSnapshot = structuredClone(template);
      resetTemplateEditorRuntimeDirtyBaseline({ appState });
      expect(button.disabled && button.textContent === "저장", "save completion did not disable Save");
      syncTemplateEditorRuntimeToState({ appState });
      expect(button.disabled && !appState.templateEditor.isDirty, "navigation sync warned after saving");
      expect(hostSurface, "editor surface missing");
    } finally { unmountTemplateEditorRuntime(); }
  });
  await check("selecting a data block replaces table and image object selection", async () => {
    const { renderTemplateEditorView } = await import("/client/features/template-editor/renderers.js");
    const { mountTemplateEditorRuntime, unmountTemplateEditorRuntime } = await import("/client/features/template-editor/editor-runtime-adapter.js");
    const page = { id: "selection-page", type: "content", settings: {
      documentHtml: '<div class="template-doc"><table style="position:absolute;left:0;top:0;width:300px;height:50px"><tr><td>표</td></tr></table><img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E" style="position:absolute;left:0;top:65px;width:50px;height:40px"><div data-candidate-block-grid="true"></div></div>',
      candidateBlockGrid: { enabled: true, variant: "photo", rows: 2, columns: 2, widthPt: 450, heightPt: 150, yPt: 90, blockTemplateHtml: '<p>수험생</p>' },
    } };
    const template = { id: "selection-template", name: "개체 선택", paperPreset: "A4", orientation: "portrait", layout: { pages: [page] } };
    const appState = { templateEditor: { template, savedTemplateSnapshot: structuredClone(template), selectedPageId: page.id, dataTags: { groups: [] }, isDirty: false } };
    const access = { permissions: { manageTemplates: true } };
    root.innerHTML = renderTemplateEditorView({ access, editor: appState.templateEditor });
    const mounted = await mountTemplateEditorRuntime({ access, appState });
    try {
      const surface = root.querySelector('#templateEditorSurface');
      const doc = surface.querySelector('.template-doc');
      const grid = doc.querySelector('[data-candidate-block-grid]');
      const pointer = (target, x, y, type = "pointerdown") => target.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 91, button: 0, clientX: x, clientY: y,
      }));
      for (const kind of ["table", "img"]) {
        for (const control of ["border", "move", "resize"]) {
          const object = doc.querySelector(`:scope > ${kind}`);
          const rect = object.getBoundingClientRect();
          pointer(object, rect.left + (kind === "table" ? -1 : 10), rect.top + 2);
          pointer(window, rect.left + 1, rect.top + rect.height / 2, "pointerup");
          expect(mounted.state.templateEditor[kind === "table" ? "selectedTableElement" : "selectedImageElement"] === object, `${kind} selection fixture failed`);
          const gridRect = grid.getBoundingClientRect();
          const target = control === "border" ? grid : grid.querySelector(control === "move" ? '[data-candidate-block-grid-move-handle]' : '[data-candidate-block-grid-resize-handle]');
          const hit = control === "border" ? { left: gridRect.left + 1, top: gridRect.top + gridRect.height / 2 } : target.getBoundingClientRect();
          pointer(target, hit.left, hit.top);
          pointer(window, hit.left, hit.top, "pointerup");
          await tick();
          expect(grid.classList.contains('is-selected-candidate-block-grid'), `${control} did not select the grid`);
          expect(!mounted.state.templateEditor.selectedTableElement && !mounted.state.templateEditor.selectedImageElement, `${kind} stayed selected after grid ${control} click`);
          expect(!surface.querySelector('.is-selected-table-object, .is-selected-object, .is-selected-cell, .is-active-cell'), 'previous object selection styling remained');
          expect(!surface.querySelector('.template-editor-table-selection:not(.hidden), .template-editor-image-selection:not(.hidden)'), 'previous object handles remained visible');
        }
      }
    } finally { unmountTemplateEditorRuntime(); }
  });
  await check("navigation checks ignore sanitized block styles but retain real block and setting changes", async () => {
    const { renderTemplateEditorView } = await import("/client/features/template-editor/renderers.js");
    const { mountTemplateEditorRuntime, unmountTemplateEditorRuntime, syncTemplateEditorRuntimeToState } = await import("/client/features/template-editor/editor-runtime-adapter.js");
    const page = { id: "navigation-page", type: "content", settings: {
      documentHtml: '<div class="template-doc"><div data-candidate-block-grid="true"></div></div>',
      candidateBlockGrid: { enabled: true, variant: "photo", rows: 2, columns: 2, widthPt: 450, heightPt: 150,
        blockTemplateHtml: '<table style="width:290px;height:80px"><tr><td style="border-width:1px 0px 1px 1px;border-style:solid none solid solid;border-color:magenta black magenta magenta;border-image:none;padding:0">수험생</td><td>서명</td></tr></table>' },
    } };
    const template = { id: "navigation-template", name: "이동 확인", paperPreset: "A4", orientation: "portrait", layout: { pages: [page] } };
    const appState = { templateEditor: { template, savedTemplateSnapshot: structuredClone(template), selectedPageId: page.id, dataTags: { groups: [] }, isDirty: false } };
    const access = { permissions: { manageTemplates: true } };
    root.innerHTML = renderTemplateEditorView({ access, editor: appState.templateEditor });
    await mountTemplateEditorRuntime({ access, appState });
    try {
      const button = root.querySelector('[data-action="save-template-layout"]');
      for (let attempt = 0; attempt < 3; attempt++) {
        syncTemplateEditorRuntimeToState({ appState });
        expect(button.disabled && !appState.templateEditor.isDirty, "sanitizing block borders triggered a navigation warning");
      }
      const pageNumber = root.querySelector('[data-examlist-page-number-setting="enabled"]');
      pageNumber.checked = true;
      pageNumber.dispatchEvent(new Event("change", { bubbles: true }));
      syncTemplateEditorRuntimeToState({ appState });
      expect(!button.disabled && appState.templateEditor.isDirty, "navigation failed to protect a page setting change");
      pageNumber.checked = false;
      pageNumber.dispatchEvent(new Event("change", { bubbles: true }));
      syncTemplateEditorRuntimeToState({ appState });
      expect(button.disabled && !appState.templateEditor.isDirty, "restoring a page setting kept the navigation warning");
      const cell = root.querySelector('[data-candidate-block-instance] td');
      cell.textContent = "변경한 수험생";
      cell.dispatchEvent(new Event("input", { bubbles: true }));
      syncTemplateEditorRuntimeToState({ appState });
      expect(!button.disabled && appState.templateEditor.isDirty, "normalization hid a real data-block content change");
    } finally { unmountTemplateEditorRuntime(); }
  });
  await check("bottom supervisor table keeps its position through saving and reloading a candidate grid", async () => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = '/styles/features/template-editor/document-surface.css';
    await new Promise((resolve, reject) => { css.onload = resolve; css.onerror = reject; document.head.append(css); });
    const { renderTemplateEditorView } = await import("/client/features/template-editor/renderers.js");
    const { mountTemplateEditorRuntime, unmountTemplateEditorRuntime } = await import("/client/features/template-editor/editor-runtime-adapter.js");
    const { createTemplateEditorPersistenceActions } = await import("/client/features/template-editor/template-editor-persistence-actions.js");
    const { getDocumentSurfaceOverflowInfo } = await import("/client/features/template-editor/document-overflow.js");
    const footer = `<table style="position:absolute;left:0;top:990px;width:700px;height:48px;border-collapse:collapse"><tbody>${[0, 1].map(row => `<tr style="height:24px">${Array.from({length:6}, (_, col) => `<td style="height:24px;padding:0;border:1px solid black">${col % 2 ? '(서명)' : `감독자${row * 3 + col / 2 + 1}`}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const page = { id: 'save-footer', type: 'content', settings: { editorMode: 'document', documentHtml: `<div class="template-doc"><p style="height:38px;margin:0">확인대장</p><table style="position:absolute;left:0;top:44px;width:700px;height:48px"><tr><td>시험시간 / 고사실</td></tr></table><div data-candidate-block-grid="true" class="examlist-candidate-block-grid"></div>${footer}</div>`, candidateBlockGrid: { enabled: true, variant: 'photo', columns: 2, rows: 10, gapXPt: 1, gapYPt: 1, xPt: 0, yPt: 70.5, widthPt: 525, heightPt: 671.25, blockTemplateHtml: '<table style="height:85px;width:348px"><tr><td>수험생</td></tr></table>' } } };
    const template = { id: 'save-footer-template', name: '양식', paperPreset: 'A4', orientation: 'portrait', layout: {pages:[page]} };
    const appState = {templateEditor:{dataTags:{groups:[]},template,savedTemplateSnapshot:structuredClone(template),selectedPageId:page.id,isDirty:false}};
    const access = {permissions:{manageTemplates:true}};
    let saves = 0;
    const actions = createTemplateEditorPersistenceActions({
      appState, canManageTemplates: () => true, getCurrentSchoolId: () => 'test-school',
      onStateChange: async () => {}, syncDocumentOverflowUi: () => {},
      refreshDocumentEditorRuntime: () => {},
      templatesActions: {loadSummary: async () => {}, loadTemplates: async () => {}},
      saveTemplateLayoutRequest: async ({template: payload}) => {
        saves++;
        expect(payload.layout.pages[0].settings.documentHtml.includes('감독자6'), 'save payload lost the supervisor table');
        return structuredClone(payload);
      },
    });
    const verify = (stage) => {
      const host = root.querySelector('#templateEditorSurface');
      const tables = host.querySelectorAll('.template-doc > table');
      const last = tables[tables.length - 1];
      expect(tables.length === 2 && last.rows.length === 2 && last.rows[0].cells.length === 6, `${stage}: supervisor table disappeared`);
      expect(Math.abs(parseFloat(last.style.top) - 990) <= 1, `${stage}: supervisor table moved to ${last.style.top}`);
      expect(!getDocumentSurfaceOverflowInfo(host).hasOverflow, `${stage}: saving introduced page overflow`);
    };
    try {
      for (let reload = 0; reload < 2; reload++) {
        root.innerHTML = renderTemplateEditorView({access,editor:appState.templateEditor});
        await mountTemplateEditorRuntime({access,appState});
        verify(`load ${reload}`);
        for (let save = 0; save < 3; save++) {
          await actions.saveTemplateLayout();
          await tick();
          verify(`save ${save}`);
        }
        unmountTemplateEditorRuntime();
      }
      expect(saves === 6, 'valid layout was blocked from saving');
    } finally { unmountTemplateEditorRuntime(); }
  });
  return { passed, failed };
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
