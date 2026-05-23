const { exactRoute, regexRoute } = require("../router");
const { createPermissionGuard, decodeRouteParams, readGenerationTargetFilters } = require("../route-helpers");

function createPdfGenerationRoutes(deps) {
  const withPermission = createPermissionGuard(deps);

  return [
    exactRoute("GET", "/api/pdf-generations/targets", withPermission("generatePdfs", async ({ response, searchParams }) => {
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
      deps.sendJson(response, 201, await deps.createPdfGenerationPreview(await deps.readJsonBody(request)));
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
      deps.sendJson(response, 200, await deps.deletePdfGenerations(await deps.readJsonBody(request)));
    })),
    exactRoute("GET", "/api/pdf-generations/audit-logs", withPermission("viewGenerations", async ({ response, searchParams }) => {
      deps.sendJson(
        response,
        200,
        await deps.listPdfAuditLogs({
          limit: searchParams.get("limit") || "",
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
      withPermission("generatePdfs", async ({ response, params }) => {
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
      deps.sendJson(response, 202, await deps.enqueuePdfGeneration(await deps.readJsonBody(request)));
    })),
    exactRoute("POST", "/api/pdf-generations/batch/jobs", withPermission("generatePdfs", async ({ request, response }) => {
      deps.sendJson(response, 202, await deps.enqueuePdfGenerationBatch(await deps.readJsonBody(request)));
    })),
    exactRoute("POST", "/api/pdf-generations", withPermission("generatePdfs", async ({ request, response }) => {
      deps.sendJson(response, 201, await deps.createPdfGeneration(await deps.readJsonBody(request)));
    })),
    exactRoute("POST", "/api/pdf-generations/retention/cleanup", withPermission("generatePdfs", async ({ request, response }) => {
      deps.sendJson(response, 200, await deps.cleanupExpiredPdfGenerations(await deps.readJsonBody(request)));
    })),
    exactRoute("POST", "/api/pdf-generations/archive", withPermission("downloadPdfs", async ({ request, response }) => {
      deps.sendJson(response, 201, await deps.createPdfGenerationArchive(await deps.readJsonBody(request)));
    })),
    exactRoute("POST", "/api/pdf-generations/merge", withPermission("downloadPdfs", async ({ request, response }) => {
      deps.sendJson(response, 201, await deps.createPdfGenerationMergedFile(await deps.readJsonBody(request)));
    })),
    exactRoute("POST", "/api/pdf-generations/batch", withPermission("generatePdfs", async ({ request, response }) => {
      deps.sendJson(response, 201, await deps.createPdfGenerationBatch(await deps.readJsonBody(request)));
    })),
    exactRoute("POST", "/api/pdf-generations/rerun-batch", withPermission("generatePdfs", async ({ request, response }) => {
      deps.sendJson(response, 201, await deps.rerunPdfGenerationBatch(await deps.readJsonBody(request)));
    })),
    regexRoute(
      "POST",
      /^\/api\/pdf-generations\/(?<generationId>[^/]+)\/retry$/,
      withPermission("generatePdfs", async ({ response, params }) => {
        deps.sendJson(response, 202, await deps.retryPdfGeneration(params.generationId));
      }),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "POST",
      /^\/api\/pdf-generations\/(?<generationId>[^/]+)\/rerun$/,
      withPermission("generatePdfs", async ({ response, params }) => {
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
