const crypto = require("crypto");

function normalizeBoolean(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function createPasswordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  return `sha256:${salt}:${sha256Hex(`${salt}:${password}`)}`;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyPassword(password, passwordHash) {
  const normalizedPasswordHash = String(passwordHash || "").trim();
  const parts = normalizedPasswordHash.split(":");

  if (parts.length === 2 && parts[0] === "sha256") {
    return safeEqual(sha256Hex(password), parts[1]);
  }

  if (parts.length === 3 && parts[0] === "sha256") {
    return safeEqual(sha256Hex(`${parts[1]}:${password}`), parts[2]);
  }

  return false;
}

module.exports = {
  createPasswordHash,
  normalizeBoolean,
  safeEqual,
  sha256Hex,
  verifyPassword,
};
