import { showToast } from "../../app/toast.js";
import { postBinaryJsonWithProgress } from "./candidate-action-utils.js";
import {
  createFileProgressDetail,
  emptyCandidatePreviewProgress,
} from "./candidate-upload-progress.js";

export function createCandidatePhotoArchivePreviewActions({
  appState,
  ensureCandidateUploadState,
  onStateChange,
  setCandidatePreviewProgress,
  waitForProgressPaint,
}) {
  async function previewPhotoArchiveFile(file, options = {}) {
    const showProgress = options.showProgress !== false;

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".zip")) {
      appState.candidates.upload.errorMessage = "수험생 사진은 ZIP 파일로만 업로드할 수 있습니다.";
      appState.candidates.upload.photoPreview = null;
      if (showProgress) {
        ensureCandidateUploadState().previewProgress = { ...emptyCandidatePreviewProgress };
      }
      showToast(appState.candidates.upload.errorMessage, { tone: "warning" });
      await onStateChange();
      return;
    }

    const upload = ensureCandidateUploadState();

    upload.photoFileName = file.name;
    upload.photoFile = file;
    upload.errorMessage = "";
    upload.photoPreview = null;

    if (showProgress) {
      upload.previewProgress = {
        detail: file.name,
        isActive: true,
        isIndeterminate: false,
        message: "사진 ZIP을 전송하는 중입니다.",
        percent: 0,
      };
    }

    await onStateChange();
    await waitForProgressPaint();

    try {
      const previewRequest = postBinaryJsonWithProgress(
        "/api/candidates/photo-archive/preview",
        file,
        "수험생 사진 미리보기를 생성할 수 없습니다.",
        {
          onUploadProgress: (progress) => {
            if (showProgress) {
              void setCandidatePreviewProgress(
                {
                  detail: createFileProgressDetail(file, progress),
                  isActive: true,
                  isIndeterminate: progress.percent >= 100,
                  message: progress.percent >= 100
                    ? "사진 매칭 결과를 처리하는 중입니다."
                    : "사진 ZIP을 전송하는 중입니다.",
                  percent: progress.percent,
                },
                { flush: false },
              );
            }
          },
        },
      );

      appState.candidates.upload.photoPreview = await previewRequest;

      if (showProgress) {
        await setCandidatePreviewProgress({
          detail: "계산 결과를 화면에 반영하고 있습니다.",
          isActive: true,
          isIndeterminate: false,
          message: "미리보기 결과를 정리하는 중입니다.",
          percent: 100,
        });
      }

      appState.candidates.upload.errorMessage = "";
    } catch (error) {
      appState.candidates.upload.errorMessage = error.message;
      appState.candidates.upload.photoPreview = null;
      showToast(appState.candidates.upload.errorMessage, { tone: "error" });
    }

    if (showProgress) {
      ensureCandidateUploadState().previewProgress = { ...emptyCandidatePreviewProgress };
    }

    await onStateChange();
  }

  return Object.freeze({
    previewPhotoArchiveFile,
  });
}
