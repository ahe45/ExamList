import { showToast } from "../../app/toast.js";
import {
  arrayBufferToBase64,
  createUploadResultMessage,
  postJsonWithProgress,
  readFileAsArrayBuffer,
} from "./candidate-action-utils.js";
import {
  clearCandidateUploadErrorDialog,
  openCandidateUploadErrorDialog,
} from "./candidate-upload-error-state.js";
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
      openCandidateUploadErrorDialog(upload, mode === "photo-archive" ? "사진 ZIP 파일을 먼저 선택하세요." : "XLSX 파일을 먼저 선택하세요.");
      await onStateChange();
      return;
    }

    upload.isUploading = true;
    clearCandidateUploadErrorDialog(upload);
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
        const previewToken = String(upload.photoPreviewToken || upload.photoPreview?.previewToken || "").trim();

        if (!previewToken) {
          throw new Error("사진 ZIP 미리보기를 먼저 완료해 주세요. 세션이 만료된 경우 ZIP 파일을 다시 선택해 주세요.");
        }

        await setCandidateUploadProgressOverlay({
          detail: "사진 데이터 ZIP파일 압축을 해제하고 서버에 등록합니다.",
          isIndeterminate: true,
          isOpen: true,
          message: "사진 데이터를 저장하는 중입니다.",
          percent: 100,
          stageLabel: "데이터 처리 중",
        });

        result = await postJsonWithProgress(
          "/api/candidates/photo-archive",
          {
            previewToken,
            schoolId: getCurrentSchoolId(),
          },
          "사진 ZIP을 업로드할 수 없습니다.",
        );
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
      clearCandidateUploadErrorDialog(upload);
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
      upload.photoPreviewToken = "";
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
      openCandidateUploadErrorDialog(upload, error.message);
      await setCandidateUploadProgressOverlay({
        detail: error.message,
        isIndeterminate: false,
        isOpen: true,
        message: "업로드를 완료하지 못했습니다.",
        percent: 100,
        stageLabel: "오류",
      });
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
        upload.photoPreviewToken ||
        upload.dataFileName ||
        upload.photoFileName ||
        upload.existingDataPolicy !== "insert-update",
    );
  }

  async function closeCandidateUploadModal() {
    appState.candidates.upload.isOpen = false;
    clearCandidateUploadErrorDialog(appState.candidates.upload);
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
