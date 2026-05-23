const {
  candidateDetailFieldKeys,
  candidateGridFieldKeys,
  candidateWorkbookFieldKeys,
  getFieldDefinition,
} = require("./candidate-field-definitions");

const createGridColumns = ({ keys = candidateGridFieldKeys, dateLabel = "시험날짜" } = {}) =>
  Object.freeze(
    keys
      .map((key) => getFieldDefinition(key))
      .filter(Boolean)
      .map((definition) =>
        Object.freeze({
          key: definition.key,
          label: definition.key === "date" ? dateLabel : definition.gridLabel,
          sortable: true,
          filterable: true,
        }),
      ),
  );

const createDetailFields = (keys = candidateDetailFieldKeys) =>
  Object.freeze(
    keys
      .map((key) => getFieldDefinition(key))
      .filter(Boolean)
      .map((definition) =>
        Object.freeze({
          key: definition.key,
          label: definition.detailLabel,
          type: definition.inputType,
        }),
      ),
  );

const createTemplateColumns = ({ keys = candidateWorkbookFieldKeys } = {}) =>
  Object.freeze(
    keys
      .map((key) => getFieldDefinition(key))
      .filter(Boolean)
      .map((definition) =>
        Object.freeze({
          header: definition.label,
          key: definition.key,
          sample: definition.sample,
          width: definition.templateWidth,
        }),
      ),
  );

const createWorkbookTextColumns = ({ keys = candidateGridFieldKeys, dateLabel = "시험날짜" } = {}) =>
  Object.freeze(
    keys
      .map((key) => getFieldDefinition(key))
      .filter(Boolean)
      .map((definition) =>
        Object.freeze({
          header: definition.key === "date" ? dateLabel : definition.label,
          key: definition.key,
          text: true,
          width: definition.exportWidth,
        }),
      ),
  );

module.exports = Object.freeze({
  createDetailFields,
  createGridColumns,
  createTemplateColumns,
  createWorkbookTextColumns,
});
