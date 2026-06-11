import { appState } from "./app/app-state.js";
import { createAppRenderer } from "./app/app-renderer.js";
import { loadViewData } from "./app/bootstrap-loader.js";
import { dom } from "./app/dom-elements.js";
import { createModalCloseGuard, renderModalClosePrompt } from "./app/modal-close-guard.js";
import { registerAppModalGuards } from "./app/modal-guard-registrations.js";
import { attachNavigation } from "./app/navigation.js";
import { resetGridStateForRouteNavigation } from "./app/grid-state-reset.js";
import { clearProtectedState as clearProtectedAppState } from "./app/protected-state-reset.js";
import { getActiveSchoolRouteKey } from "./app/school-context.js";
import { attachGridCellTooltips } from "./app/grid-tooltip.js";
import { setupAccountActions } from "./features/accounts/actions.js";
import { setupAuthActions } from "./features/auth/actions.js";
import { setupCandidateActions } from "./features/candidates/actions.js";
import { setupDataDeletionActions } from "./features/data-deletion/actions.js";
import { setupPdfGenerationActions } from "./features/pdf-generations/actions.js";
import { setupSchoolSettingsActions } from "./features/school-settings/actions.js";
import { setupSchoolActions } from "./features/schools/actions.js";
import { setupTemplateEditorActions } from "./features/template-editor/actions.js";
import { attachTemplateEditorToolbarTooltips } from "./features/template-editor/toolbar-tooltip.js";
import { setupTemplateActions } from "./features/templates/actions.js";

const appConfig = window.ExamListAppConfig;
let modalCloseGuard = null;
let requestTemplateEditorNavigation = async (pathname, options = {}) => {
  await performNavigateToPath(pathname, options);
  return true;
};
let requestUnsavedTemplateEditorAction = async (action) => {
  await action?.();
  return true;
};
let pendingTemplateEditorAction = null;
let editorActions = null;

const renderApp = createAppRenderer({
  appState,
  dom,
  getEditorActions: () => editorActions,
  renderModalClosePrompt,
});
const clearProtectedState = () => clearProtectedAppState(appState);

function performNavigateToPath(pathname, options = {}) {
  if (options.replace) {
    history.replaceState({}, "", pathname);
  } else {
    history.pushState({}, "", pathname);
  }

  return navigateTo(appConfig.getRouteMatch(pathname));
}

function navigateToPath(pathname, options = {}) {
  return requestTemplateEditorNavigation(pathname, options);
}

function buildCanonicalSchoolPath(routeMatch) {
  const schoolCode = getActiveSchoolRouteKey(appState);

  if (!routeMatch?.params?.schoolId || !schoolCode || routeMatch.params.schoolId === schoolCode) {
    return "";
  }

  return appConfig.getViewRoutePath(routeMatch.view, {
    ...routeMatch.params,
    schoolId: schoolCode,
  });
}

function navigateToSchoolList(options = {}) {
  const schoolListPath = appConfig.getViewRoutePath("schoolManagement");

  if (window.location.pathname !== schoolListPath) {
    if (options.replace) {
      history.replaceState({}, "", schoolListPath);
    } else {
      history.pushState({}, "", schoolListPath);
    }
  }

  appState.route = appConfig.getRouteMatch(schoolListPath);
  appState.currentView = "schoolManagement";
}

function redirectToLogin(options = {}) {
  const loginPath = "/login";

  if (options.replace) {
    window.location.replace(loginPath);
    return;
  }

  window.location.assign(loginPath);
}

const templateActions = setupTemplateActions({
  appState,
  dom,
  navigateToPath,
  onStateChange: renderApp,
});

const schoolActions = setupSchoolActions({
  appState,
  navigateToPath,
  onStateChange: renderApp,
});

const accountActions = setupAccountActions({
  appState,
  onStateChange: renderApp,
});

const candidateActions = setupCandidateActions({
  appState,
  onStateChange: renderApp,
});

const generationActions = setupPdfGenerationActions({
  appState,
  navigateToPath,
  onStateChange: renderApp,
});

const schoolSettingsActions = setupSchoolSettingsActions({
  appState,
  onStateChange: renderApp,
});

const dataDeletionActions = setupDataDeletionActions({
  appState,
  candidateActions,
  generationActions,
  schoolActions,
  templatesActions: templateActions,
  onStateChange: renderApp,
});

editorActions = setupTemplateEditorActions({
  appState,
  navigateToPath,
  onStateChange: renderApp,
  requestUnsavedTemplateEditorAction: (...args) => requestUnsavedTemplateEditorAction(...args),
  templatesActions: templateActions,
});

const authActions = setupAuthActions({
  appState,
  clearProtectedState,
  navigateToDashboard: navigateToSchoolList,
  navigateToLogin: redirectToLogin,
  onStateChange: renderApp,
});

function syncTemplateEditorUnsavedState() {
  if (appState.currentView !== "templateEditor" || !appState.templateEditor.template) {
    return;
  }

  editorActions.syncTemplateEditorRuntimeToState?.();
}

function isSameTemplateEditorRoute(routeMatch) {
  if (appState.currentView !== "templateEditor" || routeMatch?.view !== "templateEditor") {
    return false;
  }

  const currentTemplateId = String(
    appState.route?.params?.templateId ||
      appState.templateEditor.template?.id ||
      appState.templateEditor.lastLoadedTemplateId ||
      "",
  );
  const nextTemplateId = String(routeMatch.params?.templateId || "");

  return Boolean(currentTemplateId && nextTemplateId && currentTemplateId === nextTemplateId);
}

function isTemplateEditorUnsaved() {
  return Boolean(
    appState.currentView === "templateEditor" &&
      appState.templateEditor.template &&
      appState.templateEditor.isDirty,
  );
}

function shouldGuardTemplateEditorNavigation(routeMatch) {
  syncTemplateEditorUnsavedState();

  return isTemplateEditorUnsaved() && !isSameTemplateEditorRoute(routeMatch);
}

function clearPendingTemplateEditorAction() {
  pendingTemplateEditorAction = null;
}

async function runPendingTemplateEditorAction() {
  const pendingAction = pendingTemplateEditorAction?.action;

  pendingTemplateEditorAction = null;
  await pendingAction?.();
}

async function discardTemplateEditorChangesAndRunPendingAction() {
  editorActions.discardTemplateEditorChanges?.();
  await runPendingTemplateEditorAction();
}

async function saveTemplateEditorChangesAndRunPendingAction() {
  await editorActions.saveTemplateLayout();

  if (isTemplateEditorUnsaved()) {
    return false;
  }

  await runPendingTemplateEditorAction();
  return true;
}

function restoreCurrentRoutePath() {
  const currentPath =
    appState.route?.path ||
    appConfig.getViewRoutePath(appState.currentView, {
      ...(appState.route?.params || {}),
    });

  if (currentPath && currentPath !== window.location.pathname) {
    history.pushState({}, "", currentPath);
  }
}

async function requestUnsavedTemplateEditorActionWithPrompt(action, options = {}) {
  syncTemplateEditorUnsavedState();

  if (!isTemplateEditorUnsaved()) {
    await action?.();
    return true;
  }

  pendingTemplateEditorAction = {
    action,
    options,
  };
  await modalCloseGuard.requestClose("template-editor-unsaved");
  return false;
}

function getPendingTemplateEditorPromptOptions() {
  const reason = pendingTemplateEditorAction?.options?.reason || "";

  if (reason === "page-switch") {
    return {
      message: "페이지를 전환하기 전에 저장하지 않은 변경사항이 있습니다.",
      saveLabel: "저장 후 전환",
      savingLabel: "저장 중...",
    };
  }

  if (reason === "navigation") {
    return {
      saveLabel: "저장 후 이동",
      savingLabel: "저장 중...",
    };
  }

  return {
    saveLabel: "저장 후 계속",
    savingLabel: "저장 중...",
  };
}

async function requestTemplateEditorNavigationWithPrompt(pathname, options = {}) {
  const routeMatch = appConfig.getRouteMatch(pathname);

  if (shouldGuardTemplateEditorNavigation(routeMatch)) {
    await requestUnsavedTemplateEditorActionWithPrompt(() => performNavigateToPath(pathname, options), {
      reason: "navigation",
    });
    return false;
  }

  await performNavigateToPath(pathname, options);
  return true;
}

async function handleBeforeRouteNavigation(routeMatch, options = {}) {
  if (!shouldGuardTemplateEditorNavigation(routeMatch)) {
    return true;
  }

  if (options.navigationType === "pop") {
    restoreCurrentRoutePath();
  }

  await requestUnsavedTemplateEditorActionWithPrompt(
    () => performNavigateToPath(options.nextPath || routeMatch?.path || "/schools"),
    { reason: "navigation" },
  );
  return false;
}

modalCloseGuard = createModalCloseGuard({
  appState,
  onStateChange: renderApp,
});
requestTemplateEditorNavigation = requestTemplateEditorNavigationWithPrompt;
requestUnsavedTemplateEditorAction = requestUnsavedTemplateEditorActionWithPrompt;
registerAppModalGuards({
  accountActions,
  appState,
  candidateActions,
  clearPendingTemplateEditorAction,
  dataDeletionActions,
  discardTemplateEditorChangesAndRunPendingAction,
  editorActions,
  generationActions,
  getPendingTemplateEditorPromptOptions,
  hasPendingTemplateEditorAction: () => Boolean(pendingTemplateEditorAction),
  isTemplateEditorUnsaved,
  modalCloseGuard,
  saveTemplateEditorChangesAndRunPendingAction,
  schoolActions,
  templateActions,
});
modalCloseGuard.attach();
attachGridCellTooltips();
attachTemplateEditorToolbarTooltips();

async function navigateTo(routeMatch) {
  const nextRoute = routeMatch || appConfig.getRouteMatch(window.location.pathname) || appConfig.getRouteMatch("/schools");
  const previousRoute = appState.route;

  resetGridStateForRouteNavigation(appState, previousRoute, nextRoute);

  appState.route = nextRoute;
  appState.currentView = nextRoute.view;

  if (nextRoute.params?.templateId) {
    appState.ui.activeTemplateId = nextRoute.params.templateId;
  }

  if (nextRoute.view === "accountManagement" || nextRoute.view === "schoolManagement") {
    appState.schools.detail = null;
    appState.ui.activeSchoolId = "";
    appState.ui.activeTemplateId = "";
  }

  await authActions.loadSession({ silent: true });

  if (appState.auth.enabled && !appState.auth.authenticated) {
    clearProtectedState();
    redirectToLogin({ replace: true });
    return;
  }

  try {
    await loadViewData({
      accountActions,
      candidatesActions: candidateActions,
      editorActions,
      generationActions,
      route: nextRoute,
      schoolActions,
      schoolSettingsActions,
      templatesActions: templateActions,
    });
  } catch (error) {
    if (error.statusCode === 401) {
      await authActions.loadSession({ silent: true });
      clearProtectedState();
      redirectToLogin({ replace: true });
      return;
    } else {
      throw error;
    }
  }

  const canonicalSchoolPath = buildCanonicalSchoolPath(nextRoute);

  if (canonicalSchoolPath && canonicalSchoolPath !== window.location.pathname) {
    history.replaceState({}, "", canonicalSchoolPath);
    appState.route = appConfig.getRouteMatch(canonicalSchoolPath) || appState.route;
  }

  await renderApp();
}

attachNavigation({
  getRouteParams: () => ({
    schoolId: getActiveSchoolRouteKey(appState),
    templateId: appState.ui.activeTemplateId || appState.route?.params?.templateId || "",
  }),
  onBeforeNavigate: handleBeforeRouteNavigation,
  onNavigate: navigateTo,
});

window.addEventListener("beforeunload", (event) => {
  syncTemplateEditorUnsavedState();

  if (!isTemplateEditorUnsaved()) {
    return;
  }

  event.preventDefault();
  event.returnValue = "";
});

navigateTo(appConfig.getRouteMatch(window.location.pathname) || appConfig.getRouteMatch("/schools"));
