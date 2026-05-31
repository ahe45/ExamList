import { getJson, patchJson, postJson } from "../../app/api-client.js";

function buildSchoolQuery(schoolId) {
  const normalizedSchoolId = String(schoolId || "").trim();

  return normalizedSchoolId ? `?schoolId=${encodeURIComponent(normalizedSchoolId)}` : "";
}

export function buildTemplateRequestPayload(template, { schoolId = "" } = {}) {
  return {
    description: template.description,
    generationUnit: template.generationUnit,
    id: template.id,
    layout: template.layout,
    name: template.name,
    orientation: template.orientation,
    paperPreset: template.paperPreset,
    schoolId: String(schoolId || template.schoolId || ""),
  };
}

export async function loadTemplateEditorPayload({ schoolId = "", templateId }) {
  const normalizedTemplateId = String(templateId || "").trim();

  if (!normalizedTemplateId) {
    throw new Error("템플릿 ID가 없습니다.");
  }

  const [template, dataTags] = await Promise.all([
    getJson(`/api/pdf-templates/${encodeURIComponent(normalizedTemplateId)}${buildSchoolQuery(schoolId)}`),
    getJson(`/api/pdf-data-tags${buildSchoolQuery(schoolId)}`),
  ]);

  return {
    dataTags,
    template,
  };
}

export function saveTemplateLayoutPayload({ schoolId = "", template }) {
  return patchJson(`/api/pdf-templates/${encodeURIComponent(template.id)}`, {
    description: template.description,
    generationUnit: template.generationUnit,
    layout: template.layout,
    name: template.name,
    orientation: template.orientation,
    paperPreset: template.paperPreset,
    schoolId: String(schoolId || template.schoolId || ""),
  });
}

export function loadTemplatePreviewPayload({ emptyValueData = {}, sampleData = {}, sampleLimit = 60, schoolId = "", template }) {
  return postJson("/api/pdf-preview/pdf", {
    emptyValueData: emptyValueData && typeof emptyValueData === "object" && !Array.isArray(emptyValueData) ? emptyValueData : {},
    previewMode: "template",
    renderActualCandidates: false,
    sampleData: sampleData && typeof sampleData === "object" && !Array.isArray(sampleData) ? sampleData : {},
    sampleLimit,
    schoolId: String(schoolId || template.schoolId || ""),
    template: buildTemplateRequestPayload(template, { schoolId }),
    templateId: template.id,
  });
}
