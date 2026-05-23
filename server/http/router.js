function createRouteDefinition({ method, path = "", pattern = null, getParams = null, handler }) {
  if (typeof handler !== "function") {
    throw new TypeError("Route handler must be a function.");
  }

  return Object.freeze({
    method: String(method || "").toUpperCase(),
    path: String(path || ""),
    pattern,
    getParams: typeof getParams === "function" ? getParams : null,
    handler,
  });
}

function exactRoute(method, path, handler) {
  return createRouteDefinition({ method, path, handler });
}

function regexRoute(method, pattern, handler, options = {}) {
  if (!(pattern instanceof RegExp)) {
    throw new TypeError("Route pattern must be a RegExp.");
  }

  return createRouteDefinition({
    method,
    pattern: new RegExp(pattern.source, pattern.flags.replace(/g/g, "")),
    getParams: options.getParams,
    handler,
  });
}

function matchRoute(route, method, pathname) {
  if (route.method !== method) {
    return null;
  }

  if (route.path) {
    return route.path === pathname ? { params: {} } : null;
  }

  if (!route.pattern) {
    return null;
  }

  const match = route.pattern.exec(pathname);

  if (!match) {
    return null;
  }

  return {
    params: route.getParams ? route.getParams(match, pathname) : match.groups || {},
  };
}

async function dispatchRoute(routes, context) {
  const method = String(context?.request?.method || "").toUpperCase();
  const pathname = String(context?.requestUrl?.pathname || "");
  const searchParams = context?.requestUrl?.searchParams;

  for (const route of Array.isArray(routes) ? routes : []) {
    const matchedRoute = matchRoute(route, method, pathname);

    if (!matchedRoute) {
      continue;
    }

    await route.handler({
      ...context,
      pathname,
      searchParams,
      params: matchedRoute.params,
    });
    return true;
  }

  return false;
}

module.exports = {
  dispatchRoute,
  exactRoute,
  regexRoute,
};
