export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ApiError";
    this.errorCode = options.errorCode || "";
    this.statusCode = options.statusCode || 0;
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: options.credentials || "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(payload?.message || "요청 처리에 실패했습니다.", {
      errorCode: payload?.errorCode || "",
      statusCode: response.status,
    });
  }

  return payload;
}

export function getJson(url) {
  return requestJson(url, { method: "GET" });
}

export function postJson(url, body) {
  return requestJson(url, {
    method: "POST",
    body: JSON.stringify(body || {}),
  });
}

export function patchJson(url, body) {
  return requestJson(url, {
    method: "PATCH",
    body: JSON.stringify(body || {}),
  });
}

export function deleteJson(url, body = null) {
  return requestJson(url, {
    method: "DELETE",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
