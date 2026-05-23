export async function loadViewData({ accountActions, candidatesActions, editorActions, generationActions, route, schoolActions, schoolSettingsActions, templatesActions }) {
  const view = route?.view || "";

  if (route?.params?.schoolId) {
    await schoolActions.loadSchoolDetail(route.params.schoolId);
  }

  await templatesActions.loadSummary({ silent: true });

  if (view === "schoolManagement") {
    await schoolActions.loadSchools();
    return;
  }

  if (view === "accountManagement") {
    await accountActions.loadAccounts();
    return;
  }

  if (view === "templateManagement") {
    await templatesActions.loadTemplates();
    return;
  }

  if (view === "candidateLookup") {
    await candidatesActions.loadCandidates();
    return;
  }

  if (view === "pdfGenerationHistory") {
    await generationActions.loadGenerations();
    return;
  }

  if (view === "pdfHistoryManagement") {
    await generationActions.loadAuditLogs();
    return;
  }

  if (view === "pdfGenerationDetail") {
    await generationActions.loadGenerationDetail(route?.params?.generationId || "");
    return;
  }

  if (view === "dataDeletion") {
    return;
  }

  if (view === "templateEditor") {
    await schoolSettingsActions.loadSchoolSettings({ render: false });
    await editorActions.loadTemplateEditor(route?.params?.templateId || "");
  }
}
