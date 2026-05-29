const composingGridFilterSearchInputs = new WeakSet();

function resolveGridFilterSearchInput(event, selector) {
  const target = event?.target;

  if (!target?.matches?.(selector)) {
    return null;
  }

  return target;
}

function getGridFilterSearchSelection(inputElement) {
  const valueLength = String(inputElement?.value || "").length;
  const selectionStart = Number.isFinite(inputElement?.selectionStart) ? inputElement.selectionStart : valueLength;
  const selectionEnd = Number.isFinite(inputElement?.selectionEnd) ? inputElement.selectionEnd : selectionStart;

  return { selectionEnd, selectionStart };
}

function restoreGridFilterSearchFocus(selector, selectionStart = 0, selectionEnd = selectionStart) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  window.requestAnimationFrame(() => {
    const inputElement = document.querySelector(selector);

    if (!inputElement || typeof inputElement.focus !== "function") {
      return;
    }

    inputElement.focus({ preventScroll: true });

    if (typeof inputElement.setSelectionRange !== "function") {
      return;
    }

    try {
      inputElement.setSelectionRange(selectionStart, selectionEnd);
    } catch (_error) {
      // Some input types can reject selection ranges; focus restoration is still useful.
    }
  });
}

function isGridFilterSearchComposing(event, inputElement) {
  return Boolean(event?.isComposing || composingGridFilterSearchInputs.has(inputElement));
}

export function markGridFilterSearchCompositionStart(event, selector) {
  const inputElement = resolveGridFilterSearchInput(event, selector);

  if (!inputElement) {
    return false;
  }

  composingGridFilterSearchInputs.add(inputElement);
  return true;
}

export async function handleGridFilterSearchInput(event, options = {}) {
  const {
    getTableState,
    onStateChange,
    refreshFilterMenu,
    selector,
  } = options;
  const inputElement = resolveGridFilterSearchInput(event, selector);

  if (!inputElement) {
    return false;
  }

  getTableState().filterMenuSearch = inputElement.value;

  if (isGridFilterSearchComposing(event, inputElement)) {
    return true;
  }

  const { selectionEnd, selectionStart } = getGridFilterSearchSelection(inputElement);

  if (typeof refreshFilterMenu === "function" && refreshFilterMenu() === true) {
    return true;
  }

  await onStateChange();
  restoreGridFilterSearchFocus(selector, selectionStart, selectionEnd);
  return true;
}

export async function handleGridFilterSearchCompositionEnd(event, options = {}) {
  const {
    getTableState,
    onStateChange,
    refreshFilterMenu,
    selector,
  } = options;
  const inputElement = resolveGridFilterSearchInput(event, selector);

  if (!inputElement) {
    return false;
  }

  composingGridFilterSearchInputs.delete(inputElement);
  getTableState().filterMenuSearch = inputElement.value;

  const { selectionEnd, selectionStart } = getGridFilterSearchSelection(inputElement);

  if (typeof refreshFilterMenu === "function" && refreshFilterMenu() === true) {
    return true;
  }

  await onStateChange();
  restoreGridFilterSearchFocus(selector, selectionStart, selectionEnd);
  return true;
}
