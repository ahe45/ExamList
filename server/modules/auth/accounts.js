const { normalizeRole, roleDefinitions } = require("../permissions/service");

const guestRole = "guest";

function normalizeConfiguredRole(value, fallbackRole = "user") {
  const normalizedRole = normalizeRole(value, fallbackRole);

  if (normalizedRole && roleDefinitions[normalizedRole] && normalizedRole !== guestRole) {
    return normalizedRole;
  }

  return fallbackRole;
}

function normalizePasswordHash(user = {}) {
  const passwordHash = String(user.passwordHash || "").trim();

  if (passwordHash) {
    return passwordHash;
  }

  const passwordSha256 = String(user.passwordSha256 || "").trim();

  return passwordSha256 ? `sha256:${passwordSha256}` : "";
}

function parseConfiguredUsers(rawUsers = "") {
  const rawText = String(rawUsers || "").trim();

  if (!rawText) {
    return [];
  }

  let parsedUsers;

  try {
    parsedUsers = JSON.parse(rawText);
  } catch (_error) {
    throw new Error("EXAMLIST_USERS_JSON 형식이 올바르지 않습니다.");
  }

  if (!Array.isArray(parsedUsers)) {
    throw new Error("EXAMLIST_USERS_JSON은 배열이어야 합니다.");
  }

  return parsedUsers
    .map((user) => {
      const username = String(user?.username || "").trim();
      const passwordHash = normalizePasswordHash(user);

      if (!username || !passwordHash) {
        return null;
      }

      return Object.freeze({
        displayName: String(user?.displayName || username).trim() || username,
        passwordHash,
        role: normalizeConfiguredRole(user?.role, "user"),
        username,
      });
    })
    .filter(Boolean);
}

function toSafeUser(user) {
  if (!user) {
    return null;
  }

  return Object.freeze({
    displayName: user.userName,
    role: user.role,
    userId: user.userId,
    userName: user.userName,
    username: user.userId,
  });
}

function normalizeAccountRow(row = {}) {
  if (!row) {
    return null;
  }

  const userId = String(row.user_id || row.userId || row.username || "").trim();

  if (!userId) {
    return null;
  }

  const userName = String(row.user_name || row.userName || row.display_name || row.displayName || userId).trim() || userId;

  return Object.freeze({
    displayName: userName,
    id: String(row.id || "").trim(),
    isActive: Number(row.is_active ?? row.isActive ?? 1) === 1,
    passwordHash: String(row.password_hash || row.passwordHash || "").trim(),
    role: normalizeConfiguredRole(row.role, "user"),
    userId,
    userName,
    username: userId,
  });
}

module.exports = {
  normalizeAccountRow,
  normalizeConfiguredRole,
  parseConfiguredUsers,
  toSafeUser,
};
