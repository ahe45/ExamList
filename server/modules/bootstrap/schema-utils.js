async function hasColumn(connection, { columnName, tableName }) {
  const [rows] = await connection.query(
    `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [tableName, columnName],
  );

  return Array.isArray(rows) && rows.length > 0;
}

async function ensureColumn(connection, { columnName, definition, tableName }) {
  if (await hasColumn(connection, { columnName, tableName })) {
    return;
  }

  await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definition}`);
}

async function hasIndex(connection, { indexName, tableName }) {
  const [rows] = await connection.query(
    `
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
      LIMIT 1
    `,
    [tableName, indexName],
  );

  return Array.isArray(rows) && rows.length > 0;
}

async function ensureIndex(connection, { definition, indexName, tableName }) {
  if (await hasIndex(connection, { indexName, tableName })) {
    return;
  }

  await connection.query(`ALTER TABLE \`${tableName}\` ADD ${definition}`);
}

async function dropIndexIfExists(connection, { indexName, tableName }) {
  if (!(await hasIndex(connection, { indexName, tableName }))) {
    return;
  }

  await connection.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${indexName}\``);
}

module.exports = {
  dropIndexIfExists,
  ensureColumn,
  ensureIndex,
  hasColumn,
  hasIndex,
};
