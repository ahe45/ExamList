const { calculateRowsPerPage } = require("../pdf-templates/pagination");
const { isRoomGenerationUnit } = require("../pdf-templates/generation-units");
const {
  getTemplateGenerationUnitFields,
  normalizeGenerationUnitFieldKey,
} = require("../pdf-generations/generation-unit-fields");
const {
  normalizeCandidateBlockGridSortDirection,
  normalizeCandidateBlockGridSortKey,
} = require("../pdf-templates/candidate-block-grid-sort");

function isCoverPage(page) {
  return String(page?.type || "").trim() === "cover";
}

function isContentPage(page) {
  return String(page?.type || "").trim() === "content";
}

function isRoomGenerationLayout(layout) {
  if (isRoomGenerationUnit(layout?.generation?.unit)) {
    return true;
  }

  return getTemplateGenerationUnitFields({ layout }, []).some((field) => {
    const normalizedField = normalizeGenerationUnitFieldKey(field);

    return normalizedField === "room" || normalizedField === "roomCode";
  });
}

function shouldAppendOtherRoomPage(layout, page) {
  const source = page?.settings?.otherRoomPage;

  return Boolean(
    isRoomGenerationLayout(layout) &&
      isContentPage(page) &&
      source &&
      typeof source === "object" &&
      (source.enabled === true || String(source.enabled || "").trim().toLowerCase() === "true"),
  );
}

function chunkArray(items, chunkSize) {
  if (!Array.isArray(items) || !items.length) {
    return [[]];
  }

  const safeChunkSize = Math.max(Number(chunkSize) || 0, 1);
  const chunks = [];

  for (let index = 0; index < items.length; index += safeChunkSize) {
    chunks.push(items.slice(index, index + safeChunkSize));
  }

  return chunks;
}

function normalizeFiniteNumber(value, fallback, minimum = 0, maximum = 100000) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, numericValue));
}

function normalizeInteger(value, fallback, minimum, maximum) {
  return Math.round(normalizeFiniteNumber(value, fallback, minimum, maximum));
}

function normalizeCandidateBlockGridConfig(page) {
  const source = page?.settings?.candidateBlockGrid && typeof page.settings.candidateBlockGrid === "object"
    ? page.settings.candidateBlockGrid
    : {};
  const variant = String(source.variant || "photo").trim() === "list" ? "list" : "photo";
  const normalizeCandidateBlockTemplateHtml = (value) => String(value || "").trim() || "<p><br></p>";
  const normalizeTemplateFeature = (value) => {
    const featureSource = value && typeof value === "object" ? value : {};

    return {
      enabled: featureSource.enabled === true || String(featureSource.enabled || "").trim() === "true",
      templateHtml: normalizeCandidateBlockTemplateHtml(featureSource.templateHtml ?? featureSource.blockTemplateHtml),
    };
  };
  const columnNameRowSource = source.columnNameRow ?? source.fieldNameRow;
  const columnNameRow = normalizeTemplateFeature(columnNameRowSource);

  return {
    blockTemplateHtml: String(source.blockTemplateHtml || "").trim() || "<p><br></p>",
    columnNameRow: {
      ...columnNameRow,
      heightPt: normalizeFiniteNumber(columnNameRowSource?.heightPt ?? columnNameRowSource?.height, 20, 4, 240),
    },
    columns: normalizeInteger(source.columns, 2, 1, 4),
    enabled: !isCoverPage(page) && (source.enabled === true || String(source.enabled || "").trim() === "true"),
    emptyBlockLayer: normalizeTemplateFeature(source.emptyBlockLayer ?? source.emptyValueLayer),
    fillEmptyBlocks: source.fillEmptyBlocks !== false,
    gapXPt: normalizeFiniteNumber(source.gapXPt ?? source.gapX, 4, 0, 48),
    gapYPt: normalizeFiniteNumber(source.gapYPt ?? source.gapY, 4, 0, 48),
    heightPt: normalizeFiniteNumber(source.heightPt, 0, 0, 2000),
    rows: normalizeInteger(source.rows, 10, 1, 30),
    sortDirection: normalizeCandidateBlockGridSortDirection(source.sortDirection ?? source.sort?.direction),
    sortKey: normalizeCandidateBlockGridSortKey(source.sortKey ?? source.sortField ?? source.sort?.field),
    variant,
    widthPt: normalizeFiniteNumber(source.widthPt, 0, 0, 2000),
    xPt: normalizeFiniteNumber(source.xPt ?? source.x, 0, 0, 2000),
    yPt: normalizeFiniteNumber(source.yPt ?? source.y, 0, 0, 2000),
  };
}

function getCandidateBlockGridConfig(page) {
  const config = normalizeCandidateBlockGridConfig(page);

  return config.variant === "photo" && config.enabled ? config : null;
}

function getPrimaryTableElement(page) {
  const elements = Array.isArray(page?.elements) ? page.elements : [];

  return elements.find((element) => element.visible !== false && element.type === "table") || null;
}

function getRowsPerPage(element) {
  if (!element || element.type !== "table") {
    return 0;
  }

  const pagination = element.config?.pagination || {};

  return (
    Number(element.config?.rowsPerPage) ||
    calculateRowsPerPage({
      headerHeight: pagination.headerHeight,
      repeatHeader: pagination.repeatHeader,
      rowHeight: pagination.rowHeight,
      tableHeight: element.height,
    })
  );
}

function getCandidateSortValue(candidate, sortKey) {
  const valueAliases = {
    admission: ["admission", "admissionTypeName"],
    admissionCode: ["admissionCode", "admissionTypeCode", "applicationNo"],
    birth: ["birth", "birthDate"],
    building: ["building", "buildingName"],
    campus: ["campus", "campusName"],
    date: ["date", "examDate"],
    endTime: ["endTime", "examEndTime"],
    examineeNo: ["examineeNo", "examNo"],
    group: ["group", "groupName"],
    major: ["major", "majorName"],
    period: ["period", "periodName"],
    room: ["room", "roomName"],
    track: ["track", "examName", "admissionRoundName"],
    unit: ["unit", "departmentName"],
  };
  const keys = valueAliases[sortKey] || [sortKey];

  for (const key of keys) {
    const value = candidate?.[key];

    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "";
}

function sortCandidatesForCandidateBlockGrid(candidates, config) {
  if (!config || !Array.isArray(candidates) || candidates.length <= 1) {
    return Array.isArray(candidates) ? candidates : [];
  }

  const sortKey = normalizeCandidateBlockGridSortKey(config.sortKey);
  const direction = normalizeCandidateBlockGridSortDirection(config.sortDirection) === "desc" ? -1 : 1;

  return [...candidates].sort((left, right) => {
    const leftValue = getCandidateSortValue(left, sortKey);
    const rightValue = getCandidateSortValue(right, sortKey);
    const leftIsEmpty = !leftValue;
    const rightIsEmpty = !rightValue;

    if (leftIsEmpty || rightIsEmpty) {
      if (leftIsEmpty && rightIsEmpty) {
        return 0;
      }

      return leftIsEmpty ? 1 : -1;
    }

    return leftValue.localeCompare(rightValue, "ko", {
      numeric: true,
      sensitivity: "base",
    }) * direction;
  });
}

function buildPreviewPages(layout, candidates) {
  const pages = Array.isArray(layout?.pages)
    ? [...layout.pages]
        .filter((page) => page.enabled !== false)
        .sort((left, right) => (Number(left.sortOrder) || 0) - (Number(right.sortOrder) || 0))
    : [];
  const previewPages = [];

  pages.forEach((page) => {
    const tableElement = getPrimaryTableElement(page);
    const blockGridConfig = getCandidateBlockGridConfig(page);
    const blockGridRowsPerPage = blockGridConfig ? Math.max(1, blockGridConfig.columns * blockGridConfig.rows) : 0;
    const rowsPerPage = blockGridRowsPerPage || getRowsPerPage(tableElement);
    const pageCandidates = blockGridConfig ? sortCandidatesForCandidateBlockGrid(candidates, blockGridConfig) : candidates;
    const shouldRepeat =
      Boolean(page.repeatable) &&
      rowsPerPage > 0 &&
      (blockGridRowsPerPage > 0 || (Boolean(tableElement) && tableElement.config?.repeat !== false));

    if (!shouldRepeat) {
      previewPages.push({
        isOtherRoomPage: false,
        page,
        rowOffset: 0,
        rows: rowsPerPage > 0 ? pageCandidates.slice(0, rowsPerPage) : [],
        rowsPerPage,
      });

      if (shouldAppendOtherRoomPage(layout, page)) {
        previewPages.push({
          isOtherRoomPage: true,
          page,
          representativeCandidate: pageCandidates[0] || candidates?.[0] || null,
          rowOffset: 0,
          rows: [],
          rowsPerPage,
        });
      }
      return;
    }

    const rowChunks = chunkArray(pageCandidates, rowsPerPage || 1);

    rowChunks.forEach((rows, chunkIndex) => {
      previewPages.push({
        isOtherRoomPage: false,
        page,
        rowOffset: chunkIndex * Math.max(rowsPerPage, 1),
        rows,
        rowsPerPage,
      });
    });

    if (shouldAppendOtherRoomPage(layout, page)) {
      previewPages.push({
        isOtherRoomPage: true,
        page,
        representativeCandidate: rowChunks[0]?.[0] || pageCandidates[0] || candidates?.[0] || null,
        rowOffset: 0,
        rows: [],
        rowsPerPage,
      });
    }
  });

  return previewPages;
}

module.exports = {
  buildPreviewPages,
  getCandidateBlockGridConfig,
  getRowsPerPage,
  sortCandidatesForCandidateBlockGrid,
};
