import { showToast } from "../../app/toast.js";
import {
  arrayBufferToBase64,
  createUploadResultMessage,
  postBinaryJsonWithProgress,
  postJsonWithProgress,
  readFileAsArrayBuffer,
} from "./candidate-action-utils.js";
import {
  createFileProgressDetail,
  emptyCandidateUploadProgressOverlay,
} from "./candidate-upload-progress.js";

export function createCandidateUploadSubmitActions({
  appState,
  canManageCandidates,
  ensureCandidateUploadState,
  getCurrentSchoolId,
  loadCandidates,
  onStateChange,
  previewWorkbookFile,
  setCandidateUploadProgressOverlay,
  waitForProgressPaint,
}) {
  async function uploadSelectedCandidateFile() {
    if (!canManageCandidates() || appState.candidates.upload.isUploading) {
      return;
    }

    const upload = ensureCandidateUploadState();
    const mode = upload.mode === "photo-archive" ? "photo-archive" : "workbook";
    const file = mode === "photo-archive" ? upload.photoFile : upload.dataFile;

    if (!file) {
      upload.errorMessage = mode === "photo-archive" ? "사진 ZIP 파일을 먼저 선택하세요." : "XLSX 파일을 먼저 선택하세요.";
      showToast(upload.errorMessage, { tone: "warning" });
      await onStateChange();
      return;
    }

    upload.isUploading = true;
    upload.errorMessage = "";
    upload.successMessage = "";
    upload.progressOverlay = {
      ...emptyCandidateUploadProgressOverlay,
      detail: file.name,
      isOpen: true,
      isIndeterminate: false,
      message: "파일 전송을 준비하는 중입니다.",
      percent: 0,
      stageLabel: "준비",
      title: mode === "photo-archive" ? "수험생 사진 업로드" : "수험생 데이터 업로드",
    };
    await onStateChange();
    await waitForProgressPaint();

    try {
      let result;

      if (mode === "photo-archive") {
        await setCandidateUploadProgressOverlay({
          detail: createFileProgressDetail(file, { percent: 0 }),
          isIndeterminate: false,
          isOpen: true,
          message: "사진 ZIP을 서버로 전송하는 중입니다.",
          percent: 0,
          stageLabel: "파일 전송",
        });

        const uploadRequest = postBinaryJsonWithProgress(
          "/api/candidates/photo-archive",
          file,
          "사진 ZIP을 업로드할 수 없습니다.",
          {
            onUploadProgress: (progress) => {
              void setCandidateUploadProgressOverlay(
                {
                  detail: createFileProgressDetail(file, progress),
                  isOpen: true,
                  isIndeterminate: progress.percent >= 100,
                  message: progress.percent >= 100
                    ? "데이터 처리 중입니다."
                    : "사진 ZIP을 서버로 전송하는 중입니다.",
                  percent: progress.percent,
                  stageLabel: progress.percent >= 100 ? "데이터 처리 중" : "파일 전송",
                },
                { flush: false },
              );
            },
          },
        );

        result = await uploadRequest;
      } else {
        if (!upload.preview) {
          await setCandidateUploadProgressOverlay({
            detail: "업로드 전에 신규, 수정, 동일 건수를 계산합니다.",
            isIndeterminate: true,
            isOpen: true,
            message: "반영 대상을 확인하는 중입니다.",
            percent: 0,
            stageLabel: "미리보기",
          });
          await previewWorkbookFile(file, { showProgress: false });
        }

        if (!upload.preview) {
          throw new Error(upload.errorMessage || "업로드 미리보기를 먼저 확인하세요.");
        }

        await setCandidateUploadProgressOverlay({
          detail: createFileProgressDetail(file, { percent: 0 }),
          isOpen: true,
          isIndeterminate: false,
          message: "업로드 파일을 읽는 중입니다.",
          percent: 0,
          stageLabel: "파일 처리",
        });

        const fileBuffer = await readFileAsArrayBuffer(file, {
          onProgress: (progress) => {
            void setCandidateUploadProgressOverlay(
              {
                detail: createFileProgressDetail(file, progress),
                isOpen: true,
                isIndeterminate: false,
                message: "업로드 파일을 읽는 중입니다.",
                percent: progress.percent,
                stageLabel: "파일 처리",
              },
              { flush: false },
            );
          },
        });

        await setCandidateUploadProgressOverlay({
          detail: "파일 읽기가 완료되었습니다. 서버에서 수험생 데이터를 저장하고 있습니다.",
          isOpen: true,
          isIndeterminate: true,
          message: "데이터 처리 중입니다.",
          percent: 100,
          stageLabel: "데이터 처리 중",
        });

        const fileContentBase64 = arrayBufferToBase64(fileBuffer);
        result = await postJsonWithProgress(
          "/api/candidates/import",
          {
            existingDataPolicy: upload.existingDataPolicy,
            fileContentBase64,
            fileName: file.name,
            schoolId: getCurrentSchoolId(),
          },
          "수험생 데이터를 업로드할 수 없습니다.",
        );
      }

      const successMessage = createUploadResultMessage(result);

      upload.successMessage = successMessage;
      upload.errorMessage = "";
      await setCandidateUploadProgressOverlay({
        detail: successMessage,
        isIndeterminate: true,
        isOpen: true,
        message: "업로드 결과를 목록에 반영하는 중입니다.",
        percent: 100,
        stageLabel: "목록 갱신",
      });
      await loadCandidates();
      upload.isOpen = false;
      upload.dataFile = null;
      upload.preview = null;
      upload.photoFile = null;
      upload.photoPreview = null;
      upload.dataFileName = "";
      upload.photoFileName = "";
      appState.candidates.successMessage = successMessage;
      await setCandidateUploadProgressOverlay({
        detail: successMessage,
        isIndeterminate: false,
        isOpen: true,
        message: "업로드가 완료되었습니다.",
        percent: 100,
        stageLabel: "완료",
      });
      showToast(appState.candidates.successMessage);
    } catch (error) {
      upload.errorMessage = error.message;
      await setCandidateUploadProgressOverlay({
        detail: error.message,
        isIndeterminate: false,
        isOpen: true,
        message: "업로드를 완료하지 못했습니다.",
        percent: 100,
        stageLabel: "오류",
      });
      showToast(upload.errorMessage, { tone: "error" });
    } finally {
      if (ensureCandidateUploadState().progressOverlay.isOpen) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      upload.isUploading = false;
      ensureCandidateUploadState().progressOverlay = { ...emptyCandidateUploadProgressOverlay };
      await onStateChange();
    }
  }

  function isCandidateUploadDirty() {
    const upload = appState.candidates.upload || {};

    if (!upload.isOpen || upload.isUploading) {
      return false;
    }

    return Boolean(
      upload.dataFile ||
        upload.photoFile ||
        upload.preview ||
        upload.photoPreview ||
        upload.dataFileName ||
        upload.photoFileName ||
        upload.existingDataPolicy !== "insert-update",
    );
  }

  async function closeCandidateUploadModal() {
    appState.candidates.upload.isOpen = false;
    await onStateChange();
  }

  async function saveCandidateUploadAndClose() {
    await uploadSelectedCandidateFile();
    return !appState.candidates.upload.isOpen;
  }

  return Object.freeze({
    closeCandidateUploadModal,
    isCandidateUploadDirty,
    saveCandidateUploadAndClose,
    uploadSelectedCandidateFile,
  });
}
