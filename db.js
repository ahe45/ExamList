const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

const DEFAULT_DB_NAME = "examlist";
const DEFAULT_DB_USER = "examlist_app";
const DEFAULT_DB_PASSWORD = "examlist_dev_password";

let envLoaded = false;
let pool;

function loadEnvironment() {
  if (envLoaded) {
    return;
  }

  const rootEnvPath = path.join(__dirname, ".env");

  if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath, quiet: true });
  } else {
    dotenv.config({ quiet: true });
  }

  envLoaded = true;
}

function getDbConfig(includeDatabase = true) {
  loadEnvironment();

  const config = {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || DEFAULT_DB_USER,
    password: process.env.DB_PASSWORD || DEFAULT_DB_PASSWORD,
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    namedPlaceholders: true,
    multipleStatements: true,
  };

  if (includeDatabase) {
    config.database = process.env.DB_NAME || DEFAULT_DB_NAME;
  }

  return config;
}

async function ensureDatabaseExists() {
  loadEnvironment();

  const databaseName = process.env.DB_NAME || DEFAULT_DB_NAME;
  const connection = await mysql.createConnection(getDbConfig(false));

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(databaseName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally {
    await connection.end();
  }
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool(getDbConfig(true));
  }

  return pool;
}

async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

function quoteIdentifier(value) {
  return `\`${String(value || "").replaceAll("`", "``")}\``;
}

function qualifyTableName(tableName, databaseName = "") {
  const normalizedTableName = String(tableName || "").trim();
  const normalizedDatabaseName = String(databaseName || "").trim();

  if (!normalizedTableName) {
    throw new TypeError("A table name is required.");
  }

  return normalizedDatabaseName
    ? `${quoteIdentifier(normalizedDatabaseName)}.${quoteIdentifier(normalizedTableName)}`
    : quoteIdentifier(normalizedTableName);
}

module.exports = {
  ensureDatabaseExists,
  getDbConfig,
  getPool,
  loadEnvironment,
  qualifyTableName,
  query,
};
