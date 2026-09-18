const { randomUUID } = require("node:crypto");
function createOperationService({ query }) {
  let previous = Promise.resolve();
  let pending = 0;
  async function recover() {
    await query("UPDATE operation_jobs SET status = 'failed', error_message = ? WHERE status IN ('queued', 'running')", ["서버가 재시작되어 작업이 중단되었습니다. 반영 결과를 확인한 후 다시 실행해 주세요."]);
    await query("DELETE FROM operation_jobs WHERE updated_at < DATE_SUB(NOW(), INTERVAL 7 DAY) AND status IN ('completed', 'failed')");
  }
  async function submit({ ownerId, schoolId = "", kind }, task) {
    if (pending >= 20) throw Object.assign(new Error("처리 대기 중인 작업이 많습니다. 잠시 후 다시 시도해 주세요."), { statusCode: 429 });
    pending++;
    const id = randomUUID();
    try { await query("INSERT INTO operation_jobs (id, owner_id, school_id, kind, status) VALUES (?, ?, ?, ?, 'queued')", [id, ownerId, schoolId, kind]); }
    catch (error) { pending--; throw error; }
    const run = previous.then(async () => {
      let progressWrite = Promise.resolve();
      let lastProgressAt = 0;
      const onProgress = ({ processed = 0, total = 0 }) => {
        if (Date.now() - lastProgressAt < 250 && processed < total) return progressWrite;
        lastProgressAt = Date.now();
        progressWrite = progressWrite.then(() => query("UPDATE operation_jobs SET processed = ?, total = ? WHERE id = ? AND status = 'running'", [Math.max(0, processed), Math.max(0, total), id]));
        return progressWrite;
      };
      try {
        await query("UPDATE operation_jobs SET status = 'running' WHERE id = ?", [id]);
        const result = await task(onProgress);
        await progressWrite;
        await query("UPDATE operation_jobs SET status = 'completed', result_json = ?, processed = total WHERE id = ?", [JSON.stringify(result), id]);
      } catch (error) {
        await progressWrite.catch(() => {});
        await query("UPDATE operation_jobs SET status = 'failed', error_message = ? WHERE id = ?", [String(error.message || "작업을 완료하지 못했습니다.").slice(0, 2000), id]);
      } finally { pending--; }
    });
    previous = run.catch(error => console.error("[operation]", error.message));
    return { jobId: id, status: "queued" };
  }
  async function get(id, ownerId) {
    const rows = await query("SELECT id AS jobId, kind, status, processed, total, result_json AS resultJson, error_message AS errorMessage FROM operation_jobs WHERE id = ? AND owner_id = ?", [id, ownerId]);
    if (!rows.length) throw Object.assign(new Error("작업을 찾을 수 없습니다."), { statusCode: 404 });
    const { resultJson, ...row } = rows[0];
    return { ...row, result: resultJson ? JSON.parse(resultJson) : null };
  }
  return { submit, get, recover };
}
module.exports = { createOperationService };
