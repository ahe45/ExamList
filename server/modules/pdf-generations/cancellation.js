const pdfGenerationCancelMessage = "사용자 요청으로 PDF 생성을 중단했습니다.";
const pdfGenerationCancelErrorCode = "PDF_GENERATION_CANCELLED";

function createPdfGenerationCanceledError(message = pdfGenerationCancelMessage) {
  const error = new Error(message);

  error.errorCode = pdfGenerationCancelErrorCode;
  error.statusCode = 409;
  return error;
}

function isPdfGenerationCanceledError(error) {
  return String(error?.errorCode || "").trim() === pdfGenerationCancelErrorCode;
}

module.exports = {
  createPdfGenerationCanceledError,
  isPdfGenerationCanceledError,
  pdfGenerationCancelErrorCode,
  pdfGenerationCancelMessage,
};
