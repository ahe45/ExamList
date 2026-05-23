function normalizeText(value = "") {
  return String(value || "").trim();
}

export function getActiveSchoolId(appState) {
  return normalizeText(appState?.schools?.detail?.id || appState?.ui?.activeSchoolId || "");
}

export function getActiveSchoolRouteKey(appState) {
  return normalizeText(appState?.schools?.detail?.code || appState?.route?.params?.schoolId || appState?.ui?.activeSchoolId || "");
}
