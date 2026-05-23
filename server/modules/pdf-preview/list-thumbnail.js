const { renderTemplateContentThumbnail } = require("./thumbnail");

async function resolveThumbnailSchoolSettings(schoolSettingsService, schoolId = "") {
  if (!schoolSettingsService || typeof schoolSettingsService.getSchoolSettings !== "function") {
    return {};
  }

  return schoolSettingsService.getSchoolSettings(String(schoolId || ""));
}

function createTemplateListThumbnailRenderer({ schoolSettingsService }) {
  return async function renderTemplateListPreviewThumbnail(template) {
    const schoolSettings = await resolveThumbnailSchoolSettings(schoolSettingsService, template?.schoolId);

    return renderTemplateContentThumbnail(template, {
      generatedAt: new Date(),
      schoolSettings,
    });
  };
}

module.exports = {
  createTemplateListThumbnailRenderer,
};
