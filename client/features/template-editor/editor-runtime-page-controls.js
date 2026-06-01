import { escapeHtml } from "../../app/html-utils.js";
import {
  formatGenerationUnitLabel,
} from "../../app/generation-units.js";
import {
  formatGenerationUnitFieldsSummary,
  getTemplateGenerationUnitFields,
} from "./generation-unit-settings.js";
import { generationUnitSettingsIcon } from "./generation-unit-settings-renderer.js";

function formatPageTypeLabel(value) {
  const labelMap = {
    appendix: "부록",
    content: "본문",
    cover: "표지",
    static: "고정",
  };

  return labelMap[value] || value || "페이지";
}

export function prependPageSwitcher(pagePropertiesHost, editorState) {
  const pages = Array.isArray(editorState?.template?.layout?.pages) ? editorState.template.layout.pages : [];

  if (!pagePropertiesHost || !pages.length) {
    return;
  }

  pagePropertiesHost.querySelector(".template-page-switcher")?.remove();

  const switcher = document.createElement("div");
  switcher.className = "template-page-switcher";
  switcher.setAttribute("aria-label", "양식 페이지 선택");
  switcher.setAttribute("role", "tablist");

  pages.forEach((page) => {
    const pageTypeLabel = formatPageTypeLabel(page.type);
    const pageName = page.name || pageTypeLabel || "페이지";
    const isSelected = editorState.selectedPageId === page.id;
    const button = document.createElement("button");

    button.className = `template-page-switcher-button${isSelected ? " selected" : ""}`;
    button.dataset.action = "select-editor-page";
    button.dataset.pageId = String(page.id || "");
    button.type = "button";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", isSelected ? "true" : "false");

    const label = document.createElement("span");
    label.textContent = pageTypeLabel;
    button.append(label);

    if (pageName !== pageTypeLabel) {
      const name = document.createElement("small");
      name.textContent = pageName;
      button.append(name);
    }

    switcher.append(button);
  });

  pagePropertiesHost.prepend(switcher);
}

function createTemplateGenerationUnitControls(template) {
  const generationUnit = String(template?.generationUnit || "roomCode").trim() || "roomCode";
  const summary = formatGenerationUnitFieldsSummary(getTemplateGenerationUnitFields(template));
  const sectionElement = document.createElement("section");

  sectionElement.className = "template-page-property-field examlist-generation-unit-field";
  sectionElement.innerHTML = `
    <div class="examlist-generation-unit-header">
      <span class="template-page-properties-title">생성 단위</span>
      <button
        class="icon-button template-tag-sample-settings-button examlist-generation-unit-settings-button"
        data-action="open-generation-unit-settings-modal"
        type="button"
        title="생성 단위 설정"
        aria-label="생성 단위 설정"
      >
        ${generationUnitSettingsIcon}
      </button>
    </div>
    <input type="hidden" data-examlist-template-setting="generationUnit" aria-label="생성 단위" value="${escapeHtml(generationUnit)}" />
    <p class="examlist-generation-unit-summary">${escapeHtml(summary || formatGenerationUnitLabel(generationUnit))}</p>
  `;

  return sectionElement;
}

function readTemplateGenerationUnitControl(pagePropertiesHost, fallbackTemplate) {
  const generationUnitControl = pagePropertiesHost?.querySelector?.('[data-examlist-template-setting="generationUnit"]');
  const fallbackGenerationUnit = String(fallbackTemplate?.generationUnit || "roomCode").trim() || "roomCode";
  const rawGenerationUnit = generationUnitControl instanceof HTMLInputElement
    ? generationUnitControl.value
    : fallbackGenerationUnit;

  return String(rawGenerationUnit || fallbackGenerationUnit).trim() || fallbackGenerationUnit;
}

export function applyTemplateMetadataControlsToState(appState, pagePropertiesHost) {
  const template = appState?.templateEditor?.template || null;

  if (!template) {
    return false;
  }

  const generationUnit = readTemplateGenerationUnitControl(pagePropertiesHost, template);
  const fields = getTemplateGenerationUnitFields(template);

  template.generationUnit = generationUnit;

  if (template.layout?.generation) {
    template.layout.generation.unit = generationUnit;

    if (generationUnit === "custom") {
      template.layout.generation.unitFields = fields;
    }
  }

  return true;
}

export function bindTemplateMetadataControls({ appState, onDirty, pagePropertiesHost } = {}) {
  const template = appState?.templateEditor?.template || null;

  if (!pagePropertiesHost || !template) {
    return null;
  }

  pagePropertiesHost.querySelector(".examlist-generation-unit-field")?.remove();

  const generationElement = createTemplateGenerationUnitControls(template);
  const pageNumberElement = pagePropertiesHost.querySelector(".examlist-page-number-field");

  if (pageNumberElement) {
    pageNumberElement.before(generationElement);
  } else {
    pagePropertiesHost.append(generationElement);
  }

  const handleTemplateSettingChange = (event) => {
    if (!event.target?.closest?.("[data-examlist-template-setting]")) {
      return;
    }

    applyTemplateMetadataControlsToState(appState, pagePropertiesHost);
    onDirty?.();
  };

  generationElement.addEventListener("change", handleTemplateSettingChange);

  return () => {
    generationElement.removeEventListener("change", handleTemplateSettingChange);
    generationElement.remove();
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

function isDisabledCoverTemplatePage(page) {
  return isCoverTemplatePage(page) && page?.enabled === false;
}

function createCoverPageControls(page) {
  const sectionElement = document.createElement("section");

  sectionElement.className = "template-page-property-field examlist-cover-page-field";
  sectionElement.innerHTML = `
    <div class="examlist-cover-page-header">
      <span>표지 사용</span>
      <label class="examlist-switch-control">
        <input class="sr-only" data-examlist-cover-page-setting="enabled" type="checkbox" aria-label="표지 사용" ${page?.enabled === false ? "" : "checked"} />
        <span class="examlist-switch-track" aria-hidden="true"><span></span></span>
      </label>
    </div>
  `;

  return sectionElement;
}

export function commitCoverPageControlsToPage({
  appState = null,
  pagePropertiesHost,
  selectedPage,
  surfaceElement = typeof document !== "undefined" ? document.getElementById("templateEditorSurface") : null,
  syncControls = true,
} = {}) {
  const sectionElement = pagePropertiesHost?.querySelector?.(".examlist-cover-page-field") || null;
  const activePage = resolveSelectedPage(appState, selectedPage);
  const control = sectionElement?.querySelector?.('[data-examlist-cover-page-setting="enabled"]');

  if (!sectionElement || !isCoverTemplatePage(activePage) || !(control instanceof HTMLInputElement)) {
    return false;
  }

  activePage.enabled = control.checked;

  if (syncControls) {
    control.checked = activePage.enabled !== false;
  }

  syncCoverPageDisabledState({
    pagePropertiesHost,
    selectedPage: activePage,
    surfaceElement,
  });
  return true;
}

export function bindCoverPageControls({ appState = null, onDirty, pagePropertiesHost, selectedPage } = {}) {
  if (!pagePropertiesHost || !selectedPage) {
    return null;
  }

  pagePropertiesHost.querySelector(".examlist-cover-page-field")?.remove();

  if (!isCoverTemplatePage(selectedPage)) {
    return () => {
      pagePropertiesHost.querySelector(".examlist-cover-page-field")?.remove();
    };
  }

  const sectionElement = createCoverPageControls(selectedPage);
  const pageSwitcherElement = pagePropertiesHost.querySelector(".template-page-switcher");

  if (pageSwitcherElement) {
    pageSwitcherElement.after(sectionElement);
  } else {
    pagePropertiesHost.prepend(sectionElement);
  }

  const handleCoverPageChange = (event) => {
    const control = event.target?.closest?.('[data-examlist-cover-page-setting="enabled"]');

    if (!(control instanceof HTMLInputElement)) {
      return;
    }

    if (
      !commitCoverPageControlsToPage({
        appState,
        pagePropertiesHost,
        selectedPage,
        surfaceElement: document.getElementById("templateEditorSurface"),
      })
    ) {
      return;
    }

    onDirty?.();
  };

  sectionElement.addEventListener("change", handleCoverPageChange);

  return () => {
    sectionElement.removeEventListener("change", handleCoverPageChange);
    sectionElement.remove();
  };
}

export function syncCoverPageDisabledState({ pagePropertiesHost, selectedPage, surfaceElement } = {}) {
  const disabled = isDisabledCoverTemplatePage(selectedPage);

  pagePropertiesHost?.classList?.toggle("is-cover-page-disabled", disabled);

  pagePropertiesHost?.querySelectorAll?.("button, input, select, textarea").forEach((control) => {
    if (
      control.closest?.(".examlist-cover-page-field") ||
      control.closest?.(".template-page-switcher")
    ) {
      return;
    }

    if (disabled) {
      if (!control.disabled) {
        control.dataset.examlistCoverDisabledControl = "true";
        control.disabled = true;
      }
      return;
    }

    if (control.dataset.examlistCoverDisabledControl === "true") {
      control.disabled = false;
      delete control.dataset.examlistCoverDisabledControl;
    }
  });

  if (typeof HTMLElement === "undefined" || !(surfaceElement instanceof HTMLElement)) {
    return;
  }

  surfaceElement.classList.toggle("is-cover-page-disabled", disabled);

  if (disabled) {
    if (!Object.prototype.hasOwnProperty.call(surfaceElement.dataset, "examlistCoverPreviousContenteditable")) {
      surfaceElement.dataset.examlistCoverPreviousContenteditable = surfaceElement.getAttribute("contenteditable") || "";
    }

    surfaceElement.setAttribute("contenteditable", "false");
    surfaceElement.setAttribute("aria-disabled", "true");
    surfaceElement.classList.add("readonly");
    return;
  }

  if (Object.prototype.hasOwnProperty.call(surfaceElement.dataset, "examlistCoverPreviousContenteditable")) {
    const previousValue = surfaceElement.dataset.examlistCoverPreviousContenteditable || "";

    if (previousValue) {
      surfaceElement.setAttribute("contenteditable", previousValue);
    } else {
      surfaceElement.removeAttribute("contenteditable");
    }

    delete surfaceElement.dataset.examlistCoverPreviousContenteditable;
  }

  surfaceElement.removeAttribute("aria-disabled");
  surfaceElement.classList.remove("readonly");
}
