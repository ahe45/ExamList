async function waitForRequests(requests) {
  const results = await Promise.allSettled(requests);
  const failure = results.find(result => result.status === "rejected");
  if (failure) throw failure.reason;
}

export async function loadViewData({ accountActions, candidatesActions, dataDeletionActions, editorActions, generationActions, route, schoolActions, schoolSettingsActions, templatesActions }) {
  const view = route?.view || "";

  const features = {
    accountManagement: [accountActions], candidateLookup: [candidatesActions],
    pdfGenerationHistory: [generationActions], pdfHistoryManagement: [generationActions],
    templateEditor: [editorActions, schoolSettingsActions],
    dataDeletion: [dataDeletionActions],
  };
  // Resolve the canonical school ID before school-scoped requests begin.
  await waitForRequests([
    ...(route?.params?.schoolId ? [schoolActions.loadSchoolDetail(route.params.schoolId)] : []),
    ...(features[view] || []).map(actions => actions?.load?.()),
  ]);
  const summary = templatesActions.loadSummary({ silent: true });
  async function loadCurrentView() {

    if (view === "schoolManagement") {
      await schoolActions.loadSchools();
      return;
    }

    if (view === "accountManagement") {
      await summary; // Account loading checks the current permissions.
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
      generationActions.resetPdfGenerationActiveTab?.();
      await summary;
      await waitForRequests([generationActions.loadGenerations(), generationActions.loadArtifacts?.()]);
      return;
    }

    if (view === "pdfHistoryManagement") {
      await generationActions.loadAuditLogs();
      return;
    }

    if (view === "dataDeletion") {
      return;
    }

    if (view === "templateEditor") {
      await waitForRequests([
        schoolSettingsActions.loadSchoolSettings({ render: false }),
        editorActions.loadTemplateEditor(route?.params?.templateId || ""),
      ]);
    }
  }
  // Drain failures too, so a late request cannot outlive the completed load.
  await waitForRequests([summary, loadCurrentView()]);
}
