function assertConnectionFactory(getPool) {
  if (typeof getPool !== "function") {
    throw new TypeError("A database pool factory is required.");
  }
}

async function withDatabaseConnection(getPool, handler) {
  assertConnectionFactory(getPool);

  if (typeof handler !== "function") {
    throw new TypeError("A database connection handler is required.");
  }

  const pool = getPool();

  if (!pool || typeof pool.getConnection !== "function") {
    throw new TypeError("The database pool must expose getConnection().");
  }

  const connection = await pool.getConnection();

  try {
    return await handler(connection);
  } finally {
    connection?.release?.();
  }
}

async function withDatabaseTransaction(getPool, handler) {
  return withDatabaseConnection(getPool, async (connection) => {
    await connection.beginTransaction();

    try {
      const result = await handler(connection);

      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  });
}

module.exports = {
  withDatabaseConnection,
  withDatabaseTransaction,
};
