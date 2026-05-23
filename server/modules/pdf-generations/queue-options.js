const defaultQueueName = "examlist-pdf-generation";

function normalizeProgressPercent(value, fallback = 0) {
  const parsedValue = Math.round(Number(value));

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, 0), 100);
}

function normalizeRetryAttempts(value, fallback = 2) {
  const parsedValue = Math.round(Number(value));

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, 1), 5);
}

function normalizeGenerationChunkSize(value, fallback = 500) {
  const parsedValue = Math.round(Number(value));

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, 50), 5000);
}

function normalizeRetentionDays(value, fallback = 30) {
  const parsedValue = Math.round(Number(value));

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, 0), 3650);
}

function calculateExpiryDate(createdAt = new Date(), retentionDays = 30) {
  const normalizedRetentionDays = normalizeRetentionDays(retentionDays);

  if (normalizedRetentionDays <= 0) {
    return null;
  }

  const expiryDate = new Date(createdAt);
  expiryDate.setDate(expiryDate.getDate() + normalizedRetentionDays);

  return expiryDate;
}

function resolveQueueDriver() {
  const configuredDriver = String(process.env.PDF_QUEUE_DRIVER || "").trim().toLowerCase();

  if (configuredDriver) {
    return configuredDriver;
  }

  return String(process.env.REDIS_URL || "").trim() ? "bullmq" : "memory";
}

module.exports = {
  calculateExpiryDate,
  defaultQueueName,
  normalizeGenerationChunkSize,
  normalizeProgressPercent,
  normalizeRetentionDays,
  normalizeRetryAttempts,
  resolveQueueDriver,
};
