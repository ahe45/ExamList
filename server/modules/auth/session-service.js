const crypto = require("crypto");

const { safeEqual } = require("./auth-utils");
const { toSafeUser } = require("./accounts");
const { parseCookies } = require("./cookies");

const guestRole = "guest";

function createSessionService({
  authEnabled,
  cookieSecure,
  createHttpError,
  getDefaultRole,
  sessionCookieName,
  sessionSecret,
  sessionTtlMs,
}) {
  const sessions = new Map();

  function signSessionId(sessionId) {
    return crypto.createHmac("sha256", sessionSecret).update(sessionId).digest("hex");
  }

  function createSignedSessionValue(sessionId) {
    return `${sessionId}.${signSessionId(sessionId)}`;
  }

  function verifySignedSessionValue(value) {
    const [sessionId, signature] = String(value || "").split(".");

    if (!sessionId || !signature || !safeEqual(signSessionId(sessionId), signature)) {
      return "";
    }

    return sessionId;
  }

  function buildCookie(value, maxAgeSeconds) {
    const cookieParts = [
      `${sessionCookieName}=${encodeURIComponent(value)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${maxAgeSeconds}`,
    ];

    if (cookieSecure) {
      cookieParts.push("Secure");
    }

    return cookieParts.join("; ");
  }

  function buildClearCookie() {
    return buildCookie("", 0);
  }

  function getSessionFromRequest(request) {
    if (!authEnabled) {
      return null;
    }

    const cookies = parseCookies(request?.headers?.cookie || "");
    const sessionId = verifySignedSessionValue(cookies[sessionCookieName] || "");

    if (!sessionId) {
      return null;
    }

    const session = sessions.get(sessionId);

    if (!session) {
      return null;
    }

    if (session.expiresAtMs <= Date.now()) {
      sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  function getSessionState(request) {
    const session = getSessionFromRequest(request);

    return Object.freeze({
      authenticated: Boolean(session),
      enabled: authEnabled,
      role: session?.role || (authEnabled ? guestRole : getDefaultRole()),
      user: session?.user || null,
    });
  }

  function getRequestRoleForPermission(request) {
    if (!authEnabled) {
      return getDefaultRole();
    }

    const session = getSessionFromRequest(request);

    if (!session) {
      throw createHttpError(401, "로그인이 필요합니다.", "UNAUTHORIZED");
    }

    return session.role;
  }

  function createSession(user) {
    const sessionId = crypto.randomBytes(32).toString("hex");
    const expiresAtMs = Date.now() + sessionTtlMs;
    const safeUser = toSafeUser(user);

    sessions.set(sessionId, {
      expiresAtMs,
      role: user.role,
      user: safeUser,
    });

    return Object.freeze({
      cookie: buildCookie(createSignedSessionValue(sessionId), Math.floor(sessionTtlMs / 1000)),
      expiresAt: new Date(expiresAtMs).toISOString(),
      role: user.role,
      user: safeUser,
    });
  }

  function logout(request) {
    const cookies = parseCookies(request?.headers?.cookie || "");
    const sessionId = verifySignedSessionValue(cookies[sessionCookieName] || "");

    if (sessionId) {
      sessions.delete(sessionId);
    }

    return Object.freeze({
      cookie: buildClearCookie(),
    });
  }

  return Object.freeze({
    createSession,
    getRequestRoleForPermission,
    getSessionState,
    logout,
  });
}

module.exports = {
  createSessionService,
};
