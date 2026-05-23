const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

process.env.EXAMLIST_AUTH_ENABLED = "false";
process.env.PDF_QUEUE_DRIVER = process.env.PDF_QUEUE_DRIVER || "memory";
process.env.EXAMLIST_DEFAULT_ROLE = process.env.EXAMLIST_DEFAULT_ROLE || "super_admin";

const { getViewFromPathname } = require("../shared/app-config");
const { getPool } = require("../db");
const { createAppContext } = require("../server/create-app-context");
const { createRouteDeps } = require("../server/create-route-deps");
const { createApiRoutes } = require("../server/http/api-routes");
const { createPageRequestHandlers } = require("../server/http/page-handler");
const { createRequestHandler } = require("../server/http/request-handler");
const { delay, getAvailablePort, requestJson, resolveBrowserPath } = require("./smoke-utils");
const {
  createCdpClient,
  dispatchBrowserMouseClick,
  evaluate,
  navigate,
  waitForCondition,
  waitForDevtools,
  waitForServer,
} = require("./smoke-browser-cdp");

const readonlyMethods = new Set(["GET", "HEAD", "OPTIONS"]);

function closeServer(server) {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) {
        return;
      }
      resolved = true;
      resolve();
    };

    server.close(finish);
    server.closeIdleConnections?.();
    setTimeout(() => {
      server.closeAllConnections?.();
      finish();
    }, 1000).unref?.();
  });
}

function createReadonlyAppServer(port, blockedMutations) {
  const appContext = createAppContext();
  const apiRoutes = createApiRoutes(createRouteDeps(appContext));
  const pageHandlers = createPageRequestHandlers({
    fs,
    getViewFromPathname,
    path,
    root: path.join(__dirname, ".."),
  });
  const requestHandler = createRequestHandler({
    apiRoutes,
    pageHandlers,
    path,
    port,
    translateError: appContext.translateDatabaseError,
  });
  const server = http.createServer((request, response) => {
    if (!readonlyMethods.has(String(request.method || "").toUpperCase())) {
      blockedMutations.push({
        method: request.method || "",
        url: request.url || "",
      });
      response.writeHead(405, {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
      });
      response.end(JSON.stringify({ error: "Read-only UI check blocked a mutating request." }));
      return;
    }

    requestHandler(request, response);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      resolve(server);
    });
  });
}

async function withBrowser(callback) {
  const browserPath = resolveBrowserPath();

  if (!browserPath) {
    throw new Error("Chrome or Edge executable was not found. Set UI_SMOKE_BROWSER_PATH.");
  }

  const port = Number(process.env.UI_DROPDOWN_CHECK_PORT) || (await getAvailablePort());
  const debugPort = Number(process.env.UI_DROPDOWN_CHECK_DEBUG_PORT) || (await getAvailablePort());
  const baseUrl = `http://127.0.0.1:${port}`;
  const blockedMutations = [];
  const screenshotDir = path.join(
    __dirname,
    "..",
    "artifacts",
    "dropdown-ui-check",
    new Date().toISOString().replace(/[:.]/g, "-"),
  );
  const userDataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "examlist-dropdown-ui-"));
  let server = null;
  let browserProcess = null;
  let client = null;
  let browserOutput = "";

  try {
    await fs.promises.mkdir(screenshotDir, { recursive: true });
    server = await createReadonlyAppServer(port, blockedMutations);
    await waitForServer(port);
    browserProcess = spawn(
      browserPath,
      [
        "--headless",
        "--disable-extensions",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--window-size=1440,1000",
        `--remote-debugging-port=${debugPort}`,
        `--user-data-dir=${userDataDir}`,
        "about:blank",
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );

    browserProcess.stdout.on("data", (chunk) => {
      browserOutput += chunk.toString("utf8");
    });
    browserProcess.stderr.on("data", (chunk) => {
      browserOutput += chunk.toString("utf8");
    });

    client = await createCdpClient(await waitForDevtools(debugPort));
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    const result = await callback({
      baseUrl,
      blockedMutations,
      client,
      port,
      screenshotDir,
    });

    if (blockedMutations.length) {
      throw new Error(`Read-only UI check blocked mutating requests: ${JSON.stringify(blockedMutations)}`);
    }

    return result;
  } catch (error) {
    if (browserOutput.trim()) {
      console.error(browserOutput.trim());
    }

    throw error;
  } finally {
    client?.close();
    browserProcess?.kill();
    if (server) {
      await closeServer(server).catch(() => {});
    }
    await getPool().end().catch(() => {});
    await fs.promises.rm(userDataDir, { force: true, recursive: true }).catch(() => {});
  }
}

async function captureScreenshot(client, screenshotDir, name) {
  const result = await client.send("Page.captureScreenshot", {
    captureBeyondViewport: false,
    format: "png",
    fromSurface: true,
  });
  const filePath = path.join(screenshotDir, `${name}.png`);

  await fs.promises.writeFile(filePath, Buffer.from(result.data || "", "base64"));

  return filePath;
}

async function setViewport(client, viewport) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: viewport.height,
    mobile: viewport.width < 700,
    width: viewport.width,
  });
}

function viewportName(viewport) {
  return `${viewport.name}-${viewport.width}x${viewport.height}`;
}

async function loadRoute(client, baseUrl, route, viewport) {
  await setViewport(client, viewport);
  await navigate(client, `${baseUrl}${route.path}`);
  await waitForCondition(client, "document.readyState === 'complete'", `${route.name} ready`);
  await waitForCondition(
    client,
    `document.documentElement.dataset.currentView === ${JSON.stringify(route.view)}`,
    `${route.name} active view`,
    20000,
  );

  if (route.waitFor) {
    await waitForCondition(client, route.waitFor, `${route.name} rendered`, 20000);
  }

  await delay(350);
}

async function scanDropdowns(client, pageName) {
  const payload = await evaluate(
    client,
    `
      JSON.stringify((() => {
        const pageName = ${JSON.stringify(pageName)};
        const issues = [];
        const controls = [];
        const pagination = [];

        const round = (value) => Math.round(Number(value || 0) * 10) / 10;
        const rectFor = (element) => {
          const rect = element.getBoundingClientRect();
          return {
            bottom: round(rect.bottom),
            height: round(rect.height),
            left: round(rect.left),
            right: round(rect.right),
            top: round(rect.top),
            width: round(rect.width)
          };
        };
        const isVisible = (element) => {
          if (!element || !(element instanceof HTMLElement)) {
            return false;
          }

          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();

          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number(style.opacity || 1) > 0.01 &&
            rect.width > 0 &&
            rect.height > 0
          );
        };
        const isTopmostVisible = (element) => {
          if (!isVisible(element)) {
            return false;
          }

          const rect = element.getBoundingClientRect();
          const x = Math.min(Math.max(rect.left + rect.width / 2, 0), window.innerWidth - 1);
          const y = Math.min(Math.max(rect.top + rect.height / 2, 0), window.innerHeight - 1);
          const topElement = document.elementFromPoint(x, y);

          return Boolean(topElement && (topElement === element || element.contains(topElement)));
        };
        const cssPath = (element) => {
          if (!element || !(element instanceof Element)) {
            return "";
          }

          if (element.id) {
            return "#" + CSS.escape(element.id);
          }

          const parts = [];
          let current = element;

          while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
            let part = current.localName;

            if (current.classList.length) {
              part += "." + [...current.classList].slice(0, 3).map((className) => CSS.escape(className)).join(".");
            }

            const parent = current.parentElement;

            if (parent) {
              const siblings = [...parent.children].filter((sibling) => sibling.localName === current.localName);

              if (siblings.length > 1) {
                part += ":nth-of-type(" + (siblings.indexOf(current) + 1) + ")";
              }
            }

            parts.unshift(part);
            current = parent;
          }

          return parts.join(" > ");
        };
        const gradientCount = (backgroundImage) =>
          (String(backgroundImage || "").match(/linear-gradient/g) || []).length;
        const assert = (condition, element, message, extra = {}) => {
          if (!condition) {
            issues.push({
              control: cssPath(element),
              extra,
              message,
              page: pageName
            });
          }
        };
        const visibleControls = [
          ...document.querySelectorAll(
            "select:not(.template-toolbar-border-native-select), .page-size-trigger, .template-toolbar-combo-toggle, .template-toolbar-icon-select-button"
          )
        ].filter(isTopmostVisible);

        visibleControls.forEach((element) => {
          const style = getComputedStyle(element);
          const rect = rectFor(element);
          const isNativeSelect = element.matches("select:not(.template-toolbar-border-native-select)");
          const isCustomDropdown =
            element.matches(".page-size-trigger, .template-toolbar-combo-toggle, .template-toolbar-icon-select-button");
          const borderRadius = Number.parseFloat(style.borderTopLeftRadius || style.borderRadius || "0") || 0;
          const backgroundImage = style.backgroundImage || "";
          const backgroundColor = style.backgroundColor || "";
          const control = {
            backgroundColor,
            backgroundImage,
            borderRadius,
            className: element.className || "",
            control: cssPath(element),
            disabled: Boolean(element.disabled),
            gradientCount: gradientCount(backgroundImage),
            page: pageName,
            rect,
            tagName: element.tagName,
            text: String(element.textContent || element.value || "").replace(/\\s+/g, " ").trim().slice(0, 80)
          };

          controls.push(control);
          assert(rect.width >= 30 && rect.height >= 30, element, "dropdown control is too small", rect);
          if (!element.matches(".template-toolbar-combo-toggle")) {
            assert(borderRadius >= 10, element, "dropdown control does not use the unified rounded style", {
              borderRadius: style.borderRadius
            });
          }

          if (isNativeSelect) {
            assert(gradientCount(backgroundImage) === 2, element, "native select arrow should use exactly two gradients", {
              backgroundImage
            });
            assert(!/to right|1px/.test(backgroundImage), element, "native select still has an internal divider background", {
              backgroundImage
            });
            assert(/rgb\\(255, 255, 255\\)|#fff|#ffffff/i.test(backgroundColor) || element.disabled, element, "native select background is not white", {
              backgroundColor
            });

            const wrapperCaret = element.parentElement?.querySelector?.(".template-toolbar-select-caret");

            assert(!wrapperCaret || !isVisible(wrapperCaret), element, "native select has an extra overlay caret", {
              caret: wrapperCaret ? cssPath(wrapperCaret) : ""
            });
          }

          if (isCustomDropdown && element.matches(".template-toolbar-combo-toggle")) {
            assert(style.borderLeftWidth === "0px", element, "custom combo toggle still has an internal vertical divider", {
              borderLeftWidth: style.borderLeftWidth,
              borderLeftStyle: style.borderLeftStyle
            });
          }
        });

        document.querySelectorAll(".table-pagination").forEach((container) => {
          if (!isTopmostVisible(container)) {
            return;
          }

          const pageSize = container.querySelector(".table-page-size");
          const actions = container.querySelector(".table-pagination-actions");
          const summary = container.querySelector(".table-pagination-summary");
          const picker = container.querySelector(".page-picker");
          const pickerSelect = container.querySelector(".page-picker-select");
          const pickerLabel = container.querySelector(".page-picker-label");
          const divider = container.querySelector(".table-pagination-divider");
          const nextButton = container.querySelector("[data-candidate-grid-nav='next'], [data-pdf-generation-grid-nav='next'], [data-pdf-audit-grid-nav='next']");
          const rects = {
            actions: actions ? rectFor(actions) : null,
            divider: divider ? rectFor(divider) : null,
            nextButton: nextButton ? rectFor(nextButton) : null,
            pageSize: pageSize ? rectFor(pageSize) : null,
            picker: picker ? rectFor(picker) : null,
            pickerLabel: pickerLabel ? rectFor(pickerLabel) : null,
            pickerSelect: pickerSelect ? rectFor(pickerSelect) : null,
            summary: summary ? rectFor(summary) : null
          };
          const options = pickerSelect ? [...pickerSelect.options].map((option) => option.textContent.trim()) : [];

          pagination.push({
            page: pageName,
            options,
            rects,
            selectedPage: pickerSelect?.value || "",
            triggerText: pageSize?.querySelector(".page-size-trigger")?.textContent.replace(/\\s+/g, " ").trim() || ""
          });

          assert(Boolean(picker && pickerSelect && pickerLabel && divider), container, "pagination page picker is missing required parts");
          if (pickerSelect) {
            assert(options.length > 0 && options.every((option) => /^\\d+$/.test(option)), pickerSelect, "page picker options should contain only numbers", {
              options
            });
          }
          if (pickerSelect && pickerLabel) {
            assert(rectFor(pickerLabel).left >= rectFor(pickerSelect).right - 1, pickerLabel, "page label should be to the right of the picker select", rects);
          }
          if (divider && nextButton && picker) {
            assert(
              rectFor(divider).left >= rectFor(nextButton).right - 1 &&
                rectFor(divider).right <= rectFor(picker).left + 1 &&
                Math.abs((rectFor(divider).top + rectFor(divider).bottom) / 2 - (rectFor(picker).top + rectFor(picker).bottom) / 2) <= 8,
              divider,
              "pagination divider is not between Next and page picker",
              rects
            );
          }
        });

        const overlapPairs = [];
        for (let index = 0; index < visibleControls.length; index += 1) {
          for (let nextIndex = index + 1; nextIndex < visibleControls.length; nextIndex += 1) {
            const left = visibleControls[index];
            const right = visibleControls[nextIndex];

            if (left.contains(right) || right.contains(left)) {
              continue;
            }

            const leftRect = left.getBoundingClientRect();
            const rightRect = right.getBoundingClientRect();
            const xOverlap = Math.min(leftRect.right, rightRect.right) - Math.max(leftRect.left, rightRect.left);
            const yOverlap = Math.min(leftRect.bottom, rightRect.bottom) - Math.max(leftRect.top, rightRect.top);

            if (xOverlap > 2 && yOverlap > 2) {
              overlapPairs.push({
                area: round(xOverlap * yOverlap),
                left: cssPath(left),
                right: cssPath(right)
              });
            }
          }
        }

        if (overlapPairs.length) {
          issues.push({
            control: "",
            extra: { overlapPairs },
            message: "visible dropdown controls overlap",
            page: pageName
          });
        }

        return {
          controls,
          issues,
          pagination,
          page: pageName,
          visibleControlCount: visibleControls.length
        };
      })())
    `,
  );

  return JSON.parse(payload);
}

async function openAndCheckCustomMenus(client, pageName) {
  const results = [];
  const selectors = [
    ".page-size-trigger",
    "[data-action='toggle-document-font-size-menu']",
    "[data-editor-font-size-toggle]",
    ".template-toolbar-icon-select-button",
  ];

  for (const selector of selectors) {
    const count = Number(
      await evaluate(
        client,
        `
          (() => [...document.querySelectorAll(${JSON.stringify(selector)})]
            .filter((element) => {
              const style = getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 && !element.disabled;
            }).length)()
        `,
      ),
    );

    if (!count) {
      continue;
    }

    const clickResult = await evaluate(
      client,
      `
        (() => {
          const element = [...document.querySelectorAll(${JSON.stringify(selector)})].find((candidate) => {
            const style = getComputedStyle(candidate);
            const rect = candidate.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 && !candidate.disabled;
          });

          if (!element) {
            return false;
          }

          element.scrollIntoView({ block: "center", inline: "center" });
          element.click();
          return true;
        })()
      `,
    );

    if (!clickResult) {
      continue;
    }

    await delay(200);
    const scanPayload = await evaluate(
      client,
      `
        JSON.stringify((() => {
          const openMenus = [
            ...document.querySelectorAll(".page-size-menu, .template-toolbar-combo-menu:not(.hidden), .template-toolbar-icon-select-menu:not(.hidden)")
          ].filter((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
          });

          return openMenus.map((menu) => {
            const style = getComputedStyle(menu);
            const rect = menu.getBoundingClientRect();

            return {
              borderRadius: style.borderRadius,
              bottom: Math.round(rect.bottom),
              className: menu.className,
              height: Math.round(rect.height),
              left: Math.round(rect.left),
              page: ${JSON.stringify(pageName)},
              right: Math.round(rect.right),
              selector: ${JSON.stringify(selector)},
              top: Math.round(rect.top),
              width: Math.round(rect.width)
            };
          });
        })())
      `,
    );

    results.push(...JSON.parse(scanPayload));
    await evaluate(client, "document.body.click()");
    await delay(100);
  }

  return results;
}

async function openPdfGenerationModal(client) {
  const opened = await evaluate(
    client,
    `
      (() => {
        const button = document.querySelector("[data-action='open-pdf-generation-create-modal']");
        if (!button || button.disabled) {
          return false;
        }
        button.click();
        return true;
      })()
    `,
  );

  if (!opened) {
    return false;
  }

  await waitForCondition(client, "document.querySelector('.pdf-generation-create-overlay')", "PDF generation modal opened", 15000);
  await delay(500);
  await evaluate(
    client,
    `
      (() => {
        const select = document.querySelector("[data-pdf-generation-template-select]");
        const option = [...(select?.options || [])].find((item) => item.value);
        if (!select || !option) {
          return false;
        }
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()
    `,
  );
  await delay(800);

  return true;
}

async function checkPaginationButtons(client, pageName) {
  const resultPayload = await evaluate(
    client,
    `
      (async () => JSON.stringify(await (async () => {
        const isVisible = (element) => {
          if (!element || !(element instanceof HTMLElement)) {
            return false;
          }

          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();

          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number(style.opacity || 1) > 0.01 &&
            rect.width > 0 &&
            rect.height > 0
          );
        };
        const isTopmostVisible = (element) => {
          if (!isVisible(element)) {
            return false;
          }

          const rect = element.getBoundingClientRect();
          const x = Math.min(Math.max(rect.left + rect.width / 2, 0), window.innerWidth - 1);
          const y = Math.min(Math.max(rect.top + rect.height / 2, 0), window.innerHeight - 1);
          const topElement = document.elementFromPoint(x, y);

          return Boolean(topElement && (topElement === element || element.contains(topElement)));
        };
        const getContainer = () =>
          [...document.querySelectorAll(".table-pagination")].find(isTopmostVisible) ||
          [...document.querySelectorAll(".table-pagination")].find(isVisible);
        const getControls = () => {
          const container = getContainer();

          return {
            nextButton: container?.querySelector("[data-candidate-grid-nav='next'], [data-pdf-generation-grid-nav='next'], [data-pdf-audit-grid-nav='next']") || null,
            picker: container?.querySelector(".page-picker-select") || null,
            prevButton: container?.querySelector("[data-candidate-grid-nav='prev'], [data-pdf-generation-grid-nav='prev'], [data-pdf-audit-grid-nav='prev']") || null
          };
        };
        let { nextButton, picker, prevButton } = getControls();

        if (!nextButton || !prevButton || !picker) {
          return { page: ${JSON.stringify(pageName)}, skipped: true, reason: "pagination controls missing" };
        }

        if (nextButton.disabled) {
          return { page: ${JSON.stringify(pageName)}, skipped: true, reason: "next disabled", selectedPage: picker.value };
        }

        const before = picker.value;
        nextButton.click();
        await new Promise((resolve) => setTimeout(resolve, 150));
        ({ nextButton, picker, prevButton } = getControls());
        const afterNext = picker?.value || "";
        prevButton.click();
        await new Promise((resolve) => setTimeout(resolve, 150));
        ({ picker } = getControls());
        const afterPrev = picker?.value || "";

        return {
          afterNext,
          afterPrev,
          before,
          page: ${JSON.stringify(pageName)},
          skipped: false
        };
      })()))()
    `,
  );
  const result = JSON.parse(resultPayload);

  if (!result.skipped && result.afterNext === result.before) {
    throw new Error(`${pageName}: next pagination button did not change the selected page. ${JSON.stringify(result)}`);
  }

  if (!result.skipped && result.afterPrev !== result.before) {
    throw new Error(`${pageName}: prev pagination button did not restore the selected page. ${JSON.stringify(result)}`);
  }

  return result;
}

async function getDataRoutes(port) {
  const schoolPayload = await requestJson({ path: "/api/schools?limit=1", port });
  const school = schoolPayload.json?.items?.[0] || null;
  const schoolRouteId = school?.code || school?.id || "";
  const schoolApiId = school?.id || "";
  let template = null;
  let generation = null;

  if (schoolApiId) {
    const templatePayload = await requestJson({
      path: `/api/pdf-templates?limit=1&schoolId=${encodeURIComponent(schoolApiId)}`,
      port,
    });
    const generationPayload = await requestJson({
      path: `/api/pdf-generations?limit=1&schoolId=${encodeURIComponent(schoolApiId)}`,
      port,
    });

    template = templatePayload.json?.items?.[0] || null;
    generation = generationPayload.json?.items?.[0] || null;
  }

  return {
    generation,
    school,
    schoolApiId,
    schoolRouteId,
    template,
  };
}

async function run() {
  const viewports = [
    { height: 1000, name: "desktop", width: 1440 },
    { height: 844, name: "mobile", width: 390 },
  ];

  const result = await withBrowser(async ({ baseUrl, client, port, screenshotDir }) => {
    const data = await getDataRoutes(port);
    const routes = [
      {
        name: "schools",
        path: "/schools",
        view: "schoolManagement",
        waitFor: "document.body.innerText.includes('학교 선택')",
      },
    ];

    if (data.schoolRouteId) {
      const encodedSchoolId = encodeURIComponent(data.schoolRouteId);

      routes.push(
        {
          name: "templates",
          path: `/schools/${encodedSchoolId}/templates`,
          view: "templateManagement",
          waitFor: "document.body.innerText.includes('양식 관리')",
        },
        {
          name: "candidates",
          path: `/schools/${encodedSchoolId}/candidates`,
          view: "candidateLookup",
          waitFor: "document.querySelector('.candidate-data-table') || document.body.innerText.includes('수험생 데이터')",
        },
        {
          name: "pdf-generations",
          path: `/schools/${encodedSchoolId}/pdf-generations`,
          view: "pdfGenerationHistory",
          waitFor: "document.querySelector('.pdf-generation-result-grid') || document.body.innerText.includes('PDF 생성')",
        },
        {
          name: "pdf-history",
          path: `/schools/${encodedSchoolId}/pdf-history`,
          view: "pdfHistoryManagement",
          waitFor: "document.querySelector('.pdf-history-log-grid') || document.body.innerText.includes('PDF 작업 로그')",
        },
        {
          name: "data-deletion",
          path: `/schools/${encodedSchoolId}/data-deletion`,
          view: "dataDeletion",
          waitFor: "document.querySelector('.data-deletion-panel') || document.body.innerText.includes('데이터 삭제')",
        },
      );

      if (data.template?.id) {
        routes.push({
          name: "template-editor",
          path: `/schools/${encodedSchoolId}/templates/${encodeURIComponent(data.template.id)}/edit`,
          view: "templateEditor",
          waitFor: "document.querySelector('#templateEditorSurface')",
        });
      }

      if (data.generation?.id) {
        routes.push({
          name: "pdf-generation-detail",
          path: `/schools/${encodedSchoolId}/pdf-generations/${encodeURIComponent(data.generation.id)}`,
          view: "pdfGenerationDetail",
          waitFor: "document.body.innerText.includes('상세') || document.body.innerText.includes('생성 상세')",
        });
      }
    }

    const scans = [];
    const menuScans = [];
    const paginationChecks = [];
    const screenshots = [];

    for (const viewport of viewports) {
      for (const route of routes) {
        const pageName = `${route.name}/${viewportName(viewport)}`;

        await loadRoute(client, baseUrl, route, viewport);

        if (route.name === "pdf-generations") {
          const modalOpened = await openPdfGenerationModal(client);

          if (modalOpened) {
            scans.push(await scanDropdowns(client, `${pageName}/create-modal`));
            screenshots.push(await captureScreenshot(client, screenshotDir, `${route.name}-create-modal-${viewportName(viewport)}`));
            await evaluate(client, "document.querySelector(\"[data-action='close-pdf-generation-create-modal']\")?.click()");
            await delay(200);
          }
        }

        scans.push(await scanDropdowns(client, pageName));
        menuScans.push(...(await openAndCheckCustomMenus(client, pageName)));

        if (route.name === "candidates" || route.name === "pdf-generations" || route.name === "pdf-history") {
          paginationChecks.push(await checkPaginationButtons(client, pageName));
        }

        screenshots.push(await captureScreenshot(client, screenshotDir, `${route.name}-${viewportName(viewport)}`));
      }
    }

    const issues = scans.flatMap((scan) => scan.issues);
    const controlCount = scans.reduce((total, scan) => total + scan.visibleControlCount, 0);
    const summary = {
      controlCount,
      data: {
        generationId: data.generation?.id || "",
        schoolId: data.school?.id || "",
        schoolRouteId: data.schoolRouteId || "",
        templateId: data.template?.id || "",
      },
      issueCount: issues.length,
      issues,
      menuScans,
      paginationChecks,
      routes: routes.map((route) => route.name),
      screenshotDir,
      screenshots,
      scans: scans.map((scan) => ({
        controls: scan.controls.length,
        page: scan.page,
        pagination: scan.pagination,
        visibleControlCount: scan.visibleControlCount,
      })),
      viewports,
    };

    const summaryPath = path.join(screenshotDir, "summary.json");
    await fs.promises.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

    if (issues.length) {
      throw new Error(`Dropdown UI check found ${issues.length} issue(s). Summary: ${summaryPath}`);
    }

    return {
      ...summary,
      summaryPath,
    };
  });

  console.log(JSON.stringify({
    controlCount: result.controlCount,
    issueCount: result.issueCount,
    paginationChecks: result.paginationChecks,
    routes: result.routes,
    screenshotDir: result.screenshotDir,
    summaryPath: result.summaryPath,
  }, null, 2));
}

run().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
