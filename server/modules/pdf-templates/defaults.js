const { randomUUID } = require("crypto");

const paperPresetDimensionsPt = Object.freeze({
  A4: Object.freeze({ widthPt: 595.28, heightPt: 841.89 }),
  A3: Object.freeze({ widthPt: 841.89, heightPt: 1190.55 }),
  B4: Object.freeze({ widthPt: 728.5, heightPt: 1031.81 }),
  B5: Object.freeze({ widthPt: 515.91, heightPt: 728.5 }),
  Letter: Object.freeze({ widthPt: 612, heightPt: 792 }),
  Legal: Object.freeze({ widthPt: 612, heightPt: 1008 }),
  Custom: Object.freeze({ widthPt: 595.28, heightPt: 841.89 }),
});

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createPaperConfig(paperPreset = "A4", orientation = "portrait") {
  const baseDimension = paperPresetDimensionsPt[paperPreset] || paperPresetDimensionsPt.A4;
  const isLandscape = orientation === "landscape";

  return {
    preset: paperPreset,
    orientation,
    widthPt: isLandscape ? baseDimension.heightPt : baseDimension.widthPt,
    heightPt: isLandscape ? baseDimension.widthPt : baseDimension.heightPt,
    margin: {
      top: 28.35,
      right: 28.35,
      bottom: 28.35,
      left: 28.35,
    },
  };
}

function createGenerationConfig(generationUnit = "roomCode") {
  return {
    unit: generationUnit,
    sort: [
      { field: "room.name", direction: "asc" },
      { field: "candidate.examNo", direction: "asc" },
    ],
  };
}

function getCanonicalPageName(pageType) {
  if (pageType === "cover") {
    return "표지";
  }

  if (pageType === "content") {
    return "본문";
  }

  return "";
}

function buildBlankTemplateSnapshot(metadata, options = {}) {
  const templateId = options.templateId || `template-${randomUUID()}`;
  const paper = createPaperConfig(metadata.paperPreset, metadata.orientation);
  const coverPageId = `page-${randomUUID()}`;
  const contentPageId = `page-${randomUUID()}`;

  return {
    id: templateId,
    name: metadata.name,
    description: metadata.description,
    paper,
    generation: createGenerationConfig(metadata.generationUnit),
    pages: [
      {
        id: coverPageId,
        type: "cover",
        name: "표지",
        sortOrder: 1,
        enabled: true,
        repeatable: false,
        widthPt: paper.widthPt,
        heightPt: paper.heightPt,
        settings: {
          safeArea: paper.margin,
          backgroundColor: "#ffffff",
        },
        elements: [],
      },
      {
        id: contentPageId,
        type: "content",
        name: "본문",
        sortOrder: 2,
        enabled: true,
        repeatable: true,
        widthPt: paper.widthPt,
        heightPt: paper.heightPt,
        settings: {
          safeArea: paper.margin,
          backgroundColor: "#ffffff",
        },
        elements: [],
      },
    ],
  };
}

function applyMetadataToSnapshot(snapshot, metadata, templateId = "", options = {}) {
  const shouldPreserveLayoutSettings = options.preserveLayoutSettings === true;
  const nextSnapshot = deepClone(snapshot);
  const paper = createPaperConfig(metadata.paperPreset, metadata.orientation);

  nextSnapshot.id = templateId || nextSnapshot.id || `template-${randomUUID()}`;
  nextSnapshot.name = metadata.name;
  nextSnapshot.description = metadata.description;

  if (shouldPreserveLayoutSettings) {
    nextSnapshot.paper = nextSnapshot.paper && typeof nextSnapshot.paper === "object" ? nextSnapshot.paper : paper;
    nextSnapshot.generation = nextSnapshot.generation && typeof nextSnapshot.generation === "object"
      ? {
          ...nextSnapshot.generation,
          unit: nextSnapshot.generation.unit || metadata.generationUnit,
        }
      : createGenerationConfig(metadata.generationUnit);
  } else {
    nextSnapshot.paper = {
      ...paper,
      margin: nextSnapshot.paper?.margin || paper.margin,
    };
    nextSnapshot.generation = {
      ...createGenerationConfig(metadata.generationUnit),
      ...(nextSnapshot.generation || {}),
      unit: metadata.generationUnit,
    };
  }

  nextSnapshot.pages = Array.isArray(nextSnapshot.pages)
    ? nextSnapshot.pages.map((page, index) => {
        const nextPage = {
          ...page,
          name: getCanonicalPageName(page.type) || String(page.name || "페이지"),
          sortOrder: Number(page.sortOrder) || index + 1,
        };

        if (shouldPreserveLayoutSettings) {
          return nextPage;
        }

        return {
          ...nextPage,
          widthPt: paper.widthPt,
          heightPt: paper.heightPt,
        };
      })
    : [];

  return nextSnapshot;
}

function cloneSnapshotWithFreshIds(snapshot, metadata, templateId = "", options = {}) {
  const sourceSnapshot = applyMetadataToSnapshot(snapshot, metadata, templateId, options);

  sourceSnapshot.id = templateId || `template-${randomUUID()}`;
  sourceSnapshot.pages = sourceSnapshot.pages.map((page) => {
    const nextPageId = `page-${randomUUID()}`;

    return {
      ...page,
      id: nextPageId,
      elements: Array.isArray(page.elements)
        ? page.elements.map((element) => ({
            ...element,
            id: `element-${randomUUID()}`,
            pageId: nextPageId,
          }))
        : [],
    };
  });

  return sourceSnapshot;
}

function clearPageCanvasContent(page) {
  const settings = page?.settings && typeof page.settings === "object" ? { ...page.settings } : {};

  delete settings.documentHtml;

  if (String(settings.editorMode || "").trim() === "document") {
    settings.editorMode = "document";
  }

  if (settings.candidateBlockGrid && typeof settings.candidateBlockGrid === "object") {
    settings.candidateBlockGrid = {
      ...settings.candidateBlockGrid,
      blockTemplateHtml: "<p><br></p>",
      columnNameRow: {
        enabled: false,
        heightPt: 20,
        templateHtml: "<p><br></p>",
      },
      enabled: false,
      emptyBlockLayer: {
        enabled: false,
        templateHtml: "<p><br></p>",
      },
    };
  }

  return {
    ...page,
    elements: [],
    settings,
  };
}

function clearSnapshotCanvasContent(snapshot) {
  const nextSnapshot = deepClone(snapshot);

  nextSnapshot.pages = Array.isArray(nextSnapshot.pages)
    ? nextSnapshot.pages.map(clearPageCanvasContent)
    : [];

  return nextSnapshot;
}

function flattenSnapshot(snapshot) {
  const pages = Array.isArray(snapshot?.pages) ? snapshot.pages : [];
  const elements = pages.flatMap((page) =>
    (Array.isArray(page.elements) ? page.elements : []).map((element) => ({
      ...element,
      pageId: page.id,
    })),
  );

  return {
    pages,
    elements,
  };
}

module.exports = {
  applyMetadataToSnapshot,
  buildBlankTemplateSnapshot,
  clearSnapshotCanvasContent,
  cloneSnapshotWithFreshIds,
  createGenerationConfig,
  createPaperConfig,
  flattenSnapshot,
};
