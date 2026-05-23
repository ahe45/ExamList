(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.ExamListAppConfig = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const defaultView = "schoolManagement";
  const pageTitles = Object.freeze({
    schoolManagement: "학교 선택",
    accountManagement: "계정 관리",
    templateManagement: "양식 관리",
    templateEditor: "양식 편집",
    candidateLookup: "수험생 데이터",
    pdfGenerationHistory: "PDF 생성",
    pdfGenerationDetail: "PDF 생성 상세",
    pdfHistoryManagement: "PDF 작업 로그",
    dataDeletion: "데이터 삭제",
  });
  const viewRouteDefinitions = Object.freeze([
    Object.freeze({ view: "schoolManagement", path: "/schools", title: pageTitles.schoolManagement }),
    Object.freeze({ view: "accountManagement", path: "/accounts", title: pageTitles.accountManagement }),
    Object.freeze({ view: "templateManagement", path: "/templates", title: pageTitles.templateManagement }),
    Object.freeze({
      view: "templateManagement",
      pattern: /^\/schools\/(?<schoolId>[^/]+)\/templates$/,
      pathBuilder: ({ schoolId } = {}) =>
        schoolId ? `/schools/${encodeURIComponent(String(schoolId).trim())}/templates` : "/schools",
      title: pageTitles.templateManagement,
    }),
    Object.freeze({
      view: "templateEditor",
      pattern: /^\/templates\/(?<templateId>[^/]+)\/edit$/,
      pathBuilder: ({ templateId } = {}) =>
        templateId ? `/templates/${encodeURIComponent(String(templateId).trim())}/edit` : "/templates",
      title: pageTitles.templateEditor,
    }),
    Object.freeze({
      view: "templateEditor",
      pattern: /^\/schools\/(?<schoolId>[^/]+)\/templates\/(?<templateId>[^/]+)\/edit$/,
      pathBuilder: ({ schoolId, templateId } = {}) =>
        schoolId && templateId
          ? `/schools/${encodeURIComponent(String(schoolId).trim())}/templates/${encodeURIComponent(String(templateId).trim())}/edit`
          : schoolId
            ? `/schools/${encodeURIComponent(String(schoolId).trim())}/templates`
            : "/schools",
      title: pageTitles.templateEditor,
    }),
    Object.freeze({
      view: "candidateLookup",
      pattern: /^\/templates\/(?<templateId>[^/]+)\/candidates$/,
      pathBuilder: ({ templateId } = {}) =>
        templateId ? `/templates/${encodeURIComponent(String(templateId).trim())}/candidates` : "/templates",
      title: pageTitles.candidateLookup,
    }),
    Object.freeze({
      view: "candidateLookup",
      pattern: /^\/schools\/(?<schoolId>[^/]+)\/candidates$/,
      pathBuilder: ({ schoolId } = {}) =>
        schoolId ? `/schools/${encodeURIComponent(String(schoolId).trim())}/candidates` : "/schools",
      title: pageTitles.candidateLookup,
    }),
    Object.freeze({
      view: "pdfGenerationHistory",
      pattern: /^\/templates\/(?<templateId>[^/]+)\/pdf-generations$/,
      pathBuilder: ({ templateId } = {}) =>
        templateId ? `/templates/${encodeURIComponent(String(templateId).trim())}/pdf-generations` : "/templates",
      title: pageTitles.pdfGenerationHistory,
    }),
    Object.freeze({
      view: "pdfGenerationHistory",
      pattern: /^\/schools\/(?<schoolId>[^/]+)\/pdf-generations$/,
      pathBuilder: ({ schoolId } = {}) =>
        schoolId ? `/schools/${encodeURIComponent(String(schoolId).trim())}/pdf-generations` : "/schools",
      title: pageTitles.pdfGenerationHistory,
    }),
    Object.freeze({
      view: "pdfGenerationDetail",
      pattern: /^\/templates\/(?<templateId>[^/]+)\/pdf-generations\/(?<generationId>[^/]+)$/,
      pathBuilder: ({ generationId, templateId } = {}) =>
        templateId && generationId
          ? `/templates/${encodeURIComponent(String(templateId).trim())}/pdf-generations/${encodeURIComponent(String(generationId).trim())}`
          : templateId
            ? `/templates/${encodeURIComponent(String(templateId).trim())}/pdf-generations`
            : "/templates",
      title: pageTitles.pdfGenerationDetail,
    }),
    Object.freeze({
      view: "pdfGenerationDetail",
      pattern: /^\/schools\/(?<schoolId>[^/]+)\/pdf-generations\/(?<generationId>[^/]+)$/,
      pathBuilder: ({ generationId, schoolId } = {}) =>
        schoolId && generationId
          ? `/schools/${encodeURIComponent(String(schoolId).trim())}/pdf-generations/${encodeURIComponent(String(generationId).trim())}`
          : schoolId
            ? `/schools/${encodeURIComponent(String(schoolId).trim())}/pdf-generations`
            : "/schools",
      title: pageTitles.pdfGenerationDetail,
    }),
    Object.freeze({
      view: "pdfHistoryManagement",
      pattern: /^\/schools\/(?<schoolId>[^/]+)\/pdf-history$/,
      pathBuilder: ({ schoolId } = {}) =>
        schoolId ? `/schools/${encodeURIComponent(String(schoolId).trim())}/pdf-history` : "/schools",
      title: pageTitles.pdfHistoryManagement,
    }),
    Object.freeze({
      view: "dataDeletion",
      pattern: /^\/schools\/(?<schoolId>[^/]+)\/data-deletion$/,
      pathBuilder: ({ schoolId } = {}) =>
        schoolId ? `/schools/${encodeURIComponent(String(schoolId).trim())}/data-deletion` : "/schools",
      title: pageTitles.dataDeletion,
    }),
  ]);
  const viewRouteMap = Object.freeze(
    viewRouteDefinitions.reduce((definitionsByView, definition) => {
      definitionsByView[definition.view] = definition;
      return definitionsByView;
    }, {}),
  );
  const normalizeRoutePath = (pathname) => {
    const normalizedValue = `/${String(pathname || "/").trim()}`
      .replace(/\/{2,}/g, "/")
      .replace(/\/+$/g, "");

    return normalizedValue || "/";
  };
  const decodeRouteParams = (params = {}) =>
    Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, decodeURIComponent(String(value || ""))]),
    );
  const getRouteMatch = (pathname = "/") => {
    const normalizedPath = normalizeRoutePath(pathname);

    if (normalizedPath === "/") {
      const defaultRoute = viewRouteMap[defaultView];
      return Object.freeze({
        params: Object.freeze({}),
        path: defaultRoute.path,
        title: defaultRoute.title,
        view: defaultView,
      });
    }

    if (normalizedPath === "/dashboard") {
      const defaultRoute = viewRouteMap[defaultView];
      return Object.freeze({
        params: Object.freeze({}),
        path: defaultRoute.path,
        title: defaultRoute.title,
        view: defaultView,
      });
    }

    for (const definition of viewRouteDefinitions) {
      if (definition.path && definition.path === normalizedPath) {
        return Object.freeze({
          params: Object.freeze({}),
          path: definition.path,
          title: definition.title,
          view: definition.view,
        });
      }

      if (definition.pattern instanceof RegExp) {
        const matchedRoute = definition.pattern.exec(normalizedPath);

        if (!matchedRoute) {
          continue;
        }

        return Object.freeze({
          params: Object.freeze(decodeRouteParams(matchedRoute.groups || {})),
          path: normalizedPath,
          title: definition.title,
          view: definition.view,
        });
      }
    }

    return null;
  };
  const getViewRoutePath = (view = defaultView, params = {}) => {
    const routeDefinition = viewRouteMap[view] || viewRouteMap[defaultView];

    if (typeof routeDefinition.pathBuilder === "function") {
      return routeDefinition.pathBuilder(params);
    }

    return routeDefinition.path || viewRouteMap[defaultView].path;
  };
  const getViewFromPathname = (pathname = "/") => getRouteMatch(pathname)?.view || "";
  return Object.freeze({
    defaultView,
    getRouteMatch,
    getViewFromPathname,
    getViewRoutePath,
    normalizeRoutePath,
    pageTitles,
    viewRouteDefinitions,
  });
});
