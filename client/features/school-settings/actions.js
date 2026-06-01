import { getJson } from "../../app/api-client.js";
import { getActiveSchoolId } from "../../app/school-context.js";
import { showToast } from "../../app/toast.js";

export function setupSchoolSettingsActions({ appState, onStateChange }) {
  function getCurrentSchoolId() {
    return getActiveSchoolId(appState);
  }

  async function loadSchoolSettings({ render = true } = {}) {
    try {
      const schoolId = getCurrentSchoolId();
      const settings = await getJson(`/api/school-settings${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ""}`);

      appState.schoolSettings.academicYear = String(settings.academicYear || "");
      appState.schoolSettings.campusCode = String(settings.campusCode || "");
      appState.schoolSettings.campusName = String(settings.campusName || "");
      appState.schoolSettings.schoolId = String(settings.schoolId || schoolId);
      appState.schoolSettings.schoolName = String(settings.schoolName || "");
      appState.schoolSettings.logoDataUrl = String(settings.logoDataUrl || "");
      appState.schoolSettings.errorMessage = "";
      appState.schoolSettings.isDirty = false;
    } catch (error) {
      appState.schoolSettings.errorMessage = error.message || "학교 설정을 불러오지 못했습니다.";
      showToast(appState.schoolSettings.errorMessage, { tone: "error" });
    }

    if (render) {
      await onStateChange();
    }
  }

  return {
    loadSchoolSettings,
  };
}
