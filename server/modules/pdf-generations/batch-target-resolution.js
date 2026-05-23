const {
  getGenerationTargetStrategy,
  normalizeTargetNames,
  resolveGenerationTargets,
} = require("./targets");
const { getTemplateGenerationUnitFields } = require("./generation-unit-fields");
const { resolveGenerationCandidateSort } = require("./candidate-sort");
const { normalizeGenerationRequestFilters } = require("./filters");

function createPdfGenerationBatchTargetResolver({
  candidateService,
  createHttpError,
  pdfPreviewService,
}) {
  async function listPdfGenerationTargets(request = {}) {
    const resolvedTemplate = request.templateId
      ? await pdfPreviewService.resolvePreviewTemplate({
          generationUnit: request.generationUnit,
          schoolId: request.schoolId,
          templateId: request.templateId,
        })
      : null;
    const schoolId = String(request.schoolId || resolvedTemplate?.schoolId || "").trim();
    const generationUnit = String(request.generationUnit || resolvedTemplate?.generationUnit || "").trim();
    const generationUnitFields = getTemplateGenerationUnitFields(resolvedTemplate, []);
    const targetPayload = await resolveGenerationTargets({
      candidateService,
      createHttpError,
      filters: {
        ...(request.filters && typeof request.filters === "object" ? request.filters : {}),
        schoolId,
      },
      generationUnit,
      generationUnitFields,
    });

    return {
      generationUnit: targetPayload.generationUnit,
      items: targetPayload.items,
      label: targetPayload.label,
      total: targetPayload.items.length,
    };
  }

  async function resolvePdfGenerationBatchTemplate(request = {}) {
    const resolvedTemplate = await pdfPreviewService.resolvePreviewTemplate({
      generationUnit: request.generationUnit,
      schoolId: request.schoolId,
      template: request.template,
      templateId: request.templateId,
    });
    const schoolId = String(request.schoolId || resolvedTemplate.schoolId || "school-default").trim() || "school-default";
    const generationUnit = String(request.generationUnit || resolvedTemplate?.generationUnit || "").trim();
    const generationUnitFields = getTemplateGenerationUnitFields(resolvedTemplate, []);
    const strategy = getGenerationTargetStrategy(generationUnit, generationUnitFields);

    return Object.freeze({
      generationUnit,
      generationUnitFields,
      resolvedTemplate,
      schoolId,
      strategy,
      templateRequest: {
        ...request,
        candidateSort: resolveGenerationCandidateSort({ request, template: resolvedTemplate }),
        schoolId,
        template: request.template || resolvedTemplate,
        templateId: request.templateId || resolvedTemplate.id,
      },
    });
  }

  async function resolvePdfGenerationBatchTargets({ generationUnit, generationUnitFields = [], request = {}, schoolId }) {
    const requestedTargets = normalizeTargetNames(request.targets);

    if (requestedTargets.length > 0) {
      let countMap = new Map();

      if (candidateService && typeof candidateService.findCandidateGroups === "function") {
        const targetPayload = await resolveGenerationTargets({
          candidateService,
          createHttpError,
          filters: {
            ...(request.filters && typeof request.filters === "object" ? request.filters : {}),
            schoolId,
          },
          generationUnit,
          generationUnitFields,
        });

        countMap = new Map(
          targetPayload.items.map((item) => [String(item.name || "").trim(), Number(item.candidateCount) || 0]),
        );
      }

      return {
        items: requestedTargets.map((name) => ({
          candidateCount: countMap.get(name) || 0,
          name,
        })),
      };
    }

    return resolveGenerationTargets({
      candidateService,
      createHttpError,
      filters: {
        ...(request.filters && typeof request.filters === "object" ? request.filters : {}),
        schoolId,
      },
      generationUnit,
      generationUnitFields,
    });
  }

  return Object.freeze({
    listPdfGenerationTargets,
    resolvePdfGenerationBatchTargets,
    resolvePdfGenerationBatchTemplate,
  });
}

function buildPdfGenerationTargetFilters(request = {}, strategy, targetName, targetFilters = null) {
  const normalizedTargetFilters = normalizeGenerationRequestFilters(targetFilters);
  const hasTargetFilters = Object.keys(normalizedTargetFilters).length > 0;

  return {
    ...(request.filters && typeof request.filters === "object" ? request.filters : {}),
    ...(hasTargetFilters ? normalizedTargetFilters : { [strategy.filterKey]: targetName }),
  };
}

module.exports = {
  buildPdfGenerationTargetFilters,
  createPdfGenerationBatchTargetResolver,
};
