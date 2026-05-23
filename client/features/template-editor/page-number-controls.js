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

const pageNumberDefaults = Object.freeze({
  enabled: false,
  preset: "numericCurrentTotal",
});

function isCoverTemplatePage(page) {
  return String(page?.type || "").trim() === "cover";
}

function normalizePageNumberConfig(value) {
  const source = value && typeof value === "object" ? value : {};
  const rawPreset = String(source.preset || "").trim();
  const preset = pageNumberPresetKeys.includes(rawPreset)
    ? rawPreset
    : legacyPageNumberPresetAliases[rawPreset] || pageNumberDefaults.preset;

  return {
    enabled: source.enabled === true || String(source.enabled || "").trim().toLowerCase() === "true",
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

  overlayElement.textContent = renderPageNumberText(config, getEditorPageNumberContext(editorState, selectedPage));
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
  `;

  return sectionElement;
}

function syncPageNumberControls(sectionElement, page) {
  const isCoverPage = isCoverTemplatePage(page);
  const config = getPageNumberConfig(page);
  const enabledControl = sectionElement?.querySelector?.('[data-examlist-page-number-setting="enabled"]');
  const presetControl = sectionElement?.querySelector?.('[data-examlist-page-number-setting="preset"]');

  sectionElement?.classList?.toggle("is-cover-page", isCoverPage);

  if (enabledControl instanceof HTMLInputElement) {
    enabledControl.checked = !isCoverPage && config.enabled;
    enabledControl.disabled = isCoverPage;
  }

  if (presetControl instanceof HTMLSelectElement) {
    presetControl.value = config.preset;
    presetControl.disabled = isCoverPage || !config.enabled;
  }
}

function readPageNumberControls(sectionElement, fallbackConfig, page) {
  const enabledControl = sectionElement?.querySelector?.('[data-examlist-page-number-setting="enabled"]');
  const presetControl = sectionElement?.querySelector?.('[data-examlist-page-number-setting="preset"]');
  const fallback = normalizePageNumberConfig(fallbackConfig);

  if (isCoverTemplatePage(page)) {
    return normalizePageNumberConfig({
      ...fallback,
      enabled: false,
    });
  }

  return normalizePageNumberConfig({
    enabled: enabledControl instanceof HTMLInputElement ? enabledControl.checked : fallback.enabled,
    preset: presetControl instanceof HTMLSelectElement ? presetControl.value : fallback.preset,
  });
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
    writePageNumberConfigToPage(selectedPage, readPageNumberControls(sectionElement, selectedPage.settings?.pageNumber, selectedPage));
    syncPageNumberControls(sectionElement, selectedPage);
    updatePageNumberOverlay(surfaceElement, selectedPage, appState?.templateEditor);
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

    window.requestAnimationFrame(() => updatePageNumberOverlay(surfaceElement, selectedPage, appState?.templateEditor));
  };
  const resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(() => updatePageNumberOverlay(surfaceElement, selectedPage, appState?.templateEditor))
    : null;

  sectionElement.addEventListener("input", handleControlChange);
  sectionElement.addEventListener("change", handleControlChange);
  pagePropertiesHost.addEventListener("input", handlePageSettingChange);
  pagePropertiesHost.addEventListener("change", handlePageSettingChange);
  resizeObserver?.observe(surfaceElement);

  return () => {
    sectionElement.removeEventListener("input", handleControlChange);
    sectionElement.removeEventListener("change", handleControlChange);
    pagePropertiesHost.removeEventListener("input", handlePageSettingChange);
    pagePropertiesHost.removeEventListener("change", handlePageSettingChange);
    resizeObserver?.disconnect();
    sectionElement.remove();
    removePageNumberOverlay(surfaceElement);
  };
}
