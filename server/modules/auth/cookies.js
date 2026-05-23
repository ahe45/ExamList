function parseCookies(cookieHeader = "") {
  return String(cookieHeader || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex === -1) {
        return cookies;
      }

      const name = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();

      if (name) {
        try {
          cookies[name] = decodeURIComponent(value);
        } catch (_error) {
          cookies[name] = value;
        }
      }

      return cookies;
    }, {});
}

module.exports = {
  parseCookies,
};
