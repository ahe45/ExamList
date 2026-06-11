const { exactRoute, regexRoute } = require("../router");
const { createPermissionGuard, decodeRouteParams, readGenerationTargetFilters } = require("../route-helpers");

function createPdfGenerationRoutes(deps) {
  const withPermission = createPermissionGuard(deps);
  const getUniqueGenerationIds = (generationIds = []) =>
    Array.from(new Set((Array.isArray(generationIds) ? generationIds : [generationIds])
      .map((generationId) => String(generationId || "").trim())
      .filter(Boolean)));

  async function assertGenerationWriteAccess(generationId, request) {
    const generation = await deps.getPdfGenerationDetail(generationId);

    await deps.assertSchoolWriteAccess(generation?.schoolId || "", request);
    return generation;
  }

  async function assertBatchWriteAccess(batchId, request) {
    const batch = await deps.getPdfGenerationBatch(batchId);

    await deps.assertSchoolWriteAccess(batch?.schoolId || "", request);
    return batch;
  }

  async function assertGenerationRequestWriteAccess(body = {}, request) {
    const schoolId = String(body?.schoolId || "").trim();

    if (schoolId) {
      await deps.assertSchoolWriteAccess(schoolId, request);
    }

    const generationIds = getUniqueGenerationIds(body?.generationIds || body?.generationId);

    if (generationIds.length) {
      const schoolIds = new Set();

      for (const generationId of generationIds) {
        const generation = await deps.getPdfGenerationDetail(generationId);
        const generationSchoolId = String(generation?.schoolId || "").trim();

        if (generationSchoolId) {
          schoolIds.add(generationSchoolId);
        }
      }

      for (const generationSchoolId of schoolIds) {
        await deps.assertSchoolWriteAccess(generationSchoolId, request);
      }
      return;
    }

    if (body?.batchId) {
      await assertBatchWriteAccess(body.batchId, request);
      return;
    }

    if (schoolId) {
      return;
    }

    await deps.assertSchoolWriteAccess("", request);
  }

  return [
    exactRoute("GET", "/api/pdf-generations/targets", withPermission("generatePdfs", async ({ request, response, searchParams }) => {
      await deps.assertSchoolWriteAccess(searchParams.get("schoolId") || "", request);
      deps.sendJson(
        response,
        200,
        await deps.listPdfGenerationTargets({
          filters: readGenerationTargetFilters(searchParams),
          generationUnit: searchParams.get("generationUnit") || "",
          schoolId: searchParams.get("schoolId") || "",
          templateId: searchParams.get("templateId") || "",
        }),
      );
    })),
    exactRoute("POST", "/api/pdf-generations/preview", withPermission("generatePdfs", async ({ request, response }) => {
      deps.assertPermission("previewTemplates", request);
      const body = await deps.readJsonBody(request);

      await deps.assertSchoolWriteAccess(body?.schoolId || body?.template?.schoolId || "", request);
      deps.sendJson(response, 201, await deps.createPdfGenerationPreview(body));
    })),
    exactRoute("GET", "/api/pdf-generations", withPermission("viewGenerations", async ({ response, searchParams }) => {
      deps.sendJson(
        response,
        200,
        await deps.listPdfGenerations({
          generationUnit: searchParams.get("generationUnit") || "",
          keyword: searchParams.get("keyword") || "",
          limit: searchParams.get("limit") || "",
          page: searchParams.get("page") || "",
          schoolId: searchParams.get("schoolId") || "",
          status: searchParams.get("status") || "",
          templateId: searchParams.get("templateId") || "",
        }),
      );
    })),
    exactRoute("DELETE", "/api/pdf-generations", withPermission("generatePdfs", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);

      await assertGenerationRequestWriteAccess(body, request);
      deps.sendJson(response, 200, await deps.deletePdfGenerations(body));
    })),
    exactRoute("GET", "/api/pdf-generations/audit-logs", withPermission("viewGenerations", async ({ response, searchParams }) => {
      deps.sendJson(
        response,
        200,
        await deps.listPdfAuditLogs({
          limit: searchParams.get("limit") || "",
          schoolId: searchParams.get("schoolId") || "",
        }),
      );
    })),
    exactRoute("GET", "/api/pdf-generations/artifacts", withPermission("downloadPdfs", async ({ response, searchParams }) => {
      deps.sendJson(
        response,
        200,
        await deps.listPdfGenerationArtifacts({
          limit: searchParams.get("limit") || "",
          schoolId: searchParams.get("schoolId") || "",
        }),
      );
    })),
    regexRoute(
      "GET",
      /^\/api\/pdf-generations\/batches\/(?<batchId>[^/]+)$/,
      withPermission("viewGenerations", async ({ response, params }) => {
        deps.sendJson(response, 200, await deps.getPdfGenerationBatch(params.batchId));
      }),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "POST",
      /^\/api\/pdf-generations\/batches\/(?<batchId>[^/]+)\/cancel$/,
      withPermission("generatePdfs", async ({ request, response, params }) => {
        await assertBatchWriteAccess(params.batchId, request);
        deps.sendJson(response, 200, await deps.cancelPdfGenerationBatch(params.batchId));
      }),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "GET",
      /^\/api\/pdf-generations\/(?<generationId>[^/]+)$/,
      withPermission("viewGenerations", async ({ response, params }) => {
        deps.sendJson(response, 200, await deps.getPdfGenerationDetail(params.generationId));
      }),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    exactRoute("POST", "/api/pdf-generations/jobs", withPermission("generatePdfs", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);

      await assertGenerationRequestWriteAccess(body, request);
      deps.sendJson(response, 202, await deps.enqueuePdfGeneration(body));
    })),
    exactRoute("POST", "/api/pdf-generations/batch/jobs", withPermission("generatePdfs", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);

      await assertGenerationRequestWriteAccess(body, request);
      deps.sendJson(response, 202, await deps.enqueuePdfGenerationBatch(body));
    })),
    exactRoute("POST", "/api/pdf-generations", withPermission("generatePdfs", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);

      await assertGenerationRequestWriteAccess(body, request);
      deps.sendJson(response, 201, await deps.createPdfGeneration(body));
    })),
    exactRoute("POST", "/api/pdf-generations/retention/cleanup", withPermission("generatePdfs", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);

      await assertGenerationRequestWriteAccess(body, request);
      deps.sendJson(response, 200, await deps.cleanupExpiredPdfGenerations(body));
    })),
    exactRoute("POST", "/api/pdf-generations/archive", withPermission("downloadPdfs", async ({ request, response }) => {
      deps.sendJson(response, 201, await deps.createPdfGenerationArchive(await deps.readJsonBody(request)));
    })),
    exactRoute("POST", "/api/pdf-generations/merge", withPermission("downloadPdfs", async ({ request, response }) => {
      deps.sendJson(response, 201, await deps.createPdfGenerationMergedFile(await deps.readJsonBody(request)));
    })),
    exactRoute("POST", "/api/pdf-generations/batch", withPermission("generatePdfs", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);

      await assertGenerationRequestWriteAccess(body, request);
      deps.sendJson(response, 201, await deps.createPdfGenerationBatch(body));
    })),
    exactRoute("POST", "/api/pdf-generations/rerun-batch", withPermission("generatePdfs", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);

      await assertGenerationRequestWriteAccess(body, request);
      deps.sendJson(response, 201, await deps.rerunPdfGenerationBatch(body));
    })),
    regexRoute(
      "POST",
      /^\/api\/pdf-generations\/(?<generationId>[^/]+)\/retry$/,
      withPermission("generatePdfs", async ({ request, response, params }) => {
        await assertGenerationWriteAccess(params.generationId, request);
        deps.sendJson(response, 202, await deps.retryPdfGeneration(params.generationId));
      }),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "POST",
      /^\/api\/pdf-generations\/(?<generationId>[^/]+)\/rerun$/,
      withPermission("generatePdfs", async ({ request, response, params }) => {
        await assertGenerationWriteAccess(params.generationId, request);
        deps.sendJson(response, 201, await deps.rerunPdfGeneration(params.generationId));
      }),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "GET",
      /^\/api\/pdf-generations\/previews\/(?<previewId>[^/]+)$/,
      withPermission("previewTemplates", async ({ response, params, searchParams }) => {
        const filePayload = await deps.getPdfGenerationPreviewFile(
          params.previewId,
          searchParams.get("name") || "",
        );
        await deps.sendDownload(response, filePayload.filePath, filePayload.fileName, {
          "Content-Disposition": deps.buildContentDisposition("inline", filePayload.fileName),
        });
      }),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "GET",
      /^\/api\/pdf-generations\/archives\/(?<archiveId>[^/]+)\/download$/,
      withPermission("downloadPdfs", async ({ response, params, searchParams }) => {
        const filePayload = await deps.getPdfGenerationArchiveFile(
          params.archiveId,
          searchParams.get("name") || "",
        );
        await deps.sendDownload(response, filePayload.filePath, filePayload.fileName);
      }),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "GET",
      /^\/api\/pdf-generations\/merged\/(?<mergedId>[^/]+)\/download$/,
      withPermission("downloadPdfs", async ({ response, params, searchParams }) => {
        const filePayload = await deps.getPdfGenerationMergedFile(
          params.mergedId,
          searchParams.get("name") || "",
        );
        await deps.sendDownload(response, filePayload.filePath, filePayload.fileName);
      }),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "GET",
      /^\/api\/pdf-generations\/(?<generationId>[^/]+)\/download$/,
      withPermission("downloadPdfs", async ({ response, params, searchParams }) => {
        const filePayload = await deps.getPdfGenerationFile(params.generationId);
        const isInline = String(searchParams.get("disposition") || "").trim() === "inline";

        await deps.sendDownload(
          response,
          filePayload.filePath,
          filePayload.fileName,
          isInline ? { "Content-Disposition": deps.buildContentDisposition("inline", filePayload.fileName) } : {},
        );
      }),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
  ];
}

module.exports = {
  createPdfGenerationRoutes,
};
