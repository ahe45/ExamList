
const { withBrowserSmokeSession } = require("./smoke/browser-session");
const { runAuthAndSchoolScenario, runLogoutScenario } = require("./smoke/scenario-auth");
const { runTemplateEditorScenario } = require("./smoke/scenario-template-editor");
const { runTemplateListScenario } = require("./smoke/scenario-template-list");
const { runWorkspacePagesScenario } = require("./smoke/scenario-workspace-pages");

async function run() {
  await withBrowserSmokeSession(async (context) => {
    await runAuthAndSchoolScenario(context);
    await runTemplateListScenario(context);
    await runTemplateEditorScenario(context);
    await runWorkspacePagesScenario(context);
    await runLogoutScenario(context);

    const pageErrors = context.client.getPageErrors();

    if (pageErrors.length) {
      throw new Error(`브라우저 런타임 오류: ${pageErrors.join("; ")}`);
    }

    console.log(`Browser smoke OK: ${context.baseUrl}`);
  });
}

run().catch((error) => {
  console.error(error.message || "브라우저 스모크 실패");
  process.exitCode = 1;
});
