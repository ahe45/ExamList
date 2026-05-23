import { formatCount } from "../../app/number-format.js";

export function toQueryString(filters = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== null && typeof value !== "undefined") {
      searchParams.set(key, value);
    }
  });

  return searchParams.toString();
}

export function triggerBlobDownload(blob, fileName) {
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = downloadUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

function getUploadProgressPayload(event) {
  const loaded = Number(event?.loaded || 0);
  const total = Number(event?.total || 0);
  const percent = event?.lengthComputable && total > 0 ? Math.round((loaded / total) * 100) : 0;

  return {
    lengthComputable: Boolean(event?.lengthComputable),
    loaded,
    percent,
    total,
  };
}

function parseJsonResponseText(responseText = "") {
  if (!String(responseText || "").trim()) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch (_error) {
    return null;
  }
}

function requestJsonWithUploadProgress({
  body,
  contentType = "application/json",
  fallbackMessage = "요청 처리에 실패했습니다.",
  onUploadProgress,
  url,
} = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", url);
    xhr.responseType = "text";
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.addEventListener("progress", (event) => {
      if (typeof onUploadProgress === "function") {
        onUploadProgress(getUploadProgressPayload(event));
      }
    });
    xhr.addEventListener("load", () => {
      const payload = parseJsonResponseText(xhr.responseText);

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(getJsonErrorMessage(payload, fallbackMessage)));
        return;
      }

      resolve(payload || {});
    });
    xhr.addEventListener("error", () => reject(new Error(fallbackMessage)));
    xhr.addEventListener("abort", () => reject(new Error(fallbackMessage)));
    xhr.send(body);
  });
}

export function readFileAsArrayBuffer(file, options = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error("파일을 읽는 중 오류가 발생했습니다.")));
    reader.addEventListener("progress", (event) => {
      if (typeof options.onProgress === "function") {
        options.onProgress(getUploadProgressPayload(event));
      }
    });
    reader.readAsArrayBuffer(file);
  });
}

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return window.btoa(binary);
}

export function getJsonErrorMessage(payload, fallbackMessage) {
  return payload?.message || payload?.error || fallbackMessage;
}

export async function fetchBlob(url, options = {}, fallbackMessage = "파일을 다운로드할 수 없습니다.") {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
  });
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    const payload = contentType.includes("application/json") ? await response.json() : await response.text();
    throw new Error(getJsonErrorMessage(payload, fallbackMessage));
  }

  return response.blob();
}

export async function postBinaryJson(url, file, fallbackMessage) {
  let response;

  try {
    response = await fetch(url, {
      body: file,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/zip",
      },
      method: "POST",
    });
  } catch (_error) {
    throw new Error(fallbackMessage || "파일을 업로드할 수 없습니다.");
  }

  const payload = (response.headers.get("content-type") || "").includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(getJsonErrorMessage(payload, fallbackMessage));
  }

  return payload || {};
}

export function postJsonWithProgress(url, body, fallbackMessage, options = {}) {
  if (typeof XMLHttpRequest === "undefined") {
    return fetch(url, {
      body: JSON.stringify(body || {}),
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }).then(async (response) => {
      const payload = (response.headers.get("content-type") || "").includes("application/json")
        ? await response.json()
        : null;

      if (!response.ok) {
        throw new Error(getJsonErrorMessage(payload, fallbackMessage));
      }

      return payload || {};
    });
  }

  return requestJsonWithUploadProgress({
    body: JSON.stringify(body || {}),
    contentType: "application/json",
    fallbackMessage,
    onUploadProgress: options.onUploadProgress,
    url,
  });
}

export function postBinaryJsonWithProgress(url, file, fallbackMessage, options = {}) {
  if (typeof XMLHttpRequest === "undefined") {
    return postBinaryJson(url, file, fallbackMessage);
  }

  return requestJsonWithUploadProgress({
    body: file,
    contentType: "application/zip",
    fallbackMessage,
    onUploadProgress: options.onUploadProgress,
    url,
  });
}

export function normalizeCandidateDraftRecord(row = {}) {
  return {
    admission: String(row.admission || row.admissionTypeName || "").trim(),
    admissionYear: String(row.admissionYear || "").trim(),
    admissionCode: String(row.admissionCode || row.admissionTypeCode || "").trim(),
    birth: String(row.birth || row.birthDate || "").trim(),
    building: String(row.building || row.buildingName || "").trim(),
    buildingCode: String(row.buildingCode || "").trim(),
    campus: String(row.campus || row.campusName || "").trim(),
    campusCode: String(row.campusCode || "").trim(),
    date: String(row.date || row.examDate || "").trim(),
    designatedSort: String(row.designatedSort || "").trim(),
    examineeNo: String(row.examineeNo || row.examNo || "").trim(),
    group: String(row.group || row.groupName || "").trim(),
    major: String(row.major || row.majorName || "").trim(),
    majorCode: String(row.majorCode || "").trim(),
    name: String(row.name || "").trim(),
    opt1: String(row.opt1 || "").trim(),
    opt2: String(row.opt2 || "").trim(),
    opt3: String(row.opt3 || "").trim(),
    opt4: String(row.opt4 || "").trim(),
    opt5: String(row.opt5 || "").trim(),
    period: String(row.period || row.periodName || "").trim(),
    periodCode: String(row.periodCode || "").trim(),
    room: String(row.room || row.roomName || "").trim(),
    roomCode: String(row.roomCode || row.roomId || "").trim(),
    series: String(row.series || row.raw?.series || "").trim(),
    seriesCode: String(row.seriesCode || "").trim(),
    temporaryNo: String(row.temporaryNo || "").trim(),
    time: String(row.time || row.examStartTime || "").trim(),
    endTime: String(row.endTime || row.examEndTime || "").trim(),
    track: String(row.track || row.examName || "").trim(),
    unit: String(row.unit || row.departmentName || "").trim(),
    unitCode: String(row.unitCode || row.departmentCode || "").trim(),
  };
}

export function createUploadResultMessage(result = {}) {
  const processed = Number(result.processed || 0);
  const photoUploaded = Number(result.photoUploaded || 0);
  const photoSkipped = Number(result.photoSkipped || 0);
  const messages = [];

  if (processed > 0) {
    messages.push(`${formatCount(processed)}건의 수험생 데이터를 저장했습니다.`);
  }

  if (photoUploaded > 0) {
    messages.push(`사진 ${formatCount(photoUploaded)}건을 매칭했습니다.`);
  }

  if (photoSkipped > 0) {
    messages.push(`${formatCount(photoSkipped)}건은 미등록 수험번호, 잘못된 파일명/형식 또는 중복 파일로 건너뛰었습니다.`);
  }

  return messages.join(" ") || "업로드를 완료했습니다.";
}
