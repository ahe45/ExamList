const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");

const {
  createPasswordHash,
  createAuthService,
  parseConfiguredUsers,
  sessionCookieName,
  sha256Hex,
  verifyPassword,
} = require("./service");

function createHttpError(statusCode, message, errorCode = "") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}

function withEnv(nextEnv, callback) {
  const previousEnv = {};

  Object.keys(nextEnv).forEach((key) => {
    previousEnv[key] = process.env[key];
    process.env[key] = nextEnv[key];
  });

  return Promise.resolve()
    .then(callback)
    .finally(() => {
      Object.keys(nextEnv).forEach((key) => {
        if (typeof previousEnv[key] === "undefined") {
          delete process.env[key];
        } else {
          process.env[key] = previousEnv[key];
        }
      });
    });
}

function createAccountQueryStore(initialAccounts = []) {
  const accounts = initialAccounts.map((account) => ({ ...account }));

  function toCamelAccount(account) {
    return {
      createdAt: account.created_at || "",
      id: account.id,
      isActive: account.is_active,
      lastLoginAt: account.last_login_at || "",
      passwordHash: account.password_hash,
      role: account.role,
      updatedAt: account.updated_at || "",
      userId: account.user_id,
      userName: account.user_name,
    };
  }

  return {
    accounts,
    query: async (sql, params = []) => {
      const sqlText = String(sql);

      if (sqlText.includes("INSERT INTO admin_accounts")) {
        const [id, userId, userName, passwordHash, role, isActive] = params;

        accounts.push({
          created_at: "",
          id,
          is_active: isActive,
          last_login_at: "",
          password_hash: passwordHash,
          role,
          updated_at: "",
          user_id: userId,
          user_name: userName,
        });
        return { affectedRows: 1 };
      }

      if (sqlText.includes("SELECT COUNT(*) AS total")) {
        return [
          {
            total: accounts.filter((account) => account.role === "super_admin" && Number(account.is_active) === 1).length,
          },
        ];
      }

      if (sqlText.includes("UPDATE admin_accounts")) {
        const accountId = params.at(-1);
        const account = accounts.find((item) => item.id === accountId || item.user_id === accountId);

        if (!account) {
          return { affectedRows: 0 };
        }

        const hasPassword = sqlText.includes("password_hash = ?");
        const offset = hasPassword ? 1 : 0;

        if (hasPassword) {
          account.password_hash = params[0];
        }

        account.user_name = params[offset];
        account.role = params[offset + 1];
        account.is_active = params[offset + 2];
        return { affectedRows: 1 };
      }

      if (sqlText.includes("DELETE FROM admin_accounts")) {
        const accountIndex = accounts.findIndex((account) => account.id === params[0] || account.user_id === params[0]);

        if (accountIndex >= 0) {
          accounts.splice(accountIndex, 1);
        }

        return { affectedRows: accountIndex >= 0 ? 1 : 0 };
      }

      if (sqlText.includes("WHERE id = ? OR user_id = ?")) {
        const account = accounts.find((item) => item.id === params[0] || item.user_id === params[1]);
        return account ? [toCamelAccount(account)] : [];
      }

      if (sqlText.includes("FROM admin_accounts")) {
        return accounts.map(toCamelAccount);
      }

      return [];
    },
  };
}

test("parseConfiguredUsers keeps credentials out of safe user data and normalizes unsupported roles to user", () => {
  const users = parseConfiguredUsers(
    JSON.stringify([
      {
        displayName: "운영자",
        passwordSha256: sha256Hex("secret"),
        role: "unknown",
        username: "operator",
      },
    ]),
  );

  assert.equal(users.length, 1);
  assert.equal(users[0].role, "user");
  assert.equal(users[0].username, "operator");
  assert.equal(users[0].passwordHash, `sha256:${sha256Hex("secret")}`);
});

test("auth service creates, updates, lists, and deletes database accounts", async () => {
  await withEnv(
    {
      EXAMLIST_AUTH_ENABLED: "true",
      EXAMLIST_SESSION_SECRET: "test-session-secret",
      EXAMLIST_USERS_JSON: "",
    },
    async () => {
      const store = createAccountQueryStore([
        {
          id: "acct_super",
          is_active: 1,
          password_hash: createPasswordHash("1234"),
          role: "super_admin",
          user_id: "admin",
          user_name: "관리자",
        },
      ]);
      const authService = createAuthService({
        createHttpError,
        query: store.query,
      });

      const created = await authService.createAccount({
        password: "1234",
        role: "admin",
        userId: "kim",
        userName: "김성준",
      });

      assert.equal(created.userId, "kim");
      assert.equal(created.role, "admin");
      assert.equal(verifyPassword("1234", store.accounts.find((account) => account.user_id === "kim").password_hash), true);

      const updated = await authService.updateAccount(created.id, {
        isActive: false,
        role: "user",
        userName: "김성준 수정",
      });

      assert.equal(updated.userName, "김성준 수정");
      assert.equal(updated.role, "user");
      assert.equal(updated.isActive, false);

      const listed = await authService.listAccounts();

      assert.equal(listed.total, 2);
      assert.equal(listed.items.some((account) => account.userId === "kim"), true);

      const deleted = await authService.deleteAccount(created.id);

      assert.equal(deleted.deleted, true);
      assert.equal(store.accounts.some((account) => account.user_id === "kim"), false);
    },
  );
});

test("auth service imports accounts from an XLSX workbook", async () => {
  const store = createAccountQueryStore([
    {
      id: "acct_super",
      is_active: 1,
      password_hash: createPasswordHash("1234"),
      role: "super_admin",
      user_id: "admin",
      user_name: "관리자",
    },
    {
      id: "acct_kim",
      is_active: 1,
      password_hash: createPasswordHash("old"),
      role: "user",
      user_id: "kim",
      user_name: "김성준",
    },
  ]);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("계정등록");

  worksheet.addRow(["아이디", "이름", "비밀번호", "권한"]);
  worksheet.addRow(["kim", "김성준 수정", "", "관리자"]);
  worksheet.addRow(["lee", "이민수", "pass1234", "사용자"]);

  const authService = createAuthService({
    createHttpError,
    query: store.query,
  });
  const result = await authService.importAccounts({
    fileContentBase64: Buffer.from(await workbook.xlsx.writeBuffer()).toString("base64"),
  });
  const kim = store.accounts.find((account) => account.user_id === "kim");
  const lee = store.accounts.find((account) => account.user_id === "lee");

  assert.equal(result.created, 1);
  assert.equal(result.updated, 1);
  assert.equal(result.errors.length, 0);
  assert.equal(kim.user_name, "김성준 수정");
  assert.equal(kim.role, "admin");
  assert.equal(verifyPassword("old", kim.password_hash), true);
  assert.equal(lee.role, "user");
  assert.equal(verifyPassword("pass1234", lee.password_hash), true);
});

test("auth service protects the last active super administrator account", async () => {
  const store = createAccountQueryStore([
    {
      id: "acct_super",
      is_active: 1,
      password_hash: createPasswordHash("1234"),
      role: "super_admin",
      user_id: "admin",
      user_name: "관리자",
    },
  ]);
  const authService = createAuthService({
    createHttpError,
    query: store.query,
  });

  await assert.rejects(
    () => authService.deleteAccount("acct_super"),
    /마지막 활성 슈퍼 관리자 계정/,
  );
  await assert.rejects(
    () =>
      authService.updateAccount("acct_super", {
        isActive: true,
        role: "admin",
        userName: "관리자",
      }),
    /마지막 활성 슈퍼 관리자 계정/,
  );
});

test("verifyPassword supports sha256 hashes with and without salt", () => {
  assert.equal(verifyPassword("secret", `sha256:${sha256Hex("secret")}`), true);
  assert.equal(verifyPassword("secret", `sha256:salt:${sha256Hex("salt:secret")}`), true);
  assert.equal(verifyPassword("wrong", `sha256:${sha256Hex("secret")}`), false);
});

test("auth service creates and resolves a signed session cookie", async () => {
  await withEnv(
    {
      EXAMLIST_AUTH_ENABLED: "true",
      EXAMLIST_SESSION_SECRET: "test-session-secret",
      EXAMLIST_USERS_JSON: JSON.stringify([
        {
          displayName: "템플릿 담당",
          passwordHash: `sha256:${sha256Hex("secret")}`,
          role: "admin",
          username: "manager",
        },
      ]),
    },
    async () => {
      const authService = createAuthService({ createHttpError });
      const loginResult = await authService.login({
        password: "secret",
        username: "manager",
      });

      assert.match(loginResult.cookie, new RegExp(`${sessionCookieName}=`));
      assert.equal(loginResult.role, "admin");
      assert.deepEqual(loginResult.user, {
        displayName: "템플릿 담당",
        role: "admin",
        userId: "manager",
        userName: "템플릿 담당",
        username: "manager",
      });

      const request = {
        headers: {
          cookie: loginResult.cookie.split(";")[0],
        },
      };
      const sessionState = authService.getSessionState(request);

      assert.equal(sessionState.authenticated, true);
      assert.equal(sessionState.role, "admin");
      assert.equal(authService.getRequestRoleForPermission(request), "admin");

      const logoutResult = authService.logout(request);

      assert.match(logoutResult.cookie, /Max-Age=0/);
      assert.equal(authService.getSessionState(request).authenticated, false);
    },
  );
});

test("auth service requires login when enabled and rejects invalid credentials", async () => {
  await withEnv(
    {
      EXAMLIST_AUTH_ENABLED: "true",
      EXAMLIST_SESSION_SECRET: "test-session-secret",
      EXAMLIST_USERS_JSON: JSON.stringify([
        {
          passwordHash: `sha256:${sha256Hex("secret")}`,
          role: "user",
          username: "generator",
        },
      ]),
    },
    async () => {
      const authService = createAuthService({ createHttpError });

      assert.throws(
        () => authService.getRequestRoleForPermission({ headers: {} }),
        /로그인이 필요합니다/,
      );
      await assert.rejects(
        () =>
          authService.login({
            password: "wrong",
            username: "generator",
          }),
        /아이디 또는 비밀번호가 올바르지 않습니다/,
      );
    },
  );
});

test("auth service logs in with an active database account", async () => {
  await withEnv(
    {
      EXAMLIST_AUTH_ENABLED: "true",
      EXAMLIST_SESSION_SECRET: "test-session-secret",
      EXAMLIST_USERS_JSON: "",
    },
    async () => {
      const queries = [];
      const authService = createAuthService({
        createHttpError,
        query: async (sql, params = []) => {
          queries.push({ params, sql });

          if (sql.includes("FROM admin_accounts")) {
            return [
              {
                id: "acct_test",
                is_active: 1,
                password_hash: createPasswordHash("secret", "salt"),
                role: "super_admin",
                user_id: "admin",
                user_name: "관리자",
              },
            ];
          }

          return [];
        },
      });

      const loginResult = await authService.login({
        password: "secret",
        username: "admin",
      });

      assert.equal(loginResult.user.username, "admin");
      assert.equal(loginResult.user.userId, "admin");
      assert.equal(loginResult.user.userName, "관리자");
      assert.equal(loginResult.role, "super_admin");
      assert.equal(queries.some((entry) => entry.sql.includes("last_login_at")), true);
    },
  );
});

test("auth service uses configured users without inserting default database accounts", async () => {
  await withEnv(
    {
      EXAMLIST_AUTH_ENABLED: "true",
      EXAMLIST_SESSION_SECRET: "test-session-secret",
      EXAMLIST_USERS_JSON: JSON.stringify([
        {
          displayName: "런타임 관리자",
          passwordHash: `sha256:${sha256Hex("secret")}`,
          role: "admin",
          username: "runtime-admin",
        },
      ]),
    },
    async () => {
      const queries = [];
      const authService = createAuthService({
        createHttpError,
        query: async (sql, params = []) => {
          queries.push({ params, sql });
          return [];
        },
      });

      const loginResult = await authService.login({
        password: "secret",
        username: "runtime-admin",
      });

      assert.equal(loginResult.user.userId, "runtime-admin");
      assert.equal(loginResult.role, "admin");
      assert.equal(queries.some((entry) => String(entry.sql).includes("INSERT INTO admin_accounts")), false);
    },
  );
});
