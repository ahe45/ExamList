const { normalizeTemplateLayout } = require("./layout");
const { renderTemplateContentThumbnail } = require("../pdf-preview/thumbnail");

function parseJsonColumn(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function normalizeTemplateListLayout(row, metadata) {
  if (!Object.prototype.hasOwnProperty.call(row, "layoutJson")) {
    return null;
  }

  const rawLayout = parseJsonColumn(row.layoutJson, null);

  if (!rawLayout) {
    return null;
  }

  try {
    return normalizeTemplateLayout(rawLayout, metadata, String(row.id || ""));
  } catch (_error) {
    return null;
  }
}

function renderTemplateListThumbnail(row, metadata, layout) {
  if (!layout) {
    return null;
  }

  try {
    return renderTemplateContentThumbnail({
      ...metadata,
      id: String(row.id),
      layout,
      schoolId: String(row.schoolId || ""),
    });
  } catch (_error) {
    return null;
  }
}

function mapTemplateListRow(row, options = {}) {
  const normalizedMetadata = {
    description: String(row.description || ""),
    generationUnit: String(row.generationUnit || "roomCode"),
    name: String(row.name || ""),
    orientation: String(row.orientation || "portrait"),
    paperPreset: String(row.paperPreset || "A4"),
  };
  const normalizedLayout = normalizeTemplateListLayout(row, normalizedMetadata);
  const shouldRenderThumbnail = options.renderThumbnail !== false;
  const thumbnail = shouldRenderThumbnail ? renderTemplateListThumbnail(row, normalizedMetadata, normalizedLayout) : null;

  return {
    id: String(row.id),
    schoolId: String(row.schoolId || ""),
    name: String(row.name || ""),
    description: String(row.description || ""),
    paperPreset: String(row.paperPreset || "A4"),
    orientation: String(row.orientation || "portrait"),
    generationUnit: String(row.generationUnit || "roomCode"),
    latestVersionNo: Number(row.latestVersionNo) || 1,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || ""),
    ...(normalizedLayout ? { layout: normalizedLayout } : {}),
    ...(thumbnail
      ? {
          thumbnailHtml: thumbnail.html,
          thumbnailPage: {
            heightPt: thumbnail.heightPt,
            sourcePageId: thumbnail.sourcePageId,
            sourcePageNumber: thumbnail.sourcePageNumber,
            widthPt: thumbnail.widthPt,
          },
        }
      : {}),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt || ""),
  };
}

module.exports = {
  mapTemplateListRow,
  parseJsonColumn,
};
