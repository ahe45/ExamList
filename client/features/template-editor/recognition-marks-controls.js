const cssPixelsPerPoint = 96 / 72;
// All templates use the default template's 5 mm recognition mark margins.
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
    offsetXPt: defaultRecognitionMarkOffsetPt,
    offsetYPt: defaultRecognitionMarkOffsetPt,
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

function pointValueToCssPixel(value) {
  return Math.round(normalizeRecognitionMarkPoint(value, 0, 1000) * cssPixelsPerPoint * 100) / 100;
}

function getRecognitionMarksSurfaceScale(surfaceElement) {
  const rect = surfaceElement?.getBoundingClientRect?.();
  const width = surfaceElement?.clientWidth || 0;
  const height = surfaceElement?.clientHeight || 0;

  return {
    x: Math.max(width > 0 && rect?.width > 0 ? rect.width / width : 1, 0.01),
    y: Math.max(height > 0 && rect?.height > 0 ? rect.height / height : 1, 0.01),
  };
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
  const surfaceScale = getRecognitionMarksSurfaceScale(surfaceElement);
  const markScale = Math.max(Math.min(surfaceScale.x, surfaceScale.y), 0.01);

  overlayElement.style.left = `${Math.round((surfaceRect.left - canvasRect.left + canvasElement.scrollLeft) * 100) / 100}px`;
  overlayElement.style.top = `${Math.round((surfaceRect.top - canvasRect.top + canvasElement.scrollTop) * 100) / 100}px`;
  overlayElement.style.width = `${Math.round(surfaceRect.width * 100) / 100}px`;
  overlayElement.style.height = `${Math.round(surfaceRect.height * 100) / 100}px`;
  overlayElement.style.setProperty("--recognition-mark-offset-x", `${Math.round(offsetX * surfaceScale.x * 100) / 100}px`);
  overlayElement.style.setProperty("--recognition-mark-offset-y", `${Math.round(offsetY * surfaceScale.y * 100) / 100}px`);
  overlayElement.style.setProperty("--recognition-mark-size", `${Math.round(markSize * markScale * 100) / 100}px`);
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
  `;

  return sectionElement;
}

function syncRecognitionMarksControls(sectionElement, config) {
  const normalizedConfig = normalizeRecognitionMarksConfig(config);
  const enabledControl = sectionElement?.querySelector?.('[data-examlist-recognition-setting="enabled"]');

  if (enabledControl instanceof HTMLInputElement) {
    enabledControl.checked = normalizedConfig.enabled;
  }

}

function readRecognitionMarksControls(sectionElement, fallbackConfig) {
  const enabledControl = sectionElement?.querySelector?.('[data-examlist-recognition-setting="enabled"]');
  const fallback = normalizeRecognitionMarksConfig(fallbackConfig);

  return normalizeRecognitionMarksConfig({
    enabled: enabledControl instanceof HTMLInputElement ? enabledControl.checked : fallback.enabled,
    sizePt: fallback.sizePt,
  });
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
  const handleCanvasZoomChange = scheduleOverlayUpdate;

  sectionElement.addEventListener("input", handleRecognitionControlChange);
  sectionElement.addEventListener("change", handleRecognitionControlChange);
  pagePropertiesHost.addEventListener("input", handlePageSettingChange);
  pagePropertiesHost.addEventListener("change", handlePageSettingChange);
  surfaceElement.addEventListener("template-editor-canvas-zoom-change", handleCanvasZoomChange);
  resizeObserver?.observe(surfaceElement);

  return () => {
    sectionElement.removeEventListener("input", handleRecognitionControlChange);
    sectionElement.removeEventListener("change", handleRecognitionControlChange);
    pagePropertiesHost.removeEventListener("input", handlePageSettingChange);
    pagePropertiesHost.removeEventListener("change", handlePageSettingChange);
    surfaceElement.removeEventListener("template-editor-canvas-zoom-change", handleCanvasZoomChange);
    resizeObserver?.disconnect();
    sectionElement.remove();
    removeRecognitionMarksOverlay(surfaceElement);
  };
}
