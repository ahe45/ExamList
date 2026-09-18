const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const TTL = 30 * 60 * 1000;
function createWorkbookSessionStore(rootDir) {
  const directory = path.join(rootDir, "storage", "upload-sessions", "workbooks");
  const tokenPattern = /^[a-f0-9-]{36}$/i;
  const error = () => Object.assign(new Error("엑셀 미리보기가 만료되었거나 유효하지 않습니다. 파일을 다시 선택해 주세요."), { statusCode: 400 });
  async function put(rows, schoolId, ownerId = "") {
    await fs.mkdir(directory, { recursive: true });
    for (const file of await fs.readdir(directory)) {
      if (!file.endsWith(".json") || !tokenPattern.test(file.slice(0, -5))) continue;
      const filePath = path.join(directory, file);
      const stat = await fs.stat(filePath).catch(() => null);
      if (stat && Date.now() - stat.mtimeMs > TTL) await fs.unlink(filePath).catch(() => {});
    }
    const token = randomUUID();
    await fs.writeFile(path.join(directory, token + ".json"), JSON.stringify({ rows, schoolId, ownerId, expiresAt: Date.now() + TTL }), { flag: "wx", mode: 0o600 });
    return token;
  }
  async function get(token, schoolId, ownerId = "") {
    if (!tokenPattern.test(String(token || ""))) throw error();
    let data; try { data = JSON.parse(await fs.readFile(path.join(directory, token + ".json"), "utf8")); } catch { throw error(); }
    if (data.expiresAt < Date.now() || data.schoolId !== schoolId || data.ownerId !== ownerId || !Array.isArray(data.rows)) throw error();
    return data.rows;
  }
  async function remove(token) {
    if (tokenPattern.test(String(token || ""))) await fs.unlink(path.join(directory, token + ".json")).catch(() => {});
  }
  return { put, get, remove };
}
module.exports = { createWorkbookSessionStore };
