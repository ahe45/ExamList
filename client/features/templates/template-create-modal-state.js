export function createDefaultTemplateCreateModalState(overrides = {}) {
  return {
    errorMessage: "",
    isLoadingSchools: false,
    isLoadingTemplates: false,
    isOpen: false,
    isSubmitting: false,
    mode: "default",
    schools: [],
    selectedSchoolId: "",
    selectedTemplateId: "",
    sourceTemplates: [],
    ...overrides,
  };
}
