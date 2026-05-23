const {
  assertSchoolSelectionShell,
  runLoginRedirectChecks,
  runLogoutScenario,
  submitSmokeLogin,
} = require("./auth/login-flow");
const { assertSchoolSettingsModal } = require("./auth/school-modal");
const {
  assertTemplateCardActions,
  assertTemplateListPage,
  assertWorkspaceSidebar,
  openFirstSchoolWorkspace,
} = require("./auth/workspace-template-list");
const {
  assertTopbarAccount,
  assertTopbarLayout,
  assertTopbarSchoolMeta,
} = require("./auth/topbar-layout");

async function runAuthAndSchoolScenario(context) {
  await runLoginRedirectChecks(context);
  await submitSmokeLogin(context);
  await assertSchoolSelectionShell(context);
  await assertSchoolSettingsModal(context);

  const schoolCode = await openFirstSchoolWorkspace(context);

  await assertTemplateListPage(context, schoolCode);
  await assertTemplateCardActions(context);
  await assertWorkspaceSidebar(context);
  await assertTopbarAccount(context);
  await assertTopbarSchoolMeta(context, schoolCode);
  await assertTopbarLayout(context);
  return schoolCode;
}

module.exports = {
  runAuthAndSchoolScenario,
  runLogoutScenario,
};
