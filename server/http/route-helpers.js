function decodeRouteParams(groups = {}) {
  return Object.fromEntries(
    Object.entries(groups).map(([key, value]) => [key, decodeURIComponent(String(value || ""))]),
  );
}

function getSearchParam(searchParams, ...keys) {
  for (const key of keys) {
    const value = searchParams.get(key);

    if (value) {
      return value;
    }
  }

  return "";
}

function readGenerationTargetFilters(searchParams) {
  return {
    admission: getSearchParam(searchParams, "admission"),
    admissionCode: getSearchParam(searchParams, "admissionCode", "admission_code"),
    building: getSearchParam(searchParams, "building"),
    buildingCode: getSearchParam(searchParams, "buildingCode", "building_code"),
    campus: getSearchParam(searchParams, "campus"),
    examDate: getSearchParam(searchParams, "examDate", "date"),
    group: getSearchParam(searchParams, "group"),
    major: getSearchParam(searchParams, "major"),
    period: getSearchParam(searchParams, "period"),
    periodCode: getSearchParam(searchParams, "periodCode", "period_code"),
    room: getSearchParam(searchParams, "room"),
    roomCode: getSearchParam(searchParams, "roomCode", "room_code"),
    series: getSearchParam(searchParams, "series"),
    seriesCode: getSearchParam(searchParams, "seriesCode", "series_code"),
    time: getSearchParam(searchParams, "time"),
    endTime: getSearchParam(searchParams, "endTime"),
    track: getSearchParam(searchParams, "track"),
    unit: getSearchParam(searchParams, "unit"),
    unitCode: getSearchParam(searchParams, "unitCode", "unit_code"),
  };
}

function createPermissionGuard(deps) {
  return (permissionKey, handler) => async (context) => {
    deps.assertPermission(permissionKey, context.request);
    return handler(context);
  };
}

module.exports = {
  createPermissionGuard,
  decodeRouteParams,
  getSearchParam,
  readGenerationTargetFilters,
};
