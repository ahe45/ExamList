const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, quiet: true });
} else {
  dotenv.config({ quiet: true });
}

function quoteIdentifier(value) {
  return `\`${String(value || "").replaceAll("`", "``")}\``;
}

function quoteString(value) {
  return `'${String(value || "").replaceAll("\\", "\\\\").replaceAll("'", "''")}'`;
}

function findClientFromPath() {
  const result = spawnSync("where.exe", ["mariadb", "mysql"], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });

  return String(result.stdout || "")
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => entry && fs.existsSync(entry));
}

function findMariaDbClient() {
  const configuredPath = String(process.env.MARIADB_CLI_PATH || process.env.MYSQL_CLI_PATH || "").trim();

  if (configuredPath && fs.existsSync(configuredPath)) {
    return configuredPath;
  }

  const pathClient = findClientFromPath();

  if (pathClient) {
    return pathClient;
  }

  const candidatePaths = [
    "C:\\Program Files\\MariaDB 11.4\\bin\\mariadb.exe",
    "C:\\Program Files\\MariaDB 11.4\\bin\\mysql.exe",
    "C:\\Program Files\\MariaDB 11.3\\bin\\mariadb.exe",
    "C:\\Program Files\\MariaDB 11.3\\bin\\mysql.exe",
    "C:\\Program Files\\MariaDB 10.11\\bin\\mariadb.exe",
    "C:\\Program Files\\MariaDB 10.11\\bin\\mysql.exe",
    "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe",
  ];

  return candidatePaths.find((candidatePath) => fs.existsSync(candidatePath)) || "";
}

function buildSql() {
  const databaseName = process.env.DB_NAME || "examlist";
  const appUser = process.env.DB_USER || "examlist_app";
  const appPassword = process.env.DB_PASSWORD || "examlist_dev_password";
  const databaseNameSql = quoteIdentifier(databaseName);
  const appUserSql = quoteString(appUser);
  const appPasswordSql = quoteString(appPassword);

  return `
CREATE DATABASE IF NOT EXISTS ${databaseNameSql}
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS ${appUserSql}@'localhost'
  IDENTIFIED BY ${appPasswordSql};
CREATE USER IF NOT EXISTS ${appUserSql}@'127.0.0.1'
  IDENTIFIED BY ${appPasswordSql};

ALTER USER ${appUserSql}@'localhost'
  IDENTIFIED BY ${appPasswordSql};
ALTER USER ${appUserSql}@'127.0.0.1'
  IDENTIFIED BY ${appPasswordSql};

GRANT ALL PRIVILEGES ON ${databaseNameSql}.* TO ${appUserSql}@'localhost';
GRANT ALL PRIVILEGES ON ${databaseNameSql}.* TO ${appUserSql}@'127.0.0.1';

FLUSH PRIVILEGES;
`;
}

function run() {
  const clientPath = findMariaDbClient();

  if (!clientPath) {
    console.error("MariaDB/MySQL CLI를 찾을 수 없습니다. MARIADB_CLI_PATH 또는 MYSQL_CLI_PATH를 설정하세요.");
    process.exitCode = 1;
    return;
  }

  const adminUser = process.env.DB_ADMIN_USER || "root";
  const adminPassword = String(process.env.DB_ADMIN_PASSWORD || "");
  const host = process.env.DB_HOST || "127.0.0.1";
  const port = process.env.DB_PORT || "3306";
  const result = spawnSync(
    clientPath,
    [
      "--protocol=tcp",
      `--host=${host}`,
      `--port=${port}`,
      `--user=${adminUser}`,
    ],
    {
      encoding: "utf8",
      env: adminPassword ? { ...process.env, MYSQL_PWD: adminPassword } : process.env,
      input: buildSql(),
      windowsHide: true,
    },
  );

  if (result.status !== 0) {
    if (result.stderr) {
      console.error(result.stderr.trim());
    }

    console.error("DB 전용 계정을 만들 수 없습니다. DB_ADMIN_USER/DB_ADMIN_PASSWORD 값을 확인하세요.");
    process.exitCode = result.status || 1;
    return;
  }

  console.log("DB 전용 계정과 examlist 데이터베이스를 준비했습니다.");
}

run();
