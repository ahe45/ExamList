export function toQueryString(filters = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== null && typeof value !== "undefined") {
      searchParams.set(key, value);
    }
  });

  return searchParams.toString();
}

export function triggerDownload(downloadUrl, fileName = "") {
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
}
