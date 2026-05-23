const test = require("node:test");
const assert = require("node:assert/strict");
const AdmZip = require("adm-zip");

const { createCandidatePhotoParser } = require("./photo-parser");

function createHttpError(statusCode, message, errorCode = "") {
  return Object.assign(new Error(message), { errorCode, statusCode });
}

function createParser() {
  return createCandidatePhotoParser({
    createHttpError,
    getCandidatePhotoMimeType(extension) {
      return extension === ".png" ? "image/png" : extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "";
    },
  });
}

function createZipBuffer() {
  const zip = new AdmZip();

  zip.addFile("photos/26010001.jpg", Buffer.from("fake-jpg"));
  zip.addFile("26010002.png", Buffer.from("fake-png"));

  return zip.toBuffer();
}

test("parseCandidatePhotoArchivePreviewBuffer recognizes photos without reading photo data", () => {
  const parser = createParser();
  const result = parser.parseCandidatePhotoArchivePreviewBuffer(createZipBuffer());
  const secondPhoto = result.photos.find((photo) => photo.examineeNo === "26010002");

  assert.equal(result.photos.length, 2);
  assert.deepEqual(
    result.photos.map((photo) => photo.examineeNo).sort(),
    ["26010001", "26010002"],
  );
  assert.equal(result.photos[0].fileBuffer, undefined);
  assert.equal(secondPhoto.mimeType, "image/png");
});

test("parseCandidatePhotoArchiveBuffer includes photo data for saving", () => {
  const parser = createParser();
  const result = parser.parseCandidatePhotoArchiveBuffer(createZipBuffer());
  const firstPhoto = result.photos.find((photo) => photo.examineeNo === "26010001");

  assert.equal(result.photos.length, 2);
  assert.equal(firstPhoto.fileBuffer.toString("utf8"), "fake-jpg");
});
