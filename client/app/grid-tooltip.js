let tooltipElement = null;
let activeTarget = null;

function getTooltipElement() {
  if (tooltipElement) {
    return tooltipElement;
  }

  tooltipElement = document.createElement("div");
  tooltipElement.className = "table-cell-tooltip hidden";
  tooltipElement.setAttribute("role", "tooltip");
  document.body.appendChild(tooltipElement);
  return tooltipElement;
}

function isElementOverflowing(element) {
  return element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1;
}

function getTooltipText(element) {
  return String(element.dataset.gridTooltip || element.textContent || "").trim();
}

function positionTooltip(target, tooltip) {
  const targetRect = target.getBoundingClientRect();

  tooltip.style.left = "0px";
  tooltip.style.top = "0px";
  tooltip.classList.remove("hidden");

  const tooltipRect = tooltip.getBoundingClientRect();
  const gap = 6;
  const viewportPadding = 12;
  const left = Math.min(
    Math.max(viewportPadding, targetRect.left),
    Math.max(viewportPadding, window.innerWidth - tooltipRect.width - viewportPadding),
  );
  const preferredTop = targetRect.bottom + gap;
  const top =
    preferredTop + tooltipRect.height + viewportPadding <= window.innerHeight
      ? preferredTop
      : Math.max(viewportPadding, targetRect.top - tooltipRect.height - gap);

  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

function hideTooltip() {
  if (tooltipElement) {
    tooltipElement.classList.add("hidden");
    tooltipElement.textContent = "";
  }

  activeTarget = null;
}

function showTooltipFor(target) {
  const text = getTooltipText(target);

  if (!text || text === "-" || !isElementOverflowing(target)) {
    hideTooltip();
    return;
  }

  const tooltip = getTooltipElement();

  activeTarget = target;
  tooltip.textContent = text;
  positionTooltip(target, tooltip);
}

export function attachGridCellTooltips() {
  document.addEventListener("pointerover", (event) => {
    const target = event.target.closest?.("[data-grid-cell-tooltip]");

    if (!target || target === activeTarget) {
      return;
    }

    showTooltipFor(target);
  });

  document.addEventListener("pointerout", (event) => {
    if (!activeTarget || activeTarget.contains(event.relatedTarget)) {
      return;
    }

    hideTooltip();
  });

  document.addEventListener("focusin", (event) => {
    const target = event.target.closest?.("[data-grid-cell-tooltip]");

    if (target) {
      showTooltipFor(target);
    }
  });

  document.addEventListener("focusout", () => {
    hideTooltip();
  });

  document.addEventListener("scroll", hideTooltip, true);
  window.addEventListener("resize", hideTooltip);
}
