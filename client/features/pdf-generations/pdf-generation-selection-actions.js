function normalizeGenerationIdList(generationIds = []) {
  return [...new Set(generationIds.map((generationId) => String(generationId || "").trim()).filter(Boolean))];
}

export function getVisibleGenerationMap(appState) {
  return new Map(appState.pdfGenerations.items.map((item) => [String(item.id || ""), item]));
}

export function getSelectedDownloadableGenerationIds(appState) {
  const generationMap = getVisibleGenerationMap(appState);

  return appState.pdfGenerations.selectedGenerationIds.filter((generationId) => {
    const item = generationMap.get(generationId);
    return Boolean(item && item.status === "completed");
  });
}

export function getSelectedRerunnableGenerationIds(appState) {
  const generationMap = getVisibleGenerationMap(appState);

  return appState.pdfGenerations.selectedGenerationIds.filter((generationId) => {
    const item = generationMap.get(generationId);
    return Boolean(item && item.canRerun);
  });
}

export function setSelectedGenerationIds(appState, nextSelection) {
  appState.pdfGenerations.selectedGenerationIds = normalizeGenerationIdList(nextSelection);
}

export function setRerunningGenerationIds(appState, nextIds) {
  appState.pdfGenerations.rerunningGenerationIds = normalizeGenerationIdList(nextIds);
}

export function createPdfGenerationSelectionActions({ appState, getVisibleGenerationItems = null, onStateChange }) {
  function getScopedGenerationItems() {
    return typeof getVisibleGenerationItems === "function"
      ? getVisibleGenerationItems()
      : appState.pdfGenerations.items;
  }

  function getScopedDownloadableGenerationIds() {
    return getScopedGenerationItems()
      .filter((item) => item.status === "completed" && item.id)
      .map((item) => String(item.id || ""));
  }

  function setSelectionAnchor(generationId = "") {
    appState.pdfGenerations.selectionAnchorGenerationId = String(generationId || "").trim();
  }

  function toggleGenerationSelection(generationId, isChecked, options = {}) {
    const normalizedGenerationId = String(generationId || "").trim();
    const scopedDownloadableGenerationIds = getScopedDownloadableGenerationIds();
    const scopedGenerationIdSet = new Set(scopedDownloadableGenerationIds);

    if (!normalizedGenerationId || !scopedGenerationIdSet.has(normalizedGenerationId)) {
      return;
    }

    const selection = new Set(appState.pdfGenerations.selectedGenerationIds);
    const anchorGenerationId = String(appState.pdfGenerations.selectionAnchorGenerationId || "").trim();
    const anchorIndex = scopedDownloadableGenerationIds.indexOf(anchorGenerationId);
    const targetIndex = scopedDownloadableGenerationIds.indexOf(normalizedGenerationId);

    if (options.shiftKey && anchorIndex >= 0 && targetIndex >= 0) {
      const [startIndex, endIndex] = anchorIndex < targetIndex
        ? [anchorIndex, targetIndex]
        : [targetIndex, anchorIndex];
      const rangeGenerationIds = scopedDownloadableGenerationIds.slice(startIndex, endIndex + 1);

      rangeGenerationIds.forEach((rangeGenerationId) => {
        if (isChecked) {
          selection.add(rangeGenerationId);
        } else {
          selection.delete(rangeGenerationId);
        }
      });
    } else if (isChecked) {
      selection.add(normalizedGenerationId);
    } else {
      selection.delete(normalizedGenerationId);
    }

    setSelectionAnchor(normalizedGenerationId);
    setSelectedGenerationIds(appState, [...selection]);
    onStateChange();
  }

  function selectAllVisibleGenerations() {
    setSelectedGenerationIds(appState, getScopedDownloadableGenerationIds());
    setSelectionAnchor("");
    onStateChange();
  }

  function clearVisibleGenerationSelection() {
    const scopedGenerationIds = new Set(getScopedDownloadableGenerationIds());

    if (!scopedGenerationIds.size) {
      return;
    }

    setSelectedGenerationIds(
      appState,
      appState.pdfGenerations.selectedGenerationIds.filter((generationId) => !scopedGenerationIds.has(String(generationId || ""))),
    );
    setSelectionAnchor("");
    onStateChange();
  }

  function clearGenerationSelection() {
    setSelectedGenerationIds(appState, []);
    setSelectionAnchor("");
    onStateChange();
  }

  return Object.freeze({
    clearGenerationSelection,
    clearVisibleGenerationSelection,
    selectAllVisibleGenerations,
    setRerunningGenerationIds: (nextIds) => setRerunningGenerationIds(appState, nextIds),
    setSelectedGenerationIds: (nextSelection) => setSelectedGenerationIds(appState, nextSelection),
    toggleGenerationSelection,
  });
}
