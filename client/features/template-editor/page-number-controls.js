import { escapeHtml } from "../../app/html-utils.js";

const pageNumberPresetDefinitions = Object.freeze({
  numericCurrentTotal: Object.freeze({
    label: "1/1",
    template: "{{page.current}}/{{page.total}}",
  }),
  pageCurrentTotal: Object.freeze({
    label: "페이지 1/1",
    template: "페이지 {{page.current}}/{{page.total}}",
  }),
  pageCurrentTotalEnglish: Object.freeze({
    label: "Page1/1",
    template: "Page{{page.current}}/{{page.total}}",
  }),
  currentPageKorean: Object.freeze({
    label: "1페이지",
    template: "{{page.current}}페이지",
  }),
  koreanPage: Object.freeze({
    label: "1쪽",
    template: "{{page.current}}쪽",
  }),
  currentPageOfTotalKorean: Object.freeze({
    label: "1페이지 중 1페이지",
    template: "{{page.current}}페이지 중 {{page.total}}페이지",
  }),
  koreanPageOfTotal: Object.freeze({
    label: "1쪽 중 1쪽",
    template: "{{page.current}}쪽 중 {{page.total}}쪽",
  }),
});

const legacyPageNumberPresetAliases = Object.freeze({
  current: "currentPageKorean",
  currentTotal: "numericCurrentTotal",
});

const pageNumberPresetKeys = Object.freeze(Object.keys(pageNumberPresetDefinitions));
const pageNumberPositionDefinitions = Object.freeze({
  left: Object.freeze({
    cssTextAlign: "left",
    cssJustifyContent: "flex-start",
    label: "왼쪽",
  }),
  center: Object.freeze({
    cssTextAlign: "center",
    cssJustifyContent: "center",
    label: "가운데",
  }),
  right: Object.freeze({
    cssTextAlign: "right",
    cssJustifyContent: "flex-end",
    label: "오른쪽",
  }),
});
const pageNumberPositionKeys = Object.freeze(Object.keys(pageNumberPositionDefinitions));

const pageNumberDefaults = Object.freeze({
  enabled: false,
  position: "center",
  preset: "numericCurrentTotal",
});
const millimeterToCssPixel = 96 / 25.4;
const pageNumberAdditionalHorizontalInsetMm = 10;

function parseCssPixelValue(value, fallback = 0) {
  const parsedValue = Number.parseFloat(String(value || "").replace("px", ""));

  return Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : fallback;
}

function getPageNumberOverlayHorizontalInsets(surfaceElement) {
  const style = surfaceElement ? getComputedStyle(surfaceElement) : null;
  const additionalInset = pageNumberAdditionalHorizontalInsetMm * millimeterToCssPixel;

  return {
    left: parseCssPixelValue(style?.paddingLeft) + additionalInset,
    right: parseCssPixelValue(style?.paddingRight) + additionalInset,
  };
}

function getPageNumberSurfaceScale(surfaceElement) {
  const rect = surfaceElement?.getBoundingClientRect?.();
  const width = surfaceElement?.clientWidth || 0;
  const height = surfaceElement?.clientHeight || 0;

  return {
    x: Math.max(width > 0 && rect?.width > 0 ? rect.width / width : 1, 0.01),
    y: Math.max(height > 0 && rect?.height > 0 ? rect.height / height : 1, 0.01),
  };
}

function isCoverTemplatePage(page) {
  return String(page?.type || "").trim() === "cover";
}

function resolveSelectedPage(appState, fallbackPage = null) {
  const pages = Array.isArray(appState?.templateEditor?.template?.layout?.pages)
    ? appState.templateEditor.template.layout.pages
    : [];
  const fallbackPageId = String(fallbackPage?.id || "");
  const selectedPageId = String(appState?.templateEditor?.selectedPageId || fallbackPageId || "");

  return (
    pages.find((page) => String(page?.id || "") === selectedPageId) ||
    pages.find((page) => String(page?.id || "") === fallbackPageId) ||
    fallbackPage
  );
}

function normalizePageNumberConfig(value) {
  const source = value && typeof value === "object" ? value : {};
  const rawPreset = String(source.preset || "").trim();
  const preset = pageNumberPresetKeys.includes(rawPreset)
    ? rawPreset
    : legacyPageNumberPresetAliases[rawPreset] || pageNumberDefaults.preset;
  const rawPosition = String(source.position || source.align || source.textAlign || "").trim();
  const position = pageNumberPositionKeys.includes(rawPosition) ? rawPosition : pageNumberDefaults.position;

  return {
    enabled: source.enabled === true || String(source.enabled || "").trim().toLowerCase() === "true",
    position,
    preset,
  };
}

export function getPageNumberConfig(page) {
  const config = normalizePageNumberConfig(page?.settings?.pageNumber);

  return isCoverTemplatePage(page) ? { ...config, enabled: false } : config;
}

function writePageNumberConfigToPage(page, config) {
  if (!page) {
    return;
  }

  page.settings = page.settings && typeof page.settings === "object" ? page.settings : {};
  page.settings.pageNumber = {
    ...normalizePageNumberConfig(config),
    ...(isCoverTemplatePage(page) ? { enabled: false } : {}),
  };
}

function getEditorPageNumberContext(editorState, selectedPage) {
  const pages = Array.isArray(editorState?.template?.layout?.pages)
    ? [...editorState.template.layout.pages]
        .filter((page) => page.enabled !== false)
        .filter((page) => !isCoverTemplatePage(page))
        .sort((left, right) => (Number(left.sortOrder) || 0) - (Number(right.sortOrder) || 0))
    : [];
  const pageIndex = pages.findIndex((page) => page.id === selectedPage?.id);

  return {
    current: pageIndex >= 0 ? pageIndex + 1 : 1,
    total: Math.max(pages.length, 1),
  };
}

function renderPageNumberText(config, context) {
  const normalizedConfig = normalizePageNumberConfig(config);
  const preset = pageNumberPresetDefinitions[normalizedConfig.preset] || pageNumberPresetDefinitions.numericCurrentTotal;
  const current = String(Number(context?.current) || 1);
  const total = String(Number(context?.total) || 1);

  return preset.template
    .replaceAll("{{page.current}}", current)
    .replaceAll("{{page.total}}", total);
}

export function removePageNumberOverlay(surfaceElement) {
  surfaceElement?.closest?.(".template-editor-page")?.querySelector(".template-page-number-overlay")?.remove();
}

function updatePageNumberOverlay(surfaceElement, selectedPage, editorState) {
  const canvasElement = surfaceElement?.closest?.(".template-editor-page") || null;
  const config = getPageNumberConfig(selectedPage);

  if (!surfaceElement || !canvasElement || !config.enabled || isCoverTemplatePage(selectedPage)) {
    removePageNumberOverlay(surfaceElement);
    return;
  }

  let overlayElement = canvasElement.querySelector(".template-page-number-overlay");

  if (!overlayElement) {
    overlayElement = document.createElement("div");
    overlayElement.className = "template-page-number-overlay";
    overlayElement.setAttribute("aria-hidden", "true");
    canvasElement.append(overlayElement);
  }

  const surfaceRect = surfaceElement.getBoundingClientRect();
  const canvasRect = canvasElement.getBoundingClientRect();
  const horizontalInsets = getPageNumberOverlayHorizontalInsets(surfaceElement);
  const surfaceScale = getPageNumberSurfaceScale(surfaceElement);

  overlayElement.textContent = renderPageNumberText(config, getEditorPageNumberContext(editorState, selectedPage));
  overlayElement.dataset.pageNumberPosition = config.position;
  overlayElement.style.justifyContent =
    pageNumberPositionDefinitions[config.position]?.cssJustifyContent || pageNumberPositionDefinitions.center.cssJustifyContent;
  overlayElement.style.textAlign =
    pageNumberPositionDefinitions[config.position]?.cssTextAlign || pageNumberPositionDefinitions.center.cssTextAlign;
  overlayElement.style.paddingLeft = `${Math.round(horizontalInsets.left * surfaceScale.x * 100) / 100}px`;
  overlayElement.style.paddingRight = `${Math.round(horizontalInsets.right * surfaceScale.x * 100) / 100}px`;
  overlayElement.style.left = `${Math.round((surfaceRect.left - canvasRect.left + canvasElement.scrollLeft) * 100) / 100}px`;
  overlayElement.style.top = `${Math.round((surfaceRect.top - canvasRect.top + canvasElement.scrollTop) * 100) / 100}px`;
  overlayElement.style.width = `${Math.round(surfaceRect.width * 100) / 100}px`;
  overlayElement.style.height = `${Math.round(surfaceRect.height * 100) / 100}px`;
}

function createPageNumberControls(page) {
  const isCoverPage = isCoverTemplatePage(page);
  const config = getPageNumberConfig(page);
  const sectionElement = document.createElement("section");

  sectionElement.className = "template-page-property-field examlist-page-number-field";
  sectionElement.classList.toggle("is-cover-page", isCoverPage);
  sectionElement.innerHTML = `
    <div class="examlist-page-number-header">
      <span>페이지 번호</span>
      <label class="examlist-switch-control">
        <input class="sr-only" data-examlist-page-number-setting="enabled" type="checkbox" aria-label="페이지 번호 표시" ${config.enabled ? "checked" : ""} ${isCoverPage ? "disabled" : ""} />
        <span class="examlist-switch-track" aria-hidden="true"><span></span></span>
      </label>
    </div>
    <div class="examlist-page-number-options-grid">
      <label>
        <span>표시 방법</span>
        <select class="template-page-property-control" data-examlist-page-number-setting="preset" ${config.enabled && !isCoverPage ? "" : "disabled"}>
          ${pageNumberPresetKeys
            .map((presetKey) => {
              const preset = pageNumberPresetDefinitions[presetKey];

              return `<option value="${escapeHtml(presetKey)}" ${config.preset === presetKey ? "selected" : ""}>${escapeHtml(preset.label)}</option>`;
            })
            .join("")}
        </select>
      </label>
      <label>
        <span>표시 위치</span>
        <select class="template-page-property-control" data-examlist-page-number-setting="position" ${config.enabled && !isCoverPage ? "" : "disabled"}>
          ${pageNumberPositionKeys
            .map((positionKey) => {
              const position = pageNumberPositionDefinitions[positionKey];

              return `<option value="${escapeHtml(positionKey)}" ${config.position === positionKey ? "selected" : ""}>${escapeHtml(position.label)}</option>`;
            })
            .join("")}
        </select>
      </label>
    </div>
  `;

  return sectionElement;
}

function syncPageNumberControls(sectionElement, page) {
  const isCoverPage = isCoverTemplatePage(page);
  const config = getPageNumberConfig(page);
  const enabledControl = sectionElement?.querySelector?.('[data-examlist-page-number-setting="enabled"]');
  const presetControl = sectionElement?.querySelector?.('[data-examlist-page-number-setting="preset"]');
  const positionControl = sectionElement?.querySelector?.('[data-examlist-page-number-setting="position"]');

  sectionElement?.classList?.toggle("is-cover-page", isCoverPage);

  if (enabledControl instanceof HTMLInputElement) {
    enabledControl.checked = !isCoverPage && config.enabled;
    enabledControl.disabled = isCoverPage;
  }

  if (presetControl instanceof HTMLSelectElement) {
    presetControl.value = config.preset;
    presetControl.disabled = isCoverPage || !config.enabled;
  }

  if (positionControl instanceof HTMLSelectElement) {
    positionControl.value = config.position;
    positionControl.disabled = isCoverPage || !config.enabled;
  }
}

function readPageNumberControls(sectionElement, fallbackConfig, page) {
  const enabledControl = sectionElement?.querySelector?.('[data-examlist-page-number-setting="enabled"]');
  const presetControl = sectionElement?.querySelector?.('[data-examlist-page-number-setting="preset"]');
  const positionControl = sectionElement?.querySelector?.('[data-examlist-page-number-setting="position"]');
  const fallback = normalizePageNumberConfig(fallbackConfig);

  if (isCoverTemplatePage(page)) {
    return normalizePageNumberConfig({
      ...fallback,
      enabled: false,
    });
  }

  return normalizePageNumberConfig({
    enabled: enabledControl instanceof HTMLInputElement ? enabledControl.checked : fallback.enabled,
    position: positionControl instanceof HTMLSelectElement ? positionControl.value : fallback.position,
    preset: presetControl instanceof HTMLSelectElement ? presetControl.value : fallback.preset,
  });
}

export function commitPageNumberControlsToPage({
  appState = null,
  pagePropertiesHost,
  selectedPage,
  surfaceElement,
  syncControls = true,
} = {}) {
  const sectionElement = pagePropertiesHost?.querySelector?.(".examlist-page-number-field") || null;
  const activePage = resolveSelectedPage(appState, selectedPage);

  if (!sectionElement || !activePage || isCoverTemplatePage(activePage)) {
    return false;
  }

  writePageNumberConfigToPage(
    activePage,
    readPageNumberControls(sectionElement, activePage.settings?.pageNumber, activePage),
  );

  if (syncControls) {
    syncPageNumberControls(sectionElement, activePage);
  }

  updatePageNumberOverlay(surfaceElement, activePage, appState?.templateEditor);
  return true;
}

export function bindPageNumberControls({
  appState,
  onDirty = null,
  pagePropertiesHost,
  selectedPage,
  surfaceElement,
}) {
  if (!pagePropertiesHost || !selectedPage || !surfaceElement) {
    return null;
  }

  pagePropertiesHost.querySelector(".examlist-page-number-field")?.remove();
  removePageNumberOverlay(surfaceElement);

  if (isCoverTemplatePage(selectedPage)) {
    return () => {
      removePageNumberOverlay(surfaceElement);
    };
  }

  const sectionElement = createPageNumberControls(selectedPage);
  const recognitionMarksElement = pagePropertiesHost.querySelector(".examlist-recognition-marks-field");
  const candidateBlockGridElement = pagePropertiesHost.querySelector(".examlist-candidate-block-grid-field");

  if (candidateBlockGridElement) {
    candidateBlockGridElement.before(sectionElement);
  } else if (recognitionMarksElement) {
    recognitionMarksElement.before(sectionElement);
  } else {
    pagePropertiesHost.append(sectionElement);
  }

  syncPageNumberControls(sectionElement, selectedPage);
  updatePageNumberOverlay(surfaceElement, selectedPage, appState?.templateEditor);

  const markDirty = () => {
    if (typeof onDirty === "function") {
      onDirty();
    } else if (appState?.templateEditor) {
      appState.templateEditor.isDirty = true;
    }
  };
  const applyFromControls = () => {
    if (
      !commitPageNumberControlsToPage({
        appState,
        pagePropertiesHost,
        selectedPage,
        surfaceElement,
      })
    ) {
      return;
    }

    markDirty();
  };
  const handleControlChange = (event) => {
    if (!event.target?.closest?.("[data-examlist-page-number-setting]")) {
      return;
    }

    applyFromControls();
  };
  const handlePageSettingChange = (event) => {
    if (!event.target?.closest?.("[data-template-page-setting]")) {
      return;
    }

    window.requestAnimationFrame(() =>
      updatePageNumberOverlay(surfaceElement, resolveSelectedPage(appState, selectedPage), appState?.templateEditor),
    );
  };
  const resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(() =>
        updatePageNumberOverlay(surfaceElement, resolveSelectedPage(appState, selectedPage), appState?.templateEditor),
      )
    : null;
  const handleCanvasZoomChange = () =>
    updatePageNumberOverlay(surfaceElement, resolveSelectedPage(appState, selectedPage), appState?.templateEditor);

  sectionElement.addEventListener("input", handleControlChange);
  sectionElement.addEventListener("change", handleControlChange);
  pagePropertiesHost.addEventListener("input", handlePageSettingChange);
  pagePropertiesHost.addEventListener("change", handlePageSettingChange);
  surfaceElement.addEventListener("template-editor-canvas-zoom-change", handleCanvasZoomChange);
  resizeObserver?.observe(surfaceElement);

  return () => {
    sectionElement.removeEventListener("input", handleControlChange);
    sectionElement.removeEventListener("change", handleControlChange);
    pagePropertiesHost.removeEventListener("input", handlePageSettingChange);
    pagePropertiesHost.removeEventListener("change", handlePageSettingChange);
    surfaceElement.removeEventListener("template-editor-canvas-zoom-change", handleCanvasZoomChange);
    resizeObserver?.disconnect();
    sectionElement.remove();
    removePageNumberOverlay(surfaceElement);
  };
}
