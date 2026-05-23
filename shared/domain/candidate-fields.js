const candidateFieldColumns = require("./candidate-field-columns");
const candidateFieldDefinitions = require("./candidate-field-definitions");

module.exports = Object.freeze({
  ...candidateFieldDefinitions,
  ...candidateFieldColumns,
});
