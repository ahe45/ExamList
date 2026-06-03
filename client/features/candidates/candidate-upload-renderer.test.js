import test from "node:test";
import assert from "node:assert/strict";

import {
  renderCandidateUploadModal,
  renderCandidateUploadProgressOverlay,
} from "./candidate-upload-renderer.js";

test("candidate upload progress overlay uses the common busy overlay while keeping upload details", () => {
  const html = renderCandidateUploadProgressOverlay({
    upload: {
      progressOverlay: {
        detail: "candidates.xlsx",
        isIndeterminate: false,
        isOpen: true,
        message: "업로드 데이터를 저장하고 있습니다.",
        percent: 42,
        stageLabel: "파일 업로드",
        title: "수험생 데이터 업로드",
      },
    },
  });

  assert.match(html, /busy-overlay candidate-upload-progress-overlay/);
  assert.match(html, /busy-overlay-backdrop/);
  assert.match(html, /busy-overlay-panel/);
  assert.match(html, /busy-spinner/);
  assert.match(html, /파일 업로드/);
  assert.match(html, /수험생 데이터 업로드/);
  assert.match(html, /업로드 데이터를 저장하고 있습니다\./);
  assert.match(html, /candidates\.xlsx/);
  assert.match(html, /파일 크기 기준/);
  assert.match(html, /42%/);
  assert.match(html, /progress-bar/);
  assert.match(html, /style="width: 42%"/);
  assert.doesNotMatch(html, /candidate-upload-progress-card/);
  assert.doesNotMatch(html, /candidate-upload-progress-head/);
  assert.doesNotMatch(html, /candidate-upload-progress-meta/);
});

test("candidate photo preview progress uses the common busy overlay", () => {
  const html = renderCandidateUploadModal({
    upload: {
      existingDataPolicy: "insert-update",
      isOpen: true,
      mode: "photo-archive",
      photoFileName: "2027학년도 논술 수험생사진.zip",
      previewProgress: {
        detail: "2027학년도 논술 수험생사진.zip · 274.9MB / 610.9MB",
        isActive: true,
        isIndeterminate: false,
        message: "사진 ZIP을 전송하는 중입니다.",
        percent: 45,
      },
    },
  });

  assert.match(html, /busy-overlay candidate-preview-progress-overlay/);
  assert.match(html, /busy-overlay-backdrop/);
  assert.match(html, /busy-overlay-panel/);
  assert.match(html, /busy-spinner/);
  assert.match(html, /사진 ZIP을 전송하는 중입니다\./);
  assert.match(html, /2027학년도 논술 수험생사진\.zip · 274\.9MB \/ 610\.9MB/);
  assert.match(html, /파일 처리율/);
  assert.match(html, /45%/);
  assert.match(html, /progress-bar/);
  assert.match(html, /style="width: 45%"/);
  assert.doesNotMatch(html, /candidate-preview-progress-card/);
  assert.doesNotMatch(html, /candidate-upload-progress-track/);
});

test("candidate upload modal renders persistent error dialog", () => {
  const html = renderCandidateUploadModal({
    upload: {
      errorDialogOpen: true,
      errorMessage: "XLSX 데이터 셀은 텍스트 서식이어야 합니다. (2행, 시험날짜)",
      existingDataPolicy: "insert-update",
      isOpen: true,
      mode: "workbook",
    },
  });

  assert.match(html, /role="alertdialog"/);
  assert.match(html, /candidate-upload-error-modal/);
  assert.match(html, /수험생 데이터 업로드를 진행할 수 없습니다/);
  assert.match(html, /XLSX 데이터 셀은 텍스트 서식이어야 합니다\. \(2행, 시험날짜\)/);
  assert.match(html, /data-action="close-candidate-upload-error-modal"/);
});
