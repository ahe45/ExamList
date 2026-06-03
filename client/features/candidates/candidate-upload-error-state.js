export function openCandidateUploadErrorDialog(upload = {}, message = "") {
  upload.errorMessage = String(message || "").trim() || "업로드 처리 중 오류가 발생했습니다.";
  upload.errorDialogOpen = true;
}

export function clearCandidateUploadErrorDialog(upload = {}) {
  upload.errorMessage = "";
  upload.errorDialogOpen = false;
}
