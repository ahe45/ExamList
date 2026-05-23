import {
  areDataTagSampleValuesEqual,
  areDataTagEmptyValueDataEqual,
  buildDefaultDataTagEmptyValueData,
  buildDefaultDataTagSampleValues,
  createDataTagSettingsPayload,
  normalizeDataTagEmptyValueData,
  normalizeDataTagSampleValues,
  saveDataTagEmptyValueData,
  saveDataTagSampleValues,
} from "./data-tag-samples.js";
import { flattenTemplateTags } from "./data-tags-definitions.js";

function ensureDataTagSampleModalState(appState) {
  appState.templateEditor.dataTagSampleModal = {
    draftEmptyValueData: {},
    draftValues: {},
    isOpen: false,
    ...(appState.templateEditor.dataTagSampleModal || {}),
  };

  return appState.templateEditor.dataTagSampleModal;
}

function getBaseTagDefinitions(appState) {
  return flattenTemplateTags(appState.templateEditor.dataTags);
}

function normalizeCurrentSampleValues(appState) {
  const definitions = getBaseTagDefinitions(appState);
  const normalizedValues = normalizeDataTagSampleValues(definitions, appState.templateEditor.dataTagSampleValues || {});

  appState.templateEditor.dataTagSampleValues = normalizedValues;
  return normalizedValues;
}

function normalizeCurrentEmptyValueData(appState) {
  const definitions = getBaseTagDefinitions(appState);
  const normalizedValues = normalizeDataTagEmptyValueData(definitions, appState.templateEditor.dataTagEmptyValueData || {});

  appState.templateEditor.dataTagEmptyValueData = normalizedValues;
  return normalizedValues;
}

function syncDataTagSettingsToTemplate(appState, { markDirty = true } = {}) {
  const template = appState.templateEditor.template;

  if (!template?.layout) {
    return;
  }

  const definitions = getBaseTagDefinitions(appState);
  template.layout.dataTagSettings = createDataTagSettingsPayload(definitions, {
    emptyValueData: appState.templateEditor.dataTagEmptyValueData || {},
    sampleData: appState.templateEditor.dataTagSampleValues || {},
  });

  if (markDirty) {
    appState.templateEditor.isDirty = true;
  }
}

export function createDataTagSampleActions({ appState, onSaveDataTagSettings = null, onStateChange }) {
  async function openDataTagSampleModal() {
    const modalState = ensureDataTagSampleModalState(appState);
    const currentValues = normalizeCurrentSampleValues(appState);
    const currentEmptyValueData = normalizeCurrentEmptyValueData(appState);

    modalState.draftValues = { ...currentValues };
    modalState.draftEmptyValueData = { ...currentEmptyValueData };
    modalState.isOpen = true;
    await onStateChange();
  }

  async function closeDataTagSampleModal() {
    const modalState = ensureDataTagSampleModalState(appState);

    modalState.draftEmptyValueData = {};
    modalState.draftValues = {};
    modalState.isOpen = false;
    await onStateChange();
  }

  function updateDataTagSampleDraftValue(key = "", value = "", settingKind = "sample") {
    const normalizedKey = String(key || "").trim();

    if (!normalizedKey) {
      return;
    }

    const modalState = ensureDataTagSampleModalState(appState);

    if (settingKind === "empty") {
      modalState.draftEmptyValueData = {
        ...(modalState.draftEmptyValueData || {}),
        [normalizedKey]: String(value ?? ""),
      };
      return;
    }

    modalState.draftValues = {
      ...(modalState.draftValues || {}),
      [normalizedKey]: String(value ?? ""),
    };
  }

  async function resetDataTagSampleModal() {
    const modalState = ensureDataTagSampleModalState(appState);

    modalState.draftValues = buildDefaultDataTagSampleValues(getBaseTagDefinitions(appState));
    modalState.draftEmptyValueData = buildDefaultDataTagEmptyValueData(getBaseTagDefinitions(appState));
    modalState.isOpen = true;
    await onStateChange();
  }

  async function saveDataTagSampleModal() {
    const definitions = getBaseTagDefinitions(appState);
    const modalState = ensureDataTagSampleModalState(appState);
    const nextValues = saveDataTagSampleValues(definitions, modalState.draftValues || {});
    const nextEmptyValueData = saveDataTagEmptyValueData(definitions, modalState.draftEmptyValueData || {});

    appState.templateEditor.dataTagSampleValues = nextValues;
    appState.templateEditor.dataTagEmptyValueData = nextEmptyValueData;
    const shouldPersistImmediately = typeof onSaveDataTagSettings === "function";

    syncDataTagSettingsToTemplate(appState, { markDirty: !shouldPersistImmediately });

    if (shouldPersistImmediately) {
      const didSave = await onSaveDataTagSettings();

      if (didSave === false) {
        appState.templateEditor.isDirty = true;
        await onStateChange();
        return;
      }
    }

    modalState.draftEmptyValueData = {};
    modalState.draftValues = {};
    modalState.isOpen = false;
    await onStateChange();
  }

  function isDataTagSampleModalDirty() {
    const definitions = getBaseTagDefinitions(appState);
    const modalState = ensureDataTagSampleModalState(appState);

    return !areDataTagSampleValuesEqual(
      definitions,
      normalizeCurrentSampleValues(appState),
      modalState.draftValues || {},
    ) || !areDataTagEmptyValueDataEqual(
      definitions,
      normalizeCurrentEmptyValueData(appState),
      modalState.draftEmptyValueData || {},
    );
  }

  return Object.freeze({
    closeDataTagSampleModal,
    isDataTagSampleModalDirty,
    openDataTagSampleModal,
    resetDataTagSampleModal,
    saveDataTagSampleModal,
    updateDataTagSampleDraftValue,
  });
}
