(function (globalScope) {
  const fontFamilies = Object.freeze([
    "'Noto Sans KR', sans-serif", "'Malgun Gothic', sans-serif",
    "'GulimChe', 'Gulim', sans-serif", "'Nanum Gothic', sans-serif",
    "'Nanum Myeongjo', serif", "'Batang', serif",
  ]);
  const defaults = Object.freeze({
    fontFamily: fontFamilies[0], fontSizePt: 10, color: "#000000",
    bold: true, italic: false, underline: false,
  });
  function normalizePageNumberFormat(value) {
    const source = value && typeof value === "object" ? value : {};
    const size = Number(source.fontSizePt ?? defaults.fontSizePt);
    let color = String(source.color || "").trim().toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(color)) color = `#${color.slice(1).split("").map((digit) => digit + digit).join("")}`;
    const boolean = (key) => source[key] === undefined ? defaults[key] : source[key] === true || String(source[key]) === "true";
    return {
      fontFamily: fontFamilies.includes(source.fontFamily) ? source.fontFamily : defaults.fontFamily,
      fontSizePt: Number.isFinite(size) ? Math.min(72, Math.max(1, size)) : defaults.fontSizePt,
      color: /^#[0-9a-f]{6}$/.test(color) ? color : defaults.color,
      bold: boolean("bold"), italic: boolean("italic"), underline: boolean("underline"),
    };
  }
  function getPageNumberFormatCss(value) {
    const format = normalizePageNumberFormat(value);
    return `font-family:${format.fontFamily};font-size:${format.fontSizePt}pt;color:${format.color};font-weight:${format.bold ? 700 : 400};font-style:${format.italic ? "italic" : "normal"};text-decoration:${format.underline ? "underline" : "none"};`;
  }
  const api = Object.freeze({ normalizePageNumberFormat, getPageNumberFormatCss });
  // The editor loads this as a browser module; the PDF renderer uses CommonJS.
  globalScope.ExamListPageNumberFormat = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
