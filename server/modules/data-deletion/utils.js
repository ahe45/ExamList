function createSqlPlaceholders(values = []) {
  return values.map(() => "?").join(", ");
}

function appendValues(target, values = []) {
  for (const value of Array.isArray(values) ? values : []) {
    target.push(value);
  }

  return target;
}

function createUniqueValueList(values = []) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
}

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

module.exports = {
  appendValues,
  createSqlPlaceholders,
  createUniqueValueList,
  parseJsonColumn,
};
