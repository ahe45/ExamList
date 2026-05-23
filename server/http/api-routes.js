const { createAccountRoutes } = require("./routes/accounts");
const { createAuthRoutes } = require("./routes/auth");
const { createCandidateRoutes } = require("./routes/candidates");
const { createDataDeletionRoutes } = require("./routes/data-deletion");
const { createPdfDataTagRoutes } = require("./routes/pdf-data-tags");
const { createPdfGenerationRoutes } = require("./routes/pdf-generations");
const { createPdfPreviewRoutes } = require("./routes/pdf-preview");
const { createPdfTemplateRoutes } = require("./routes/pdf-templates");
const { createSchoolSettingsRoutes } = require("./routes/school-settings");
const { createSchoolRoutes } = require("./routes/schools");
const { createSystemRoutes } = require("./routes/system");

function createApiRoutes(deps) {
  return Object.freeze([
    ...createAccountRoutes(deps),
    ...createAuthRoutes(deps),
    ...createSystemRoutes(deps),
    ...createSchoolRoutes(deps),
    ...createDataDeletionRoutes(deps),
    ...createPdfTemplateRoutes(deps),
    ...createPdfDataTagRoutes(deps),
    ...createPdfGenerationRoutes(deps),
    ...createPdfPreviewRoutes(deps),
    ...createCandidateRoutes(deps),
    ...createSchoolSettingsRoutes(deps),
  ]);
}

module.exports = {
  createApiRoutes,
};
