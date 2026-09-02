export interface ToastOptions {
  tone?: "error" | "warning" | string;
}

export function hideToast(): void;
export function showToast(message?: string, options?: ToastOptions | string): void;
