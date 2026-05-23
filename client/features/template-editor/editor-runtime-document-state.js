import {
  buildCandidateBlockGridHtml,
  collapseCandidateBlockGridForStorage,
  isPhotoCandidateBlockGridPage,
  removeCandidateBlockGridRuntimeControls,
} from "./candidate-block-grid-adapter.js";
import { normalizeTokenLabels } from "./data-tags-adapter.js";
import { getPageDocumentHtml } from "./document-editor.js";
import {
  examListPaperPresetByRuntimeSize,
  getRuntimePageSettings,
  runtimePageSizeByExamListPaperPreset,
  normalizeOrientation,
  paperPresetDimensionsPt,
  supportedRuntimePageSizes,
  toFiniteNumber,
  toPointValue,
} from "./page-settings-adapter.js";
import {
  ensureDocumentElement,
  normalizeTemplateDocumentWrappers,
  writeRuntimePageSettings,
} from "./template-document-normalizer.js";

export function normalizeSavedRuntimeHtml(html, tagDefinitions = []) {
  const template = document.createElement("template");

  template.innerHTML = String(html || "");
  removeCandidateBlockGridRuntimeControls(template.content);
  collapseCandidateBlockGridForStorage(template.content);
  normalizeTemplateDocumentWrappers(template.content);
  normalizeTokenLabels(template.content, tagDefinitions, { showIcons: true, showSampleData: false });
  return template.innerHTML;
}

export function buildInitialHtml(page, template, tagDefinitions = []) {
  const container = document.createElement("div");

  container.innerHTML = isPhotoCandidateBlockGridPage(page)
    ? buildCandidateBlockGridHtml(page)
    : getPageDocumentHtml(page) || "<div class=\"template-doc\"><p><br></p></div>";
  writeRuntimePageSettings(ensureDocumentElement(container), getRuntimePageSettings(page, template));
  return normalizeSavedRuntimeHtml(container.innerHTML, tagDefinitions);
}

export function readRuntimePageSettingsFromHtml(html) {
  const template = document.createElement("template");

  template.innerHTML = String(html || "");
  const documentElement = template.content.querySelector(".template-doc");

  return {
    marginBottom: toFiniteNumber(documentElement?.dataset.templatePageMarginBottom, 10),
    marginLeft: toFiniteNumber(documentElement?.dataset.templatePageMarginLeft, 10),
    marginRight: toFiniteNumber(documentElement?.dataset.templatePageMarginRight, 10),
    marginTop: toFiniteNumber(documentElement?.dataset.templatePageMarginTop, 10),
    orientation: normalizeOrientation(documentElement?.dataset.templatePageOrientation),
    size: String(documentElement?.dataset.templatePageSize || "").trim().toUpperCase() || "A4",
  };
}

export function applyPaperSettingsToTemplate(template, settings, initialPaperPreset = "") {
  const nextPaperPreset = examListPaperPresetByRuntimeSize[settings.size];
  const canApplyRuntimePaperPreset =
    nextPaperPreset &&
    supportedRuntimePageSizes.has(settings.size) &&
    Boolean(runtimePageSizeByExamListPaperPreset[initialPaperPreset]);

  if (!canApplyRuntimePaperPreset) {
    return;
  }

  const baseDimension = paperPresetDimensionsPt[nextPaperPreset] || paperPresetDimensionsPt.A4;
  const orientation = normalizeOrientation(settings.orientation);
  const widthPt = orientation === "landscape" ? baseDimension.heightPt : baseDimension.widthPt;
  const heightPt = orientation === "landscape" ? baseDimension.widthPt : baseDimension.heightPt;

  template.paperPreset = nextPaperPreset;
  template.orientation = orientation;

  if (template.layout?.paper) {
    template.layout.paper = {
      ...template.layout.paper,
      heightPt,
      orientation,
      preset: nextPaperPreset,
      widthPt,
    };
  }

  if (Array.isArray(template.layout?.pages)) {
    template.layout.pages = template.layout.pages.map((page) => ({
      ...page,
      heightPt,
      widthPt,
    }));
  }
}

export function applySafeAreaToTemplate(template, selectedPage, settings) {
  const safeArea = {
    bottom: toPointValue(settings.marginBottom),
    left: toPointValue(settings.marginLeft),
    right: toPointValue(settings.marginRight),
    top: toPointValue(settings.marginTop),
  };

  selectedPage.settings = {
    ...(selectedPage.settings || {}),
    safeArea,
  };

  if (template.layout?.paper) {
    template.layout.paper = {
      ...template.layout.paper,
      margin: safeArea,
    };
  }
}
