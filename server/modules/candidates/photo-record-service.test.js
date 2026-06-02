const test = require("node:test");
const assert = require("node:assert/strict");

const { createCandidatePhotoRecordService } = require("./photo-record-service");

function createHttpError(statusCode, message, errorCode = "") {
  return Object.assign(new Error(message), { errorCode, statusCode });
}

test("saveCandidatePhoto applies the photo to every row with the same examinee number", async () => {
  const persisted = [];
  const queries = [];
  const service = createCandidatePhotoRecordService({
    buildStoredCandidatePhotoFileRecord: (photo) => ({
      fileName: `${photo.examineeNo}.jpg`,
      mimeType: "image/jpeg",
    }),
    createHttpError,
    parseCandidatePhotoFile: (_fileName, _fileBuffer, options) => ({
      examineeNo: options.expectedExamineeNo,
    }),
    persistStoredCandidatePhotoFile: async (photo) => {
      persisted.push(photo);
    },
    query: async (sql, params) => {
      queries.push({ params, sql });

      if (sql.includes("SELECT id")) {
        return [{ examineeNo: "260100001", id: "candidate-1", schoolId: "school-1" }];
      }

      return [];
    },
    readStoredCandidatePhotoFile: async () => null,
  });

  const result = await service.saveCandidatePhoto("candidate-1", {
    fileContentBase64: Buffer.from("photo").toString("base64"),
    fileName: "260100001.jpg",
    schoolId: "school-1",
  });
  const updateQuery = queries.find((entry) => entry.sql.includes("UPDATE candidate_records"));

  assert.equal(result.id, "candidate-1");
  assert.equal(persisted.length, 1);
  assert.match(updateQuery.sql, /WHERE examinee_no = \?/);
  assert.deepEqual(updateQuery.params, ["260100001.jpg", "image/jpeg", "260100001", "school-1"]);
});
