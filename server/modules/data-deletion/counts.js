const { getCountRowValue } = require("./summary");
const {
  createSqlPlaceholders,
  createUniqueValueList,
} = require("./utils");

function getAffectedRows(result, fallback = 0) {
  return Number(result?.affectedRows) || fallback;
}

async function deleteRowsByIds(queryFn, sqlPrefix, ids = []) {
  const uniqueIds = createUniqueValueList(ids);

  if (!uniqueIds.length) {
    return { affectedRows: 0 };
  }

  return queryFn(
    `${sqlPrefix} (${createSqlPlaceholders(uniqueIds)})`,
    uniqueIds,
  );
}

async function countRows(queryFn, sql, params = []) {
  return getCountRowValue(await queryFn(sql, params));
}

async function countRowsByIds(queryFn, tableName, columnName, ids = []) {
  const uniqueIds = createUniqueValueList(ids);

  if (!uniqueIds.length) {
    return 0;
  }

  return countRows(
    queryFn,
    `SELECT COUNT(*) AS total FROM ${tableName} WHERE ${columnName} IN (${createSqlPlaceholders(uniqueIds)})`,
    uniqueIds,
  );
}

module.exports = {
  countRows,
  countRowsByIds,
  deleteRowsByIds,
  getAffectedRows,
};
