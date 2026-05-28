const minimumProgressOverlayDurationMs = 650;

function getProgressOverlayTimeMs() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function waitForProgressOverlayTimeout(durationMs = 0) {
  return new Promise((resolve) => {
    const safeDuration = Math.max(0, Math.round(Number(durationMs) || 0));

    if (typeof globalThis.setTimeout === "function") {
      globalThis.setTimeout(resolve, safeDuration);
      return;
    }

    resolve();
  });
}

export function markProgressOverlayStarted() {
  return getProgressOverlayTimeMs();
}

export function waitForProgressOverlayPaint() {
  return new Promise((resolve) => {
    if (typeof globalThis.requestAnimationFrame !== "function") {
      waitForProgressOverlayTimeout(0).then(resolve);
      return;
    }

    globalThis.requestAnimationFrame(() => {
      globalThis.requestAnimationFrame(resolve);
    });
  });
}

export async function waitForMinimumProgressOverlayDuration(startedAtMs, minimumMs = minimumProgressOverlayDurationMs) {
  const elapsedMs = getProgressOverlayTimeMs() - Number(startedAtMs || 0);
  const remainingMs = Math.max(0, Number(minimumMs) - elapsedMs);

  if (remainingMs > 0) {
    await waitForProgressOverlayTimeout(remainingMs);
  }
}
