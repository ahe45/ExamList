const DEFAULT_MAX_BODY_BYTES = 50 * 1024 * 1024;

function createPayloadTooLargeError(message = "") {
  return Object.assign(new Error(message || "요청 본문이 너무 큽니다."), {
    errorCode: "PAYLOAD_TOO_LARGE",
    statusCode: 413,
  });
}

function normalizeMaxBodyBytes(value) {
  const normalizedValue = Number(value);

  if (Number.isFinite(normalizedValue) && normalizedValue > 0) {
    return Math.floor(normalizedValue);
  }

  return DEFAULT_MAX_BODY_BYTES;
}

function readRequestBody(request, options = {}) {
  const maxBodyBytes = normalizeMaxBodyBytes(options.maxBodyBytes);
  const tooLargeMessage = String(options.tooLargeMessage || "요청 본문이 너무 큽니다.").trim();

  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    let tooLarge = false;

    function rejectOnce(error) {
      if (settled) {
        return;
      }

      settled = true;
      chunks.length = 0;
      reject(error);
    }

    request.on("data", (chunk) => {
      if (tooLarge) {
        return;
      }

      size += chunk.length;

      if (size > maxBodyBytes) {
        tooLarge = true;
        rejectOnce(createPayloadTooLargeError(tooLargeMessage));
        return;
      }

      chunks.push(chunk);
    });

    request.on("end", () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(Buffer.concat(chunks));
    });
    request.on("error", (error) => rejectOnce(error));
  });
}

async function readJsonBody(request, options = {}) {
  const bodyBuffer = await readRequestBody(request, options);
  const bodyText = bodyBuffer.toString("utf8").trim();

  if (!bodyText) {
    return {};
  }

  try {
    return JSON.parse(bodyText);
  } catch (_error) {
    const parseError = new Error("JSON 형식이 올바르지 않습니다.");
    parseError.statusCode = 400;
    parseError.errorCode = "INVALID_JSON";
    throw parseError;
  }
}

function readBinaryBody(request, options = {}) {
  return readRequestBody(request, options);
}

module.exports = {
  DEFAULT_MAX_BODY_BYTES,
  readBinaryBody,
  readJsonBody,
  readRequestBody,
};
