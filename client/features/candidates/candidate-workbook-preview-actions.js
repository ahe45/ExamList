import {
  arrayBufferToBase64,
  postJsonWithProgress,
  readFileAsArrayBuffer,
} from "./candidate-action-utils.js";
import {
  clearCandidateUploadErrorDialog,
  openCandidateUploadErrorDialog,
} from "./candidate-upload-error-state.js";
import {
  createFileProgressDetail,
  emptyCandidatePreviewProgress,
} from "./candidate-upload-progress.js";

export function createCandidateWorkbookPreviewActions({
  appState,
  ensureCandidateUploadState,
  getCurrentSchoolId,
  onStateChange,
  setCandidatePreviewProgress,
  waitForProgressPaint,
}) {
  async function previewWorkbookFile(file, options = {}) {
    const showProgress = options.showProgress !== false;

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      openCandidateUploadErrorDialog(appState.candidates.upload, "현재는 XLSX 파일만 업로드할 수 있습니다.");
      appState.candidates.upload.preview = null;
      if (showProgress) {
        ensureCandidateUploadState().previewProgress = { ...emptyCandidatePreviewProgress };
      }
      await onStateChange();
      return;
    }

    const upload = ensureCandidateUploadState();

    upload.dataFileName = file.name;
    upload.dataFile = file;
    clearCandidateUploadErrorDialog(upload);
    upload.preview = null;

    if (showProgress) {
      upload.previewProgress = {
        detail: file.name,
        isActive: true,
        isIndeterminate: false,
        message: "수험생 데이터 미리보기를 계산하는 중입니다.",
        percent: 0,
      };
    }

    await onStateChange();
    await waitForProgressPaint();

    try {
      const fileBuffer = await readFileAsArrayBuffer(file, {
        onProgress: (progress) => {
          if (showProgress) {
            void setCandidatePreviewProgress(
              {
                detail: createFileProgressDetail(file, progress),
                isActive: true,
                isIndeterminate: false,
                message: "파일을 읽는 중입니다.",
                percent: progress.percent,
              },
              { flush: false },
            );
          }
        },
      });

      if (showProgress) {
        await setCandidatePreviewProgress({
          detail: "파일 읽기가 완료되었습니다. 서버에서 미리보기 결과를 계산하고 있습니다.",
          isActive: true,
          isIndeterminate: true,
          message: "미리보기 데이터를 처리하는 중입니다.",
          percent: 100,
        });
      }

      const fileContentBase64 = arrayBufferToBase64(fileBuffer);
      const previewRequest = postJsonWithProgress(
        "/api/candidates/import/preview",
        {
          fileContentBase64,
          fileName: file.name,
          schoolId: getCurrentSchoolId(),
        },
        "수험생 데이터 미리보기를 생성할 수 없습니다.",
      );

      appState.candidates.upload.preview = await previewRequest;

      if (showProgress) {
        await setCandidatePreviewProgress({
          detail: "계산 결과를 화면에 반영하고 있습니다.",
          isActive: true,
          isIndeterminate: false,
          message: "미리보기 결과를 정리하는 중입니다.",
          percent: 100,
        });
      }

      clearCandidateUploadErrorDialog(appState.candidates.upload);
    } catch (error) {
      openCandidateUploadErrorDialog(appState.candidates.upload, error.message);
      appState.candidates.upload.preview = null;
    }

    if (showProgress) {
      ensureCandidateUploadState().previewProgress = { ...emptyCandidatePreviewProgress };
    }

    await onStateChange();
  }

  return Object.freeze({
    previewWorkbookFile,
  });
}
