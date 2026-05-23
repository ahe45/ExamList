import { showToast } from "../../app/toast.js";
import { getDocumentSurfaceOverflowInfo } from "./document-overflow.js";

let lastWarningToastMessage = "";
let lastWarningToastAt = 0;

function isBoundaryWarningMessage(message) {
  const normalizedMessage = String(message || "").trim();

  return /(여백|영역|초과|넘어|저장할 수 없습니다)/.test(normalizedMessage);
}

function isHardBlockingBoundaryMessage(message) {
  return /(입력할 수 없습니다|되돌렸습니다)/.test(String(message || ""));
}

function shouldShowEditorWarningToast(message, type) {
  return String(type || "").trim() === "warning" && isBoundaryWarningMessage(message);
}

function hasActualDocumentOverflow(surfaceElement) {
  try {
    return getDocumentSurfaceOverflowInfo(surfaceElement).hasOverflow;
  } catch (_error) {
    return false;
  }
}

export function bindEditorStatusToast(surfaceElement) {
  if (!surfaceElement) {
    return null;
  }

  let pendingFrameId = 0;

  const handleStatus = (event) => {
    const message = String(event.detail?.message || "").trim();
    const type = String(event.detail?.type || "").trim();

    if (!shouldShowEditorWarningToast(message, type)) {
      return;
    }

    window.cancelAnimationFrame(pendingFrameId);

    const showWarningToast = () => {
      pendingFrameId = 0;

      if (!isHardBlockingBoundaryMessage(message) && !hasActualDocumentOverflow(surfaceElement)) {
        return;
      }

      const now = Date.now();

      if (message === lastWarningToastMessage && now - lastWarningToastAt < 800) {
        return;
      }

      lastWarningToastMessage = message;
      lastWarningToastAt = now;
      showToast(message, { duration: 3600, tone: "error" });
    };

    pendingFrameId = window.requestAnimationFrame(() => {
      pendingFrameId = window.requestAnimationFrame(showWarningToast);
    });
  };

  surfaceElement.addEventListener("template-editor-status", handleStatus);
  return () => {
    window.cancelAnimationFrame(pendingFrameId);
    surfaceElement.removeEventListener("template-editor-status", handleStatus);
  };
}
