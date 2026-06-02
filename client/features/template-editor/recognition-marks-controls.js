import { toMillimeterValue, toPointValue } from "./page-settings-adapter.js";

const cssPixelsPerPoint = 96 / 72;
const defaultRecognitionMarkOffsetPt = 14.17;
const defaultRecognitionMarkSizePt = 11.34;
const maxRecognitionMarkOffsetPt = 240;

function normalizeRecognitionMarkPoint(value, fallback = defaultRecognitionMarkOffsetPt, maximum = maxRecognitionMarkOffsetPt) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(0, Math.round(numericValue * 100) / 100));
}

function normalizeRecognitionMarksConfig(value) {
  const source = value && typeof value === "object" ? value : {};

  return {
    enabled: source.enabled === true || String(source.enabled || "").trim().toLowerCase() === "true",
    offsetXPt: normalizeRecognitionMarkPoint(
      source.offsetXPt ?? source.xPt ?? source.offsetX ?? source.x,
      defaultRecognitionMarkOffsetPt,
    ),
    offsetYPt: normalizeRecognitionMarkPoint(
      source.offsetYPt ?? source.yPt ?? source.offsetY ?? source.y,
      defaultRecognitionMarkOffsetPt,
    ),
    sizePt: normalizeRecognitionMarkPoint(source.sizePt ?? source.size, defaultRecognitionMarkSizePt, 72),
  };
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

export function getPageRecognitionMarksConfig(page) {
  return normalizeRecognitionMarksConfig(page?.settings?.recognitionMarks);
}

function writeRecognitionMarksConfigToPage(page, config) {
  if (!page) {
    return;
  }

  page.settings = page.settings && typeof page.settings === "object" ? page.settings : {};
  page.settings.recognitionMarks = normalizeRecognitionMarksConfig(config);
}

function hasRecognitionMarksConfig(page) {
  return Boolean(page?.settings?.recognitionMarks && typeof page.settings.recognitionMarks === "object");
}

function formatMillimeterInputValue(pointValue) {
  return String(toMillimeterValue(pointValue)).replace(/\.0$/, "");
}

function pointValueToCssPixel(value) {
  return Math.round(normalizeRecognitionMarkPoint(value, 0, 1000) * cssPixelsPerPoint * 100) / 100;
}

function cssPixelToPointValue(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.round((numericValue / cssPixelsPerPoint) * 100) / 100);
}

export function removeRecognitionMarksOverlay(surfaceElement) {
  surfaceElement?.closest?.(".template-editor-page")?.querySelector(".template-recognition-marks-overlay")?.remove();
}

function updateRecognitionMarksOverlay(surfaceElement, page) {
  const canvasElement = surfaceElement?.closest?.(".template-editor-page") || null;
  const config = getPageRecognitionMarksConfig(page);

  if (!surfaceElement || !canvasElement || !config.enabled) {
    removeRecognitionMarksOverlay(surfaceElement);
    return;
  }

  let overlayElement = canvasElement.querySelector(".template-recognition-marks-overlay");

  if (!overlayElement) {
    overlayElement = document.createElement("div");
    overlayElement.className = "template-recognition-marks-overlay";
    overlayElement.setAttribute("aria-hidden", "true");
    overlayElement.innerHTML = ["top-left", "top-right", "bottom-left", "bottom-right"]
      .map((corner) => `<span class="template-recognition-mark ${corner}"></span>`)
      .join("");
    canvasElement.append(overlayElement);
  }

  const surfaceRect = surfaceElement.getBoundingClientRect();
  const canvasRect = canvasElement.getBoundingClientRect();
  const offsetX = pointValueToCssPixel(config.offsetXPt);
  const offsetY = pointValueToCssPixel(config.offsetYPt);
  const markSize = pointValueToCssPixel(config.sizePt);

  overlayElement.style.left = `${Math.round((surfaceRect.left - canvasRect.left + canvasElement.scrollLeft) * 100) / 100}px`;
  overlayElement.style.top = `${Math.round((surfaceRect.top - canvasRect.top + canvasElement.scrollTop) * 100) / 100}px`;
  overlayElement.style.width = `${Math.round(surfaceRect.width * 100) / 100}px`;
  overlayElement.style.height = `${Math.round(surfaceRect.height * 100) / 100}px`;
  overlayElement.style.setProperty("--recognition-mark-offset-x", `${offsetX}px`);
  overlayElement.style.setProperty("--recognition-mark-offset-y", `${offsetY}px`);
  overlayElement.style.setProperty("--recognition-mark-size", `${markSize}px`);
}

function createRecognitionMarksControls(page) {
  const config = getPageRecognitionMarksConfig(page);
  const sectionElement = document.createElement("section");

  sectionElement.className = "template-page-property-field examlist-recognition-marks-field";
  sectionElement.innerHTML = `
    <div class="examlist-recognition-marks-header">
      <span>인식 기준값</span>
      <label class="examlist-switch-control">
        <input class="sr-only" data-examlist-recognition-setting="enabled" type="checkbox" aria-label="인식 기준값 사용" ${config.enabled ? "checked" : ""} />
        <span class="examlist-switch-track" aria-hidden="true"><span></span></span>
      </label>
    </div>
    <div class="template-page-margin-grid examlist-recognition-marks-grid">
      <label>
        <span>X 여백</span>
        <input class="template-page-property-control" data-examlist-recognition-setting="offsetX" type="number" inputmode="decimal" autocomplete="off" min="0" max="80" step="0.5" value="${formatMillimeterInputValue(config.offsetXPt)}" aria-label="인식 기준값 X 여백 직접 입력" />
      </label>
      <label>
        <span>Y 여백</span>
        <input class="template-page-property-control" data-examlist-recognition-setting="offsetY" type="number" inputmode="decimal" autocomplete="off" min="0" max="80" step="0.5" value="${formatMillimeterInputValue(config.offsetYPt)}" aria-label="인식 기준값 Y 여백 직접 입력" />
      </label>
    </div>
  `;

  return sectionElement;
}

function syncRecognitionMarksControls(sectionElement, config) {
  const normalizedConfig = normalizeRecognitionMarksConfig(config);
  const enabledControl = sectionElement?.querySelector?.('[data-examlist-recognition-setting="enabled"]');
  const offsetXControl = sectionElement?.querySelector?.('[data-examlist-recognition-setting="offsetX"]');
  const offsetYControl = sectionElement?.querySelector?.('[data-examlist-recognition-setting="offsetY"]');

  if (enabledControl instanceof HTMLInputElement) {
    enabledControl.checked = normalizedConfig.enabled;
  }

  if (offsetXControl instanceof HTMLInputElement) {
    offsetXControl.value = formatMillimeterInputValue(normalizedConfig.offsetXPt);
    offsetXControl.disabled = !normalizedConfig.enabled;
  }

  if (offsetYControl instanceof HTMLInputElement) {
    offsetYControl.value = formatMillimeterInputValue(normalizedConfig.offsetYPt);
    offsetYControl.disabled = !normalizedConfig.enabled;
  }
}

function readRecognitionMarksControls(sectionElement, fallbackConfig) {
  const enabledControl = sectionElement?.querySelector?.('[data-examlist-recognition-setting="enabled"]');
  const offsetXControl = sectionElement?.querySelector?.('[data-examlist-recognition-setting="offsetX"]');
  const offsetYControl = sectionElement?.querySelector?.('[data-examlist-recognition-setting="offsetY"]');
  const fallback = normalizeRecognitionMarksConfig(fallbackConfig);

  return normalizeRecognitionMarksConfig({
    enabled: enabledControl instanceof HTMLInputElement ? enabledControl.checked : fallback.enabled,
    offsetXPt: toPointValue(offsetXControl instanceof HTMLInputElement ? offsetXControl.value : toMillimeterValue(fallback.offsetXPt)),
    offsetYPt: toPointValue(offsetYControl instanceof HTMLInputElement ? offsetYControl.value : toMillimeterValue(fallback.offsetYPt)),
    sizePt: fallback.sizePt,
  });
}

function isRecognitionMarksNumberControl(control) {
  return control instanceof HTMLInputElement &&
    control.type === "number" &&
    Boolean(control.closest?.(".examlist-recognition-marks-field"));
}

export function commitRecognitionMarksControlsToPage({
  appState = null,
  pagePropertiesHost,
  selectedPage,
  surfaceElement,
  syncControls = true,
} = {}) {
  const sectionElement = pagePropertiesHost?.querySelector?.(".examlist-recognition-marks-field") || null;
  const activePage = resolveSelectedPage(appState, selectedPage);

  if (!sectionElement || !activePage) {
    return false;
  }

  const nextConfig = readRecognitionMarksControls(sectionElement, getPageRecognitionMarksConfig(activePage));

  if (nextConfig.enabled || hasRecognitionMarksConfig(activePage)) {
    writeRecognitionMarksConfigToPage(activePage, nextConfig);
  } else if (activePage.settings && typeof activePage.settings === "object") {
    delete activePage.settings.recognitionMarks;
  }

  if (syncControls) {
    syncRecognitionMarksControls(sectionElement, nextConfig);
  }
  updateRecognitionMarksOverlay(surfaceElement, activePage);
  return true;
}

export function bindRecognitionMarksControls({ appState = null, onDirty = null, pagePropertiesHost, selectedPage, surfaceElement }) {
  if (!pagePropertiesHost || !selectedPage || !surfaceElement) {
    return null;
  }

  pagePropertiesHost.querySelector(".examlist-recognition-marks-field")?.remove();

  const sectionElement = createRecognitionMarksControls(selectedPage);
  pagePropertiesHost.append(sectionElement);
  syncRecognitionMarksControls(sectionElement, getPageRecognitionMarksConfig(selectedPage));
  updateRecognitionMarksOverlay(surfaceElement, selectedPage);

  const applyFromControls = ({ syncControls = true } = {}) => {
    if (
      !commitRecognitionMarksControlsToPage({
        appState,
        pagePropertiesHost,
        selectedPage,
        surfaceElement,
        syncControls,
      })
    ) {
      return;
    }

    if (typeof onDirty === "function") {
      onDirty();
    }
  };
  const scheduleOverlayUpdate = () => {
    window.requestAnimationFrame(() => updateRecognitionMarksOverlay(surfaceElement, resolveSelectedPage(appState, selectedPage)));
  };
  const handleRecognitionControlChange = (event) => {
    const control = event.target?.closest?.("[data-examlist-recognition-setting]");

    if (!control) {
      return;
    }

    applyFromControls({ syncControls: !isRecognitionMarksNumberControl(control) });
  };
  const handleRecognitionControlFocusOut = (event) => {
    const control = event.target?.closest?.("[data-examlist-recognition-setting]");

    if (!isRecognitionMarksNumberControl(control)) {
      return;
    }

    applyFromControls();
  };
  const handlePageSettingChange = (event) => {
    if (!event.target?.closest?.("[data-template-page-setting]")) {
      return;
    }

    scheduleOverlayUpdate();
  };
  const resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(scheduleOverlayUpdate)
    : null;

  sectionElement.addEventListener("input", handleRecognitionControlChange);
  sectionElement.addEventListener("change", handleRecognitionControlChange);
  sectionElement.addEventListener("focusout", handleRecognitionControlFocusOut);
  pagePropertiesHost.addEventListener("input", handlePageSettingChange);
  pagePropertiesHost.addEventListener("change", handlePageSettingChange);
  resizeObserver?.observe(surfaceElement);

  return () => {
    sectionElement.removeEventListener("input", handleRecognitionControlChange);
    sectionElement.removeEventListener("change", handleRecognitionControlChange);
    sectionElement.removeEventListener("focusout", handleRecognitionControlFocusOut);
    pagePropertiesHost.removeEventListener("input", handlePageSettingChange);
    pagePropertiesHost.removeEventListener("change", handlePageSettingChange);
    resizeObserver?.disconnect();
    sectionElement.remove();
    removeRecognitionMarksOverlay(surfaceElement);
  };
}
