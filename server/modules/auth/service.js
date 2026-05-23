const crypto = require("crypto");
const {
  createPasswordHash,
  normalizeBoolean,
  sha256Hex,
  verifyPassword,
} = require("./auth-utils");
const {
  normalizeAccountRow,
  normalizeConfiguredRole,
  parseConfiguredUsers,
} = require("./accounts");
const { createSessionService } = require("./session-service");
const { roleDefinitions } = require("../permissions/service");

const sessionCookieName = "examlist_session";

function createAuthService({ createHttpError, query }) {
  const authEnabled = normalizeBoolean(
    typeof process.env.EXAMLIST_AUTH_ENABLED === "undefined"
      ? "true"
      : process.env.EXAMLIST_AUTH_ENABLED,
  );
  const configuredUsers = parseConfiguredUsers(process.env.EXAMLIST_USERS_JSON || "");
  const queryDb = typeof query === "function" ? query : null;
  const sessionSecret =
    String(process.env.EXAMLIST_SESSION_SECRET || "").trim() || crypto.randomBytes(32).toString("hex");
  const sessionTtlHours = Math.min(Math.max(Number(process.env.EXAMLIST_SESSION_TTL_HOURS) || 8, 1), 24 * 14);
  const sessionTtlMs = sessionTtlHours * 60 * 60 * 1000;
  const cookieSecure = normalizeBoolean(process.env.EXAMLIST_SESSION_COOKIE_SECURE);
  const sessionService = createSessionService({
    authEnabled,
    cookieSecure,
    createHttpError,
    getDefaultRole,
    sessionCookieName,
    sessionSecret,
    sessionTtlMs,
  });

  function getDefaultRole() {
    return normalizeConfiguredRole(process.env.EXAMLIST_ROLE || process.env.EXAMLIST_DEFAULT_ROLE || "super_admin", "super_admin");
  }

  async function findAccountByUserId(userId) {
    const configuredUser = normalizeAccountRow(configuredUsers.find((candidate) => candidate.username === userId) || null);

    if (!queryDb) {
      return configuredUser;
    }

    const rows = await queryDb(
      `
        SELECT
          id,
          user_id,
          user_name,
          password_hash,
          role,
          is_active
        FROM admin_accounts
        WHERE user_id = ?
        LIMIT 1
      `,
      [userId],
    );

    return normalizeAccountRow(rows?.[0]) || configuredUser;
  }

  function toAccountSummary(account) {
    if (!account) {
      return null;
    }

    return Object.freeze({
      createdAt: account.createdAt || "",
      displayName: account.displayName || account.userName || account.userId,
      id: account.id || account.userId,
      isActive: account.isActive !== false,
      lastLoginAt: account.lastLoginAt || "",
      role: account.role,
      roleLabel: roleDefinitions[account.role]?.label || account.role,
      updatedAt: account.updatedAt || "",
      userId: account.userId,
      userName: account.userName || account.displayName || account.userId,
    });
  }

  function assertAccountStorageAvailable() {
    if (!queryDb) {
      throw createHttpError(503, "DB 계정 저장소가 필요합니다.", "ACCOUNT_STORAGE_UNAVAILABLE");
    }
  }

  function normalizeAccountPayload(payload = {}, options = {}) {
    const userId = String(payload.userId || payload.user_id || payload.username || "").trim();
    const userName = String(payload.userName || payload.user_name || payload.displayName || userId).trim() || userId;
    const password = String(payload.password || "");
    const role = normalizeConfiguredRole(payload.role, "user");
    const rawIsActive = payload.isActive ?? payload.is_active ?? true;
    const isActive = rawIsActive !== false && String(rawIsActive).toLowerCase() !== "false" && Number(rawIsActive) !== 0;

    if (!userId) {
      throw createHttpError(400, "아이디를 입력하세요.", "ACCOUNT_USER_ID_REQUIRED");
    }

    if (userId.length > 100) {
      throw createHttpError(400, "아이디는 100자 이하로 입력하세요.", "INVALID_ACCOUNT_USER_ID");
    }

    if (!userName) {
      throw createHttpError(400, "이름을 입력하세요.", "ACCOUNT_USER_NAME_REQUIRED");
    }

    if (userName.length > 120) {
      throw createHttpError(400, "이름은 120자 이하로 입력하세요.", "INVALID_ACCOUNT_USER_NAME");
    }

    if (options.requirePassword && !password.trim()) {
      throw createHttpError(400, "비밀번호를 입력하세요.", "ACCOUNT_PASSWORD_REQUIRED");
    }

    if (password && password.length > 200) {
      throw createHttpError(400, "비밀번호는 200자 이하로 입력하세요.", "INVALID_ACCOUNT_PASSWORD");
    }

    return Object.freeze({
      isActive,
      password,
      role,
      userId,
      userName,
    });
  }

  async function getAccountByIdentifier(accountId = "") {
    assertAccountStorageAvailable();

    const normalizedAccountId = String(accountId || "").trim();

    if (!normalizedAccountId) {
      throw createHttpError(400, "계정 식별자가 필요합니다.", "ACCOUNT_ID_REQUIRED");
    }

    const rows = await queryDb(
      `
        SELECT
          id,
          user_id AS userId,
          user_name AS userName,
          password_hash AS passwordHash,
          role,
          is_active AS isActive,
          last_login_at AS lastLoginAt,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM admin_accounts
        WHERE id = ? OR user_id = ?
        LIMIT 1
      `,
      [normalizedAccountId, normalizedAccountId],
    );
    const row = rows?.[0];
    const account = normalizeAccountRow(row);

    if (!account) {
      throw createHttpError(404, "계정을 찾을 수 없습니다.", "ACCOUNT_NOT_FOUND");
    }

    return Object.freeze({
      ...account,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || ""),
      lastLoginAt: row.lastLoginAt instanceof Date ? row.lastLoginAt.toISOString() : String(row.lastLoginAt || ""),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt || ""),
    });
  }

  async function countActiveSuperAdmins() {
    assertAccountStorageAvailable();

    const rows = await queryDb(
      `
        SELECT COUNT(*) AS total
        FROM admin_accounts
        WHERE role = 'super_admin'
          AND is_active = 1
      `,
    );

    return Number(rows?.[0]?.total) || 0;
  }

  async function assertCanRemoveSuperAdminProtection(existingAccount, nextAccount = {}) {
    const isProtectedAccount = existingAccount?.role === "super_admin" && existingAccount.isActive !== false;
    const nextRole = nextAccount.role || existingAccount?.role || "";
    const nextIsActive = typeof nextAccount.isActive === "boolean" ? nextAccount.isActive : existingAccount?.isActive !== false;
    const willRemainActiveSuperAdmin = nextRole === "super_admin" && nextIsActive;

    if (!isProtectedAccount || willRemainActiveSuperAdmin) {
      return;
    }

    if ((await countActiveSuperAdmins()) <= 1) {
      throw createHttpError(
        400,
        "마지막 활성 슈퍼 관리자 계정은 삭제하거나 권한을 변경할 수 없습니다.",
        "LAST_SUPER_ADMIN_REQUIRED",
      );
    }
  }

  function assertCanChangeCurrentAccount(existingAccount, nextAccount = {}, options = {}) {
    const currentUserId = String(options.currentUserId || "").trim();

    if (!currentUserId || existingAccount?.userId !== currentUserId) {
      return;
    }

    if (nextAccount.delete === true || nextAccount.role !== existingAccount.role || nextAccount.isActive === false) {
      throw createHttpError(
        400,
        "현재 로그인 중인 계정은 삭제하거나 권한/상태를 변경할 수 없습니다.",
        "CURRENT_ACCOUNT_PROTECTED",
      );
    }
  }

  async function listAccounts() {
    if (!queryDb) {
      const items = configuredUsers
        .map((user) => {
          const account = normalizeAccountRow(user);

          return account
            ? toAccountSummary({
                ...account,
                createdAt: "",
                lastLoginAt: "",
                updatedAt: "",
              })
            : null;
        })
        .filter(Boolean);

      return {
        items,
        total: items.length,
      };
    }

    const rows = await queryDb(
      `
        SELECT
          id,
          user_id AS userId,
          user_name AS userName,
          role,
          is_active AS isActive,
          last_login_at AS lastLoginAt,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM admin_accounts
        ORDER BY FIELD(role, 'super_admin', 'admin', 'user'), user_name ASC, user_id ASC
      `,
    );
    const items = (Array.isArray(rows) ? rows : [])
      .map((row) => {
        const account = normalizeAccountRow(row);

        return account
          ? toAccountSummary({
              ...account,
              createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || ""),
              lastLoginAt: row.lastLoginAt instanceof Date ? row.lastLoginAt.toISOString() : String(row.lastLoginAt || ""),
              updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt || ""),
            })
          : null;
      })
      .filter(Boolean);

    return {
      items,
      total: items.length,
    };
  }

  async function createAccount(payload = {}) {
    assertAccountStorageAvailable();

    const account = normalizeAccountPayload(payload, { requirePassword: true });
    const accountId = `admin-account-${crypto.randomUUID()}`;

    await queryDb(
      `
        INSERT INTO admin_accounts (
          id,
          user_id,
          user_name,
          password_hash,
          role,
          is_active
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        accountId,
        account.userId,
        account.userName,
        createPasswordHash(account.password),
        account.role,
        account.isActive ? 1 : 0,
      ],
    );

    return toAccountSummary(await getAccountByIdentifier(accountId));
  }

  async function updateAccount(accountId = "", payload = {}, options = {}) {
    assertAccountStorageAvailable();

    const existingAccount = await getAccountByIdentifier(accountId);
    const normalizedPayload = normalizeAccountPayload(
      {
        isActive: typeof payload.isActive === "undefined" ? existingAccount.isActive : payload.isActive,
        password: payload.password || "",
        role: typeof payload.role === "undefined" ? existingAccount.role : payload.role,
        userId: existingAccount.userId,
        userName: typeof payload.userName === "undefined" ? existingAccount.userName : payload.userName,
      },
      { requirePassword: false },
    );

    await assertCanRemoveSuperAdminProtection(existingAccount, normalizedPayload);
    assertCanChangeCurrentAccount(existingAccount, normalizedPayload, options);

    const setClauses = [
      "user_name = ?",
      "role = ?",
      "is_active = ?",
      "updated_at = CURRENT_TIMESTAMP",
    ];
    const params = [
      normalizedPayload.userName,
      normalizedPayload.role,
      normalizedPayload.isActive ? 1 : 0,
    ];

    if (normalizedPayload.password.trim()) {
      setClauses.unshift("password_hash = ?");
      params.unshift(createPasswordHash(normalizedPayload.password));
    }

    params.push(existingAccount.id || existingAccount.userId);

    await queryDb(
      `
        UPDATE admin_accounts
        SET ${setClauses.join(", ")}
        WHERE id = ?
      `,
      params,
    );

    return toAccountSummary(await getAccountByIdentifier(existingAccount.id || existingAccount.userId));
  }

  async function deleteAccount(accountId = "", options = {}) {
    assertAccountStorageAvailable();

    const existingAccount = await getAccountByIdentifier(accountId);

    await assertCanRemoveSuperAdminProtection(existingAccount, {
      isActive: false,
      role: existingAccount.role,
    });
    assertCanChangeCurrentAccount(existingAccount, {
      delete: true,
      isActive: false,
      role: existingAccount.role,
    }, options);

    await queryDb(
      `
        DELETE FROM admin_accounts
        WHERE id = ?
      `,
      [existingAccount.id || existingAccount.userId],
    );

    return {
      deleted: true,
      account: toAccountSummary(existingAccount),
    };
  }

  async function touchLastLogin(userId) {
    if (!queryDb) {
      return;
    }

    await queryDb(
      `
        UPDATE admin_accounts
        SET last_login_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `,
      [userId],
    );
  }

  async function login(payload = {}) {
    if (!authEnabled) {
      throw createHttpError(400, "로그인 기능이 비활성화되어 있습니다.", "AUTH_DISABLED");
    }

    if (!queryDb && !configuredUsers.length) {
      throw createHttpError(503, "로그인 계정이 설정되지 않았습니다.", "AUTH_USERS_NOT_CONFIGURED");
    }

    const userId = String(payload.userId || payload.user_id || payload.username || "").trim();
    const password = String(payload.password || "");

    if (!userId || !password) {
      throw createHttpError(400, "아이디와 비밀번호를 입력하세요.", "INVALID_LOGIN_REQUEST");
    }

    const user = await findAccountByUserId(userId);

    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      throw createHttpError(401, "아이디 또는 비밀번호가 올바르지 않습니다.", "INVALID_CREDENTIALS");
    }

    await touchLastLogin(userId);

    return sessionService.createSession(user);
  }

  return Object.freeze({
    createAccount,
    deleteAccount,
    getRequestRoleForPermission: sessionService.getRequestRoleForPermission,
    getSessionState: sessionService.getSessionState,
    isEnabled: () => authEnabled,
    listAccounts,
    login,
    logout: sessionService.logout,
    updateAccount,
  });
}

module.exports = {
  createPasswordHash,
  createAuthService,
  parseConfiguredUsers,
  sessionCookieName,
  sha256Hex,
  verifyPassword,
};
