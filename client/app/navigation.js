const appConfig = window.ExamListAppConfig;

export function attachNavigation({ getRouteParams, onBeforeNavigate, onNavigate }) {
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-go-view]");

    if (!button) {
      return;
    }

    const nextView = button.dataset.goView;

    if (!nextView) {
      return;
    }

    event.preventDefault();
    const routeParams = typeof getRouteParams === "function" ? getRouteParams(nextView, button) : {};
    const nextPath = appConfig.getViewRoutePath(nextView, {
      ...routeParams,
      generationId: button.dataset.generationId || routeParams.generationId || "",
      schoolId: button.dataset.schoolId || routeParams.schoolId || "",
      templateId: button.dataset.templateId || routeParams.templateId || "",
    });
    const routeMatch = appConfig.getRouteMatch(nextPath);
    const canNavigate =
      typeof onBeforeNavigate === "function"
        ? await onBeforeNavigate(routeMatch, { navigationType: "push", nextPath })
        : true;

    if (canNavigate === false) {
      return;
    }

    history.pushState({}, "", nextPath);
    await onNavigate(routeMatch);
  });

  window.addEventListener("popstate", async () => {
    const nextPath = window.location.pathname;
    const routeMatch = appConfig.getRouteMatch(nextPath);
    const canNavigate =
      typeof onBeforeNavigate === "function"
        ? await onBeforeNavigate(routeMatch, { navigationType: "pop", nextPath })
        : true;

    if (canNavigate === false) {
      return;
    }

    await onNavigate(routeMatch);
  });
}
