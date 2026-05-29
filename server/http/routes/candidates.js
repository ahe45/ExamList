const { exactRoute, regexRoute } = require("../router");
const { decodeRouteParams, readGenerationTargetFilters } = require("../route-helpers");

const photoArchiveMaxBodyMegabytes = Math.min(
  Math.max(Number(process.env.EXAMLIST_PHOTO_ARCHIVE_MAX_MB) || 2048, 1),
  4096,
);
const photoArchiveReadOptions = Object.freeze({
  maxBodyBytes: photoArchiveMaxBodyMegabytes * 1024 * 1024,
  tooLargeMessage: `사진 ZIP 파일이 너무 큽니다. ${photoArchiveMaxBodyMegabytes}MB 이하의 ZIP 파일로 업로드해 주세요.`,
});

function createCandidateRoutes(deps) {
  function isJsonRequest(request) {
    return String(request?.headers?.["content-type"] || "").toLowerCase().includes("application/json");
  }

  async function handleCandidateList({ request, response, searchParams }) {
    deps.assertPermission("viewCandidates", request);
    deps.sendJson(
      response,
      200,
        await deps.getCandidates({
          admission: searchParams.get("admission") || "",
          admissionCode: searchParams.get("admissionCode") || searchParams.get("admission_code") || "",
          examDate: searchParams.get("examDate") || "",
          group: searchParams.get("group") || "",
          keyword: searchParams.get("keyword") || "",
          limit: searchParams.get("limit") || "",
          page: searchParams.get("page") || "",
          room: searchParams.get("room") || "",
          roomCode: searchParams.get("roomCode") || searchParams.get("room_code") || "",
          schoolId: searchParams.get("schoolId") || "",
          track: searchParams.get("track") || "",
        }),
    );
  }

  return [
    exactRoute("GET", "/api/candidates/template.xlsx", async ({ request, response }) => {
      deps.assertPermission("manageCandidates", request);
      const workbookBuffer = await deps.buildCandidateTemplateBuffer();

      return deps.sendBinary(
        response,
        200,
        {
          "Content-Disposition": deps.buildContentDisposition("attachment", "수험생 데이터 업로드 양식.xlsx"),
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        workbookBuffer,
      );
    }),
    exactRoute("POST", "/api/candidates/export.xlsx", async ({ request, response }) => {
      deps.assertPermission("viewCandidates", request);
      const body = await deps.readJsonBody(request);
      const workbookBuffer = await deps.buildCandidateExportBuffer(Array.isArray(body?.rows) ? body.rows : []);

      return deps.sendBinary(
        response,
        200,
        {
          "Content-Disposition": deps.buildContentDisposition("attachment", "수험생 데이터.xlsx"),
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        workbookBuffer,
      );
    }),
    exactRoute("POST", "/api/candidates/import/preview", async ({ request, response }) => {
      deps.assertPermission("manageCandidates", request);
      deps.sendJson(response, 200, await deps.previewCandidateImport(await deps.readJsonBody(request)));
    }),
    exactRoute("POST", "/api/candidates/import", async ({ request, response }) => {
      deps.assertPermission("manageCandidates", request);
      deps.sendJson(response, 200, await deps.importCandidates(await deps.readJsonBody(request)));
    }),
    exactRoute("POST", "/api/candidates/photo-archive/preview", async ({ request, response }) => {
      deps.assertPermission("manageCandidates", request);
      deps.sendJson(
        response,
        200,
        await deps.previewCandidatePhotoArchiveBuffer(await deps.readBinaryBody(request, photoArchiveReadOptions)),
      );
    }),
    exactRoute("POST", "/api/candidates/photo-archive", async ({ request, response }) => {
      deps.assertPermission("manageCandidates", request);

      if (isJsonRequest(request)) {
        const body = await deps.readJsonBody(request);

        deps.sendJson(
          response,
          200,
          await deps.saveCandidatePhotoArchiveSession(body?.previewToken || body?.uploadSessionId || ""),
        );
        return;
      }

      deps.sendJson(
        response,
        200,
        await deps.saveCandidatePhotoArchiveBuffer(await deps.readBinaryBody(request, photoArchiveReadOptions)),
      );
    }),
    exactRoute("GET", "/api/candidates/filter-options", async ({ request, response, searchParams }) => {
      deps.assertPermission("generatePdfs", request);
      const filters = {
        ...readGenerationTargetFilters(searchParams),
        schoolId: searchParams.get("schoolId") || "",
      };

      deps.sendJson(response, 200, {
        filters,
        options: await deps.getCandidateFilterOptions(filters, searchParams.get("fields") || ""),
      });
    }),
    exactRoute("GET", "/api/candidates", handleCandidateList),
    regexRoute(
      "GET",
      /^\/api\/candidates\/(?<candidateId>[^/]+)\/photo$/,
      async ({ request, response, params }) => {
        deps.assertPermission("viewCandidates", request);
        const candidatePhoto = await deps.getCandidatePhoto(params.candidateId);

        return deps.sendBinary(
          response,
          200,
          {
            "Content-Disposition": deps.buildContentDisposition("inline", candidatePhoto.photoName || "candidate-photo.jpg"),
            "Content-Type": candidatePhoto.photoMime || "application/octet-stream",
          },
          candidatePhoto.photoBlob,
        );
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "PUT",
      /^\/api\/candidates\/(?<candidateId>[^/]+)\/photo$/,
      async ({ request, response, params }) => {
        deps.assertPermission("manageCandidates", request);
        deps.sendJson(response, 200, await deps.saveCandidatePhoto(params.candidateId, await deps.readJsonBody(request)));
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "PATCH",
      /^\/api\/candidates\/(?<candidateId>[^/]+)$/,
      async ({ request, response, params }) => {
        deps.assertPermission("manageCandidates", request);
        const body = await deps.readJsonBody(request);
        deps.sendJson(response, 200, await deps.updateCandidate(params.candidateId, body, {
          schoolId: body?.schoolId || "",
        }));
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
  ];
}

module.exports = {
  createCandidateRoutes,
};
