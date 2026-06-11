const { normalizeArchiveGenerationIds } = require("./archives");
const { restoreGenerationRequestFromHistory } = require("./snapshots");

function createPdfGenerationRerunActions({
  createHttpError,
  createPdfGeneration,
  query,
}) {
  async function rerunPdfGenerationBatch(request = {}) {
    const generationIds = normalizeArchiveGenerationIds(request.generationIds);

    if (!generationIds.length) {
      throw createHttpError(400, "재생성할 PDF 생성 이력을 선택해주세요.", "PDF_GENERATION_RERUN_IDS_REQUIRED");
    }

    const placeholders = generationIds.map(() => "?").join(", ");
    const rows = await query(
      `
        SELECT
          id,
          school_id AS schoolId,
          template_id AS templateId,
          template_name AS templateName,
          file_name AS fileName,
          generation_unit AS generationUnit,
          target_name AS targetName,
          request_json AS requestJson
        FROM pdf_generation_histories
        WHERE id IN (${placeholders})
      `,
      generationIds,
    );
    const generationRowMap = new Map(rows.map((row) => [String(row.id || ""), row]));
    const items = [];

    for (const generationId of generationIds) {
      const generationRow = generationRowMap.get(generationId);

      if (!generationRow) {
        items.push({
          errorMessage: "재생성할 PDF 이력을 찾을 수 없습니다.",
          rerunSourceGenerationId: generationId,
          status: "failed",
          targetName: "",
        });
        continue;
      }

      try {
        const rerunRequest = restoreGenerationRequestFromHistory(generationRow, createHttpError);
        const rerunResult = await createPdfGeneration(rerunRequest);

        items.push({
          ...rerunResult,
          rerunSourceGenerationId: String(generationRow.id || ""),
          sourceFileName: String(generationRow.fileName || ""),
          targetName: String(rerunResult.targetName || rerunRequest.targetName || generationRow.targetName || ""),
        });
      } catch (error) {
        items.push({
          errorMessage: String(error.message || "PDF 재생성 실패").slice(0, 255),
          rerunSourceGenerationId: String(generationRow.id || generationId),
          sourceFileName: String(generationRow.fileName || ""),
          status: "failed",
          targetName: String(generationRow.targetName || ""),
        });
      }
    }

    return {
      archiveDownloadUrl: "",
      archiveFileName: "",
      archiveGenerationCount: 0,
      archiveId: "",
      failedCount: items.filter((item) => item.status === "failed").length,
      items,
      succeededCount: items.filter((item) => item.status === "completed").length,
      totalRequested: generationIds.length,
    };
  }

  async function rerunPdfGeneration(generationId) {
    const rows = await query(
      `
        SELECT
          id,
          school_id AS schoolId,
          template_id AS templateId,
          generation_unit AS generationUnit,
          target_name AS targetName,
          request_json AS requestJson
        FROM pdf_generation_histories
        WHERE id = ?
        LIMIT 1
      `,
      [generationId],
    );
    const generationRow = rows[0];

    if (!generationRow) {
      throw createHttpError(404, "재생성할 PDF 이력을 찾을 수 없습니다.", "PDF_GENERATION_RERUN_NOT_FOUND");
    }

    const rerunRequest = restoreGenerationRequestFromHistory(generationRow, createHttpError);
    const rerunResult = await createPdfGeneration(rerunRequest);

    return {
      ...rerunResult,
      rerunSourceGenerationId: String(generationRow.id || ""),
      targetName: String(rerunResult.targetName || rerunRequest.targetName || generationRow.targetName || ""),
    };
  }

  return Object.freeze({
    rerunPdfGeneration,
    rerunPdfGenerationBatch,
  });
}

module.exports = {
  createPdfGenerationRerunActions,
};
