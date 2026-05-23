const { calculateRowsPerPage } = require("./pagination");
const {
  normalizeBoolean,
  normalizeFiniteNumber,
  normalizeOption,
} = require("./layout-utils");

const supportedElementTypes = Object.freeze([
  "text",
  "dataText",
  "image",
  "candidatePhoto",
  "table",
  "line",
  "rect",
  "ellipse",
  "checkbox",
  "signatureBox",
  "pageNumber",
]);
const supportedBoxBorderStyles = Object.freeze(["solid", "dashed", "dotted"]);
const supportedImageFits = Object.freeze(["contain", "cover", "fill"]);
const supportedLineDirections = Object.freeze(["horizontal", "vertical", "diagonal-down", "diagonal-up"]);

function normalizeTextStyle(baseStyle = {}, defaults = {}) {
  return {
    color: String(baseStyle.color || defaults.color || "#102445"),
    fontFamily: String(baseStyle.fontFamily || defaults.fontFamily || "Noto Sans KR"),
    fontSize: normalizeFiniteNumber(baseStyle.fontSize, defaults.fontSize ?? 16, 1, 200),
    fontWeight: normalizeFiniteNumber(baseStyle.fontWeight, defaults.fontWeight ?? 500, 100, 900),
    lineHeight: normalizeFiniteNumber(baseStyle.lineHeight, defaults.lineHeight ?? 1, 0, 5),
    textAlign: ["left", "center", "right"].includes(baseStyle.textAlign) ? baseStyle.textAlign : (defaults.textAlign || "left"),
  };
}

function normalizeBoxStyle(baseStyle = {}, defaults = {}) {
  return {
    backgroundColor: String(baseStyle.backgroundColor || defaults.backgroundColor || "transparent"),
    borderColor: String(baseStyle.borderColor || defaults.borderColor || "#516585"),
    borderStyle: normalizeOption(baseStyle.borderStyle, supportedBoxBorderStyles, defaults.borderStyle || "solid"),
    borderWidth: normalizeFiniteNumber(baseStyle.borderWidth, defaults.borderWidth ?? 1, 0, 24),
    color: String(baseStyle.color || defaults.color || "#102445"),
    fontSize: normalizeFiniteNumber(baseStyle.fontSize, defaults.fontSize ?? 12, 1, 200),
    fontWeight: normalizeFiniteNumber(baseStyle.fontWeight, defaults.fontWeight ?? 600, 100, 900),
    opacity: normalizeFiniteNumber(baseStyle.opacity, defaults.opacity ?? 1, 0, 1),
    radius: normalizeFiniteNumber(baseStyle.radius, defaults.radius ?? 0, 0, 1000),
    textAlign: ["left", "center", "right"].includes(baseStyle.textAlign) ? baseStyle.textAlign : (defaults.textAlign || "center"),
  };
}

function normalizeLineStyle(baseStyle = {}, defaults = {}) {
  return {
    strokeColor: String(baseStyle.strokeColor || defaults.strokeColor || "#516585"),
    strokeStyle: normalizeOption(baseStyle.strokeStyle, supportedBoxBorderStyles, defaults.strokeStyle || "solid"),
    strokeWidth: normalizeFiniteNumber(baseStyle.strokeWidth, defaults.strokeWidth ?? 1.5, 0.5, 24),
  };
}

function normalizeTableColumn(column, index) {
  if (!column || typeof column !== "object") {
    return null;
  }

  return {
    align: ["left", "center", "right"].includes(column.align) ? column.align : "center",
    format: String(column.format || ""),
    key: String(column.key || `column_${index + 1}`),
    label: String(column.label || `컬럼 ${index + 1}`),
    type: ["photo", "checkbox"].includes(String(column.type || "").trim())
      ? String(column.type).trim()
      : "text",
    width: normalizeFiniteNumber(column.width, 80, 20, 1000),
  };
}

function normalizeTableElementConfig(baseConfig) {
  const basePagination = baseConfig.pagination && typeof baseConfig.pagination === "object" ? baseConfig.pagination : {};
  const normalizedColumns = Array.isArray(baseConfig.columns)
    ? baseConfig.columns.map(normalizeTableColumn).filter(Boolean)
    : [];
  const pagination = {
    enabled: normalizeBoolean(basePagination.enabled, true),
    fillEmptyRows: normalizeBoolean(basePagination.fillEmptyRows, true),
    headerHeight: normalizeFiniteNumber(basePagination.headerHeight, 32, 0, 300),
    repeatHeader: normalizeBoolean(basePagination.repeatHeader, true),
    rowHeight: normalizeFiniteNumber(basePagination.rowHeight, 42, 12, 300),
  };

  return {
    columns: normalizedColumns.length
      ? normalizedColumns
      : [
          {
            align: "center",
            format: "",
            key: "candidate.examNo",
            label: "수험번호",
            type: "text",
            width: 90,
          },
        ],
    dataSource: String(baseConfig.dataSource || "candidates"),
    pagination,
    repeat: normalizeBoolean(baseConfig.repeat, true),
    rowsPerPage: calculateRowsPerPage({
      headerHeight: pagination.headerHeight,
      repeatHeader: pagination.repeatHeader,
      rowHeight: pagination.rowHeight,
      tableHeight: baseConfig.tableHeight || 0,
    }),
  };
}

function normalizeElementConfig(elementType, config) {
  const baseConfig = config && typeof config === "object" ? { ...config } : {};

  if (elementType === "text" || elementType === "dataText" || elementType === "pageNumber") {
    return {
      ...baseConfig,
      content: String(baseConfig.content || (elementType === "pageNumber" ? "{{page.current}} / {{page.total}}" : "")),
      style: normalizeTextStyle(baseConfig.style, elementType === "pageNumber"
        ? {
            fontSize: 12,
            fontWeight: 600,
            textAlign: "center",
          }
        : {}),
    };
  }

  if (elementType === "table") {
    return normalizeTableElementConfig(baseConfig);
  }

  if (elementType === "image" || elementType === "candidatePhoto") {
    return {
      ...baseConfig,
      alt: String(baseConfig.alt || (elementType === "candidatePhoto" ? "수험생 사진" : "이미지")),
      borderRadius: normalizeFiniteNumber(baseConfig.borderRadius, 0, 0, 1000),
      fit: normalizeOption(baseConfig.fit, supportedImageFits, "contain"),
      opacity: normalizeFiniteNumber(baseConfig.opacity, 1, 0, 1),
      placeholderText: String(baseConfig.placeholderText || (elementType === "candidatePhoto" ? "사진 미등록" : "이미지 없음")),
      src: elementType === "image" ? String(baseConfig.src || "") : "",
    };
  }

  if (elementType === "line") {
    return {
      ...baseConfig,
      direction: normalizeOption(baseConfig.direction, supportedLineDirections, "horizontal"),
      style: normalizeLineStyle(baseConfig.style),
    };
  }

  if (elementType === "rect" || elementType === "ellipse") {
    return {
      ...baseConfig,
      label: String(baseConfig.label || ""),
      style: normalizeBoxStyle(baseConfig.style, {
        backgroundColor: "transparent",
        borderColor: "#516585",
        borderStyle: "solid",
        borderWidth: 1.2,
        radius: elementType === "rect" ? 8 : 999,
      }),
    };
  }

  if (elementType === "checkbox") {
    return {
      ...baseConfig,
      checked: normalizeBoolean(baseConfig.checked, false),
      label: String(baseConfig.label || "확인"),
      style: normalizeBoxStyle(baseConfig.style, {
        backgroundColor: "transparent",
        borderColor: "#516585",
        borderStyle: "solid",
        borderWidth: 1.2,
        fontSize: 12,
        textAlign: "left",
      }),
    };
  }

  if (elementType === "signatureBox") {
    return {
      ...baseConfig,
      label: String(baseConfig.label || "서명"),
      placeholderText: String(baseConfig.placeholderText || "서명란"),
      style: normalizeBoxStyle(baseConfig.style, {
        backgroundColor: "transparent",
        borderColor: "#516585",
        borderStyle: "dashed",
        borderWidth: 1.2,
        fontSize: 12,
        textAlign: "center",
      }),
    };
  }

  return baseConfig;
}

module.exports = {
  normalizeBoxStyle,
  normalizeElementConfig,
  normalizeLineStyle,
  normalizeTableElementConfig,
  normalizeTextStyle,
  supportedElementTypes,
};
