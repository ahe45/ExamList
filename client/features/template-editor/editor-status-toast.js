import { showToast } from "../../app/toast.js";
import { getDocumentSurfaceOverflowInfo } from "./document-overflow.js";

let lastWarningToastMessage = "";
let lastWarningToastAt = 0;

function isHardBlockingBoundaryMessage(message) {
  return /(입력할 수 없습니다|되돌렸습니다)/.test(String(message || ""));
}

function shouldShowEditorWarningToast(message, type) {
  return String(type || "").trim() === "warning" && /(여백|영역|초과|넘어|저장할 수 없습니다)/.test(message);
}

export function bindEditorStatusToast(surfaceElement) {
  if (!surfaceElement) {
    return null;
  }

  let pendingFrameId = 0;
  let overflowNotified = false;

  const handleStatus = (event) => {
    const message = String(event.detail?.message || "").trim();
    const type = String(event.detail?.type || "").trim();

    window.cancelAnimationFrame(pendingFrameId);

    const showWarningToast = () => {
      pendingFrameId = 0;
      const hasOverflow = getDocumentSurfaceOverflowInfo(surfaceElement).hasOverflow;
      if (!hasOverflow) overflowNotified = false;
      if (!shouldShowEditorWarningToast(message, type)) return;
      const hardBlocking = isHardBlockingBoundaryMessage(message);
      // Notify once per overflow episode so typing cannot keep the toast open.
      if (!hardBlocking && (!hasOverflow || overflowNotified)) return;

      const now = Date.now();

      if (message === lastWarningToastMessage && now - lastWarningToastAt < 800) {
        return;
      }

      lastWarningToastMessage = message;
      lastWarningToastAt = now;
      if (hasOverflow) overflowNotified = true;
      showToast(message, { tone: "error" });
    };

    pendingFrameId = window.requestAnimationFrame(() => {
      pendingFrameId = window.requestAnimationFrame(showWarningToast);
    });
  };

  surfaceElement.addEventListener("template-editor-status", handleStatus);
  const handleCopy = () => showToast("표를 복사했습니다.");
  const handlePasteError = (event) => {
    const message = String(event.detail?.message || "");
    if (message) showToast(message, { tone: "warning" });
  };
  surfaceElement.addEventListener("template-editor-table-copied", handleCopy);
  surfaceElement.addEventListener("template-editor-paste-error", handlePasteError);
  return () => {
    window.cancelAnimationFrame(pendingFrameId);
    surfaceElement.removeEventListener("template-editor-status", handleStatus);
    surfaceElement.removeEventListener("template-editor-table-copied", handleCopy);
    surfaceElement.removeEventListener("template-editor-paste-error", handlePasteError);
  };
}
