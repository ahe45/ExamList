const {
  escapeHtml,
  formatDatePattern,
  formatDateTimeValue,
  formatDateValue,
  normalizeDisplayValue,
} = require("./token-formatters");
const {
  buildCandidateTokenMap,
  buildSchoolTokenMap,
} = require("./token-maps");
const {
  evaluateTokenExpression,
  evaluateTokenExpressionDetailed,
  replaceTemplateTokens,
  replaceTemplateTokensInHtml,
  resolveDataPath,
  resolveDataPathWithoutSampleData,
  shouldStyleEmptyValueFallback,
} = require("./token-expressions");

module.exports = {
  buildCandidateTokenMap,
  buildSchoolTokenMap,
  escapeHtml,
  evaluateTokenExpression,
  evaluateTokenExpressionDetailed,
  formatDatePattern,
  formatDateTimeValue,
  formatDateValue,
  normalizeDisplayValue,
  replaceTemplateTokens,
  replaceTemplateTokensInHtml,
  resolveDataPath,
  resolveDataPathWithoutSampleData,
  shouldStyleEmptyValueFallback,
};
