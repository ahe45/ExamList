import { hasAccess } from "./access.js";

let headerResizeObserver = null;
function syncHeaderHeight(header) {
  if (!header) return;
  const measure = () => {
    document.documentElement.style.setProperty("--app-header-height", Math.ceil(header.getBoundingClientRect().height) + "px");
  };
  measure();
  if (!headerResizeObserver && typeof ResizeObserver !== "undefined") {
    headerResizeObserver = new ResizeObserver(measure);
    headerResizeObserver.observe(header);
  }
}

export function syncViewShell({ currentView, dom, summary = null, activeSchoolId = "", activeTemplateId = "" }) {
  const isSchoolListView = currentView === "accountManagement" || currentView === "schoolManagement";
  const activeNavigationView =
    currentView === "pdfGenerationDetail"
        ? "pdfGenerationHistory"
        : currentView === "templateEditor"
          ? "templateManagement"
        : currentView;
  const hasActiveSchool = Boolean(String(activeSchoolId || "").trim());
  const hasActiveTemplate = Boolean(String(activeTemplateId || "").trim());

  document.documentElement.dataset.shellMode = isSchoolListView ? "template-list" : "workspace";
  document.documentElement.dataset.currentView = currentView || "";
  document.documentElement.dataset.shellFocusMode = "default";
  dom.appShell?.classList.toggle("template-list-mode", isSchoolListView);
  dom.appShell?.classList.toggle("workspace-mode", !isSchoolListView);
  dom.appShell?.classList.toggle("editor-focus-mode", false);
  dom.workspaceNav?.classList.toggle("hidden", isSchoolListView);
  dom.workspaceNav?.setAttribute("aria-hidden", isSchoolListView ? "true" : "false");

  document.querySelectorAll("[data-go-view]").forEach((button) => {
    const isActive = button.dataset.goView === activeNavigationView;
    button.classList.toggle("active", isActive);
    if (isActive) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  document.querySelectorAll("[data-required-permission]").forEach((element) => {
    const permissionKey = element.dataset.requiredPermission || "";
    element.classList.toggle("hidden", permissionKey ? !hasAccess(summary, permissionKey) : false);
  });

  document.querySelectorAll("[data-template-required]").forEach((element) => {
    const isDisabled = !hasActiveTemplate;

    if ("disabled" in element) {
      element.disabled = isDisabled;
    }

    element.classList.toggle("disabled", isDisabled);
    element.setAttribute("aria-disabled", isDisabled ? "true" : "false");
  });

  document.querySelectorAll("[data-school-required]").forEach((element) => {
    const isDisabled = !hasActiveSchool;

    if ("disabled" in element) {
      element.disabled = isDisabled;
    }

    element.classList.toggle("disabled", isDisabled);
    element.setAttribute("aria-disabled", isDisabled ? "true" : "false");
  });

  syncHeaderHeight(dom.topbar);

  Object.entries(dom.panelsByView).forEach(([view, element]) => {
    element.classList.toggle("hidden", view !== currentView);
  });
}
