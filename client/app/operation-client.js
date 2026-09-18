import { getJson, postJson } from "./api-client.js";
export async function waitForOperation(payload, onProgress = async () => {}) {
  if (!payload?.jobId) return payload;
  let failures = 0;
  for (;;) {
    let job;
    try { job = await getJson("/api/operations/" + encodeURIComponent(payload.jobId)); failures = 0; }
    catch (error) {
      if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404 || ++failures > 10) {
        throw new Error(error.message + " (작업 번호: " + payload.jobId + ")");
      }
      await new Promise(resolve => setTimeout(resolve, 2000)); continue;
    }
    await onProgress(job);
    if (job.status === "completed") return job.result;
    if (job.status === "failed") throw new Error(job.errorMessage || "작업을 완료하지 못했습니다.");
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
export async function postOperation(url, body, onProgress) {
  return waitForOperation(await postJson(url, { ...body, async: true }), onProgress);
}
