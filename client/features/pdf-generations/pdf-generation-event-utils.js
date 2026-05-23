export function resolvePdfGenerationFilterMenuPosition(triggerElement) {
  if (!triggerElement || typeof window === "undefined") {
    return null;
  }

  const rect = triggerElement.getBoundingClientRect();
  const tableWrapRect = triggerElement.closest(".table-wrap")?.getBoundingClientRect();
  const viewportWidth = Number(window.innerWidth) || 0;
  const viewportHeight = Number(window.innerHeight) || 0;
  const menuWidth = Math.min(320, Math.max(0, viewportWidth - 24));
  const menuMaxHeight = Math.min(540, Math.max(0, viewportHeight - 24));
  const minimumLeft = Math.max(12, Number(tableWrapRect?.left || 0) || 12);
  const preferredLeft = rect.left + rect.width / 2 - menuWidth / 2;
  const left = Math.max(minimumLeft, Math.min(preferredLeft, Math.max(minimumLeft, viewportWidth - menuWidth - 12)));
  const preferredTop = rect.bottom + 8;
  const top = Math.max(12, Math.min(preferredTop, Math.max(12, viewportHeight - menuMaxHeight - 12)));

  return {
    left: Math.round(left),
    top: Math.round(top),
  };
}

export function isInteractiveGenerationTarget(target) {
  return Boolean(target.closest?.("a, button, input, label, select, textarea, [data-action]"));
}

export function openPdfGenerationPrintWindow(printUrl = "") {
  const normalizedPrintUrl = String(printUrl || "").trim();

  if (!normalizedPrintUrl || typeof window === "undefined") {
    return;
  }

  window.open(normalizedPrintUrl, "_blank", "noopener");
}

export function clearWindowTextSelection() {
  if (typeof window === "undefined" || typeof window.getSelection !== "function") {
    return;
  }

  window.getSelection()?.removeAllRanges();
}

export function restorePdfGenerationSearchFocus(selector, selectionStart = 0, selectionEnd = selectionStart) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  window.requestAnimationFrame(() => {
    const inputElement = document.querySelector(selector);

    if (!(inputElement instanceof HTMLInputElement)) {
      return;
    }

    inputElement.focus({ preventScroll: true });
    inputElement.setSelectionRange(selectionStart, selectionEnd);
  });
}
