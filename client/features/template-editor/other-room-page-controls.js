function isContentTemplatePage(page) {
  return String(page?.type || "").trim() === "content";
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

function normalizeOtherRoomPageConfig(value) {
  const source = value && typeof value === "object" ? value : {};

  return {
    enabled: source.enabled === true || String(source.enabled || "").trim().toLowerCase() === "true",
  };
}

export function getOtherRoomPageConfig(page) {
  const config = normalizeOtherRoomPageConfig(page?.settings?.otherRoomPage);

  return isContentTemplatePage(page) ? config : { ...config, enabled: false };
}

function writeOtherRoomPageConfigToPage(page, config) {
  if (!page) {
    return;
  }

  page.settings = page.settings && typeof page.settings === "object" ? page.settings : {};
  page.settings.otherRoomPage = {
    ...normalizeOtherRoomPageConfig(config),
    ...(isContentTemplatePage(page) ? {} : { enabled: false }),
  };
}

function createOtherRoomPageControls(page) {
  const config = getOtherRoomPageConfig(page);
  const sectionElement = document.createElement("section");

  sectionElement.className = "template-page-property-field examlist-other-room-page-field";
  sectionElement.innerHTML = `
    <div class="examlist-other-room-page-header">
      <span>타 고사실 페이지</span>
      <label class="examlist-switch-control">
        <input class="sr-only" data-examlist-other-room-page-setting="enabled" type="checkbox" aria-label="타 고사실 페이지 사용" ${config.enabled ? "checked" : ""} />
        <span class="examlist-switch-track" aria-hidden="true"><span></span></span>
      </label>
    </div>
  `;

  return sectionElement;
}

function syncOtherRoomPageControls(sectionElement, page) {
  const enabledControl = sectionElement?.querySelector?.('[data-examlist-other-room-page-setting="enabled"]');
  const config = getOtherRoomPageConfig(page);

  if (enabledControl instanceof HTMLInputElement) {
    enabledControl.checked = config.enabled;
  }
}

function readOtherRoomPageControls(sectionElement, fallbackConfig) {
  const enabledControl = sectionElement?.querySelector?.('[data-examlist-other-room-page-setting="enabled"]');
  const fallback = normalizeOtherRoomPageConfig(fallbackConfig);

  return normalizeOtherRoomPageConfig({
    enabled: enabledControl instanceof HTMLInputElement ? enabledControl.checked : fallback.enabled,
  });
}

export function commitOtherRoomPageControlsToPage({
  appState = null,
  pagePropertiesHost,
  selectedPage,
  syncControls = true,
} = {}) {
  const sectionElement = pagePropertiesHost?.querySelector?.(".examlist-other-room-page-field") || null;
  const activePage = resolveSelectedPage(appState, selectedPage);

  if (!sectionElement || !activePage || !isContentTemplatePage(activePage)) {
    return false;
  }

  writeOtherRoomPageConfigToPage(
    activePage,
    readOtherRoomPageControls(sectionElement, activePage.settings?.otherRoomPage),
  );

  if (syncControls) {
    syncOtherRoomPageControls(sectionElement, activePage);
  }

  return true;
}

export function bindOtherRoomPageControls({ appState = null, onDirty = null, pagePropertiesHost, selectedPage }) {
  if (!pagePropertiesHost || !selectedPage) {
    return null;
  }

  pagePropertiesHost.querySelector(".examlist-other-room-page-field")?.remove();

  if (!isContentTemplatePage(selectedPage)) {
    return () => {
      pagePropertiesHost.querySelector(".examlist-other-room-page-field")?.remove();
    };
  }

  const sectionElement = createOtherRoomPageControls(selectedPage);
  const recognitionMarksElement = pagePropertiesHost.querySelector(".examlist-recognition-marks-field");

  if (recognitionMarksElement) {
    recognitionMarksElement.after(sectionElement);
  } else {
    pagePropertiesHost.append(sectionElement);
  }

  syncOtherRoomPageControls(sectionElement, selectedPage);

  const applyFromControls = () => {
    if (
      !commitOtherRoomPageControlsToPage({
        appState,
        pagePropertiesHost,
        selectedPage,
      })
    ) {
      return;
    }

    if (typeof onDirty === "function") {
      onDirty();
    }
  };
  const handleControlChange = (event) => {
    if (!event.target?.closest?.("[data-examlist-other-room-page-setting]")) {
      return;
    }

    applyFromControls();
  };

  sectionElement.addEventListener("input", handleControlChange);
  sectionElement.addEventListener("change", handleControlChange);

  return () => {
    sectionElement.removeEventListener("input", handleControlChange);
    sectionElement.removeEventListener("change", handleControlChange);
    sectionElement.remove();
  };
}
