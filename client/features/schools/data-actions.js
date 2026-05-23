import { getJson } from "../../app/api-client.js";
import { showToast } from "../../app/toast.js";
import { toSchoolQueryString } from "./utils.js";

export function createSchoolDataActions({ appState, onStateChange }) {
  async function loadSchools(options = {}) {
    appState.schools.loading = true;

    try {
      const queryString = toSchoolQueryString({
        ...appState.schools.filters,
        limit: appState.schools.limit,
      });
      const payload = await getJson(`/api/schools${queryString ? `?${queryString}` : ""}`);

      appState.schools.items = payload.items || [];
      appState.schools.total = Number(payload.total) || 0;
      appState.schools.errorMessage = "";
    } catch (error) {
      appState.schools.items = [];
      appState.schools.total = 0;
      appState.schools.errorMessage = error.message;
      if (!options.silent) {
        showToast(appState.schools.errorMessage, { tone: "error" });
      }
    } finally {
      appState.schools.loading = false;

      if (!options.silent) {
        await onStateChange();
      }
    }
  }

  async function loadSchoolDetail(schoolId) {
    const normalizedSchoolId = String(schoolId || "").trim();

    if (!normalizedSchoolId) {
      appState.schools.detail = null;
      return null;
    }

    const school = await getJson(`/api/schools/${encodeURIComponent(normalizedSchoolId)}`);
    appState.schools.detail = school || null;
    appState.ui.activeSchoolId = String(school?.id || normalizedSchoolId);
    return school;
  }

  return Object.freeze({
    loadSchoolDetail,
    loadSchools,
  });
}
