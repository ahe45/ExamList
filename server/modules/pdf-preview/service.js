const { normalizeTemplateLayout } = require("../pdf-templates/layout");
const { resolveGenerationCandidateSort } = require("../pdf-generations/candidate-sort");
const {
  getGenerationUnitFieldLabel,
  getTemplateGenerationUnitFields,
  normalizeGenerationUnitFieldKey,
} = require("../pdf-generations/generation-unit-fields");
const { renderPreviewDocument } = require("./renderer");
const { buildPreviewSampleCandidates, previewSampleCandidateCount } = require("./sample-candidates");

const generationUnitConfig = Object.freeze({
  admission: Object.freeze({ field: "admissionCode", label: "전형코드" }),
  admissionCode: Object.freeze({ field: "admissionCode", label: "전형코드" }),
  buildingCode: Object.freeze({ field: "buildingCode", label: "고사건물코드" }),
  exam: Object.freeze({ field: "examDate", label: "시험날짜" }),
  examDate: Object.freeze({ field: "examDate", label: "시험날짜" }),
  group: Object.freeze({ field: "groupName", label: "조" }),
  periodCode: Object.freeze({ field: "periodCode", label: "교시코드" }),
  room: Object.freeze({ field: "roomCode", label: "고사실코드" }),
  roomCode: Object.freeze({ field: "roomCode", label: "고사실코드" }),
  seriesCode: Object.freeze({ field: "seriesCode", label: "계열코드" }),
  unit: Object.freeze({ field: "unitCode", label: "모집단위코드" }),
  unitCode: Object.freeze({ field: "unitCode", label: "모집단위코드" }),
});

function normalizeSampleLimit(value, fallback = 60, minimum = 1, maximum = 5000) {
  const parsedValue = Math.round(Number(value));

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, minimum), maximum);
}

function normalizeSamplePage(value, fallback = 1) {
  const parsedValue = Math.round(Number(value));

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, 1), 10000);
}

function normalizePreviewDataTagValues(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((sampleData, [key, sampleValue]) => {
    const normalizedKey = String(key || "").trim();

    if (!normalizedKey) {
      return sampleData;
    }

    sampleData[normalizedKey] = String(sampleValue ?? "").slice(0, 2000);
    return sampleData;
  }, {});
}

function normalizePreviewSampleData(value = {}) {
  return normalizePreviewDataTagValues(value);
}

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source || {}, key);
}

function hasDataTagValues(value = {}) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length);
}

function extractTemplateMetadata(template = {}, fallback = {}) {
  return {
    description: String(template.description ?? fallback.description ?? ""),
    generationUnit: String(template.generationUnit ?? fallback.generationUnit ?? "roomCode"),
    name: String(template.name ?? fallback.name ?? "미리보기 템플릿"),
    orientation: String(template.orientation ?? fallback.orientation ?? "portrait"),
    paperPreset: String(template.paperPreset ?? fallback.paperPreset ?? "A4"),
  };
}

function hasPhotoElement(layout) {
  const pages = Array.isArray(layout?.pages) ? layout.pages : [];

  return pages.some((page) =>
    (Array.isArray(page.elements) ? page.elements : []).some(
      (element) => {
        if (element.type === "candidatePhoto") {
          return true;
        }

        return (
          element.type === "table" &&
          Array.isArray(element.config?.columns) &&
          element.config.columns.some((column) => column.type === "photo")
        );
      },
    ) ||
    /(?:{{\s*|\bdata-template-tag-value=["'])candidate\.(?:photo|photoUrl|photoFileId)\b/i.test(
      String(page?.settings?.documentHtml || ""),
    ) ||
    /(?:{{\s*|\bdata-template-tag-value=["'])candidate\.(?:photo|photoUrl|photoFileId)\b/i.test(
      String(page?.settings?.candidateBlockGrid?.blockTemplateHtml || ""),
    ),
  );
}

function getCandidateGenerationUnitFieldValue(candidate = {}, field = "") {
  const normalizedField = normalizeGenerationUnitFieldKey(field);
  const fieldAliases = {
    date: ["date", "examDate"],
    group: ["group", "groupName"],
    period: ["period", "periodName"],
    room: ["room", "roomName"],
    time: ["time", "examStartTime"],
    endTime: ["endTime", "examEndTime"],
    unit: ["unit", "departmentName"],
  }[normalizedField] || [normalizedField];

  for (const alias of fieldAliases) {
    const value = String(candidate?.[alias] ?? "").trim();

    if (value) {
      return value;
    }
  }

  return "";
}

function selectPreviewCandidates(candidates, generationUnit, generationUnitFields = []) {
  const customFields = getTemplateGenerationUnitFields({ layout: { generation: { unitFields: generationUnitFields } } }, []);

  if (customFields.length && Array.isArray(candidates) && candidates.length > 1) {
    const firstCandidate = candidates[0] || {};
    const targetValues = customFields.map((field) => getCandidateGenerationUnitFieldValue(firstCandidate, field));

    if (targetValues.every(Boolean)) {
      const filteredCandidates = candidates.filter((candidate) =>
        customFields.every((field, index) => getCandidateGenerationUnitFieldValue(candidate, field) === targetValues[index]),
      );

      return {
        candidates: filteredCandidates.length ? filteredCandidates : candidates,
        selectedGroupLabel: customFields
          .map((field, index) => `${getGenerationUnitFieldLabel(field)} ${targetValues[index]}`)
          .join(" / "),
        trimmed: filteredCandidates.length > 0 && filteredCandidates.length < candidates.length,
      };
    }
  }

  const config = generationUnitConfig[generationUnit];

  if (!config || !Array.isArray(candidates) || candidates.length <= 1) {
    return {
      candidates: Array.isArray(candidates) ? candidates : [],
      selectedGroupLabel: "",
      trimmed: false,
    };
  }

  const firstCandidate = candidates[0] || {};
  const groupValue = String(firstCandidate[config.field] || "").trim();

  if (!groupValue) {
    return {
      candidates,
      selectedGroupLabel: "",
      trimmed: false,
    };
  }

  const filteredCandidates = candidates.filter(
    (candidate) => String(candidate?.[config.field] || "").trim() === groupValue,
  );

  return {
    candidates: filteredCandidates.length ? filteredCandidates : candidates,
    selectedGroupLabel: `${config.label} ${groupValue}`,
    trimmed: filteredCandidates.length > 0 && filteredCandidates.length < candidates.length,
  };
}

function shouldRenderActualCandidates(previewRequest = {}) {
  return (
    previewRequest.renderActualCandidates === true ||
    String(previewRequest.previewMode || "").trim() === "generation"
  );
}

function buildPreviewWarnings({ candidates, generationUnit, layout, selectedGroupLabel, trimmed, usesActualCandidates = false }) {
  const warnings = [];

  if (!Array.isArray(candidates) || !candidates.length) {
    warnings.push("실제 수험생 데이터가 없어 샘플 데이터로 미리보기를 표시합니다.");
    return warnings;
  }

  if (trimmed && selectedGroupLabel) {
    warnings.push(`미리보기는 첫 ${selectedGroupLabel} 기준 데이터만 표시합니다.`);
  }

  if (hasPhotoElement(layout) && candidates.some((candidate) => !String(candidate.photoUrl || "").trim())) {
    warnings.push("사진 데이터가 없어 사진 요소는 플레이스홀더로 표시됩니다.");
  }

  if (!usesActualCandidates && (generationUnit === "custom" || generationUnit === "all")) {
    warnings.push("현재 미리보기는 샘플 수험생 목록 기준으로만 구성됩니다.");
  }

  return warnings;
}

function createPdfPreviewService({ candidateService, createHttpError, pdfTemplateService, schoolSettingsService = null }) {
  async function resolvePreviewTemplate(previewRequest = {}) {
    const rawTemplate =
      previewRequest.template && typeof previewRequest.template === "object" ? previewRequest.template : null;
    const templateId = String(previewRequest.templateId || rawTemplate?.id || "").trim();
    let fallbackTemplate = null;

    if (
      templateId &&
      (!rawTemplate?.layout ||
        !rawTemplate?.name ||
        !rawTemplate?.paperPreset ||
        !rawTemplate?.orientation ||
        !rawTemplate?.generationUnit)
    ) {
      fallbackTemplate = await pdfTemplateService.getTemplateById(templateId, {
        schoolId: previewRequest.schoolId || "",
      });
    }

    if (rawTemplate?.layout) {
      const metadata = extractTemplateMetadata(rawTemplate, fallbackTemplate || {});

      return {
        description: metadata.description,
        generationUnit: metadata.generationUnit,
        id: String(rawTemplate.id || templateId || fallbackTemplate?.id || ""),
        layout: normalizeTemplateLayout(
          rawTemplate.layout,
          metadata,
          String(rawTemplate.id || templateId || fallbackTemplate?.id || ""),
        ),
        name: metadata.name,
        orientation: metadata.orientation,
        paperPreset: metadata.paperPreset,
        schoolId: String(rawTemplate.schoolId || fallbackTemplate?.schoolId || previewRequest.schoolId || ""),
      };
    }

    if (fallbackTemplate) {
      return fallbackTemplate;
    }

    throw createHttpError(400, "미리보기용 템플릿 정보가 없습니다.", "PREVIEW_TEMPLATE_REQUIRED");
  }

  async function resolvePreviewPayload(previewRequest = {}) {
    const template = await resolvePreviewTemplate(previewRequest);
    const schoolId = String(previewRequest.schoolId || template.schoolId || "").trim();
    const schoolSettings =
      schoolSettingsService && typeof schoolSettingsService.getSchoolSettings === "function"
        ? await schoolSettingsService.getSchoolSettings(schoolId)
        : {};
    const sampleLimit = normalizeSampleLimit(previewRequest.sampleLimit);
    const samplePage = normalizeSamplePage(previewRequest.candidatePage || previewRequest.page);
    const layoutDataTagSettings =
      template.layout?.dataTagSettings && typeof template.layout.dataTagSettings === "object"
        ? template.layout.dataTagSettings
        : {};
    const rawSampleData = hasOwn(previewRequest, "sampleData") && hasDataTagValues(previewRequest.sampleData)
      ? previewRequest.sampleData
      : layoutDataTagSettings.sampleData;
    const sampleData = normalizePreviewSampleData(rawSampleData);
    const rawEmptyValueData = hasOwn(previewRequest, "emptyValueData")
      ? previewRequest.emptyValueData
      : hasDataTagValues(layoutDataTagSettings.emptyValueData)
        ? layoutDataTagSettings.emptyValueData
        : sampleData;
    const emptyValueData = normalizePreviewDataTagValues(rawEmptyValueData);
    const candidateSort =
      previewRequest.candidateSort && typeof previewRequest.candidateSort === "object" && !Array.isArray(previewRequest.candidateSort)
        ? previewRequest.candidateSort
        : resolveGenerationCandidateSort({ template });
    const candidatePayload = await candidateService.findCandidates({
      ...(previewRequest.filters && typeof previewRequest.filters === "object" ? previewRequest.filters : {}),
      limit: sampleLimit,
      page: samplePage,
      schoolId,
      sortDirection: candidateSort.sortDirection,
      sortKey: candidateSort.sortKey,
    });
    const sampledCandidates = Array.isArray(candidatePayload?.items) ? candidatePayload.items : [];
    const selectedCandidates = selectPreviewCandidates(
      sampledCandidates,
      template.generationUnit,
      getTemplateGenerationUnitFields(template, []),
    );
    const hydratedCandidates =
      hasPhotoElement(template.layout) && typeof candidateService.hydrateCandidatesWithPhotos === "function"
      ? await candidateService.hydrateCandidatesWithPhotos(selectedCandidates.candidates)
      : selectedCandidates.candidates;
    const generatedAt = previewRequest.generatedAt ? new Date(previewRequest.generatedAt) : new Date();
    const warnings = buildPreviewWarnings({
      candidates: hydratedCandidates,
      generationUnit: template.generationUnit,
      layout: template.layout,
      selectedGroupLabel: selectedCandidates.selectedGroupLabel,
      trimmed: selectedCandidates.trimmed,
      usesActualCandidates: shouldRenderActualCandidates(previewRequest),
    });

    return {
      candidates: hydratedCandidates,
      emptyValueData,
      generatedAt,
      sampleData,
      schoolSettings,
      template,
      warnings,
    };
  }

  async function previewTemplate(previewRequest = {}) {
    const previewPayload = await resolvePreviewPayload(previewRequest);
    const renderActualCandidates = shouldRenderActualCandidates(previewRequest);
    const renderCandidates = renderActualCandidates
      ? previewPayload.candidates
      : buildPreviewSampleCandidates(previewPayload.sampleData, previewSampleCandidateCount);

    if (renderActualCandidates && !renderCandidates.length) {
      throw createHttpError(400, "미리보기할 수험생 데이터가 없습니다.", "PREVIEW_CANDIDATES_REQUIRED");
    }

    const preview = renderPreviewDocument({
      candidates: renderCandidates,
      emptyValueData: previewPayload.emptyValueData,
      generatedAt: previewPayload.generatedAt,
      sampleData: renderActualCandidates ? {} : previewPayload.sampleData,
      schoolSettings: previewPayload.schoolSettings,
      template: previewPayload.template,
    });

    return {
      candidateCount: renderCandidates.length,
      pageCount: preview.pageCount,
      previewHtml: preview.html,
      templateId: String(previewPayload.template.id || ""),
      templateName: previewPayload.template.name,
      warnings: previewPayload.warnings,
    };
  }

  return Object.freeze({
    previewTemplate,
    resolvePreviewTemplate,
    resolvePreviewPayload,
  });
}

module.exports = {
  buildPreviewWarnings,
  buildPreviewSampleCandidates,
  createPdfPreviewService,
  extractTemplateMetadata,
  normalizePreviewSampleData,
  normalizePreviewDataTagValues,
  selectPreviewCandidates,
};
