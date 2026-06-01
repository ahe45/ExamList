let tooltipElement = null;
let activeTarget = null;
let isAttached = false;

const storedTitleAttribute = "data-template-editor-toolbar-tooltip-title";
const tooltipTargetSelector = [
  "#templateEditorToolbarHost button",
  "#templateEditorToolbarHost input",
  "#templateEditorToolbarHost select",
  "#templateEditorToolbarHost [role='button']",
  "#templateEditorToolbarHost [title]",
  "[data-template-editor-runtime-toolbar] button",
  "[data-template-editor-runtime-toolbar] input",
  "[data-template-editor-runtime-toolbar] select",
  "[data-template-editor-runtime-toolbar] [role='button']",
  "[data-template-editor-runtime-toolbar] [title]",
].join(", ");

function getTooltipElement() {
  if (tooltipElement) {
    return tooltipElement;
  }

  tooltipElement = document.createElement("div");
  tooltipElement.className = "template-editor-toolbar-tooltip hidden";
  tooltipElement.setAttribute("role", "tooltip");
  document.body.appendChild(tooltipElement);
  return tooltipElement;
}

function clampNumber(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function positionTooltip(target, tooltip) {
  const targetRect = target.getBoundingClientRect();

  tooltip.style.left = "0px";
  tooltip.style.top = "0px";
  tooltip.classList.remove("hidden");

  const tooltipRect = tooltip.getBoundingClientRect();
  const gap = 8;
  const viewportPadding = 10;
  const left = clampNumber(
    targetRect.left + targetRect.width / 2 - tooltipRect.width / 2,
    viewportPadding,
    Math.max(viewportPadding, window.innerWidth - tooltipRect.width - viewportPadding),
  );
  const preferredTop = targetRect.top - tooltipRect.height - gap;
  const top =
    preferredTop >= viewportPadding
      ? preferredTop
      : Math.min(
          Math.max(viewportPadding, targetRect.bottom + gap),
          Math.max(viewportPadding, window.innerHeight - tooltipRect.height - viewportPadding),
        );

  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

export function getTemplateEditorToolbarTooltipText(target) {
  if (!target) {
    return "";
  }

  return String(
    target.getAttribute?.(storedTitleAttribute) ||
      target.getAttribute?.("data-tooltip") ||
      target.getAttribute?.("title") ||
      target.getAttribute?.("aria-label") ||
      "",
  ).trim();
}

function getTooltipTarget(eventTarget) {
  const target = eventTarget?.closest?.(tooltipTargetSelector) || null;

  if (!target || target.matches?.("input[type='hidden']")) {
    return null;
  }

  return getTemplateEditorToolbarTooltipText(target) ? target : null;
}

function suspendNativeTitle(target) {
  const title = String(target.getAttribute?.("title") || "").trim();

  if (!title || target.hasAttribute?.(storedTitleAttribute)) {
    return;
  }

  target.setAttribute(storedTitleAttribute, title);
  target.removeAttribute("title");
}

function restoreNativeTitle(target) {
  if (!target?.hasAttribute?.(storedTitleAttribute)) {
    return;
  }

  const title = target.getAttribute(storedTitleAttribute);

  target.removeAttribute(storedTitleAttribute);
  if (title) {
    target.setAttribute("title", title);
  }
}

function containsRelatedTarget(target, relatedTarget) {
  return Boolean(relatedTarget?.nodeType && target?.contains?.(relatedTarget));
}

function hideTooltip() {
  if (activeTarget) {
    restoreNativeTitle(activeTarget);
  }

  if (tooltipElement) {
    tooltipElement.classList.add("hidden");
    tooltipElement.textContent = "";
  }

  activeTarget = null;
}

function showTooltipFor(target) {
  const text = getTemplateEditorToolbarTooltipText(target);

  if (!text) {
    hideTooltip();
    return;
  }

  if (activeTarget && activeTarget !== target) {
    restoreNativeTitle(activeTarget);
  }

  activeTarget = target;
  suspendNativeTitle(target);

  const tooltip = getTooltipElement();

  tooltip.textContent = text;
  positionTooltip(target, tooltip);
}

export function attachTemplateEditorToolbarTooltips() {
  if (isAttached || typeof document === "undefined") {
    return;
  }

  isAttached = true;

  document.addEventListener("pointerover", (event) => {
    const target = getTooltipTarget(event.target);

    if (!target || target === activeTarget) {
      return;
    }

    showTooltipFor(target);
  });

  document.addEventListener("pointerout", (event) => {
    if (!activeTarget || containsRelatedTarget(activeTarget, event.relatedTarget)) {
      return;
    }

    hideTooltip();
  });

  document.addEventListener("focusin", (event) => {
    const target = getTooltipTarget(event.target);

    if (target) {
      showTooltipFor(target);
    }
  });

  document.addEventListener("focusout", (event) => {
    if (!activeTarget || containsRelatedTarget(activeTarget, event.relatedTarget)) {
      return;
    }

    hideTooltip();
  });

  document.addEventListener("pointerdown", hideTooltip);
  document.addEventListener("scroll", hideTooltip, true);
  window.addEventListener("resize", hideTooltip);
}
