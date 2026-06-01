export function createDefaultTemplateCreateModalState(overrides = {}) {
  return {
    errorMessage: "",
    description: "",
    isLoadingSchools: false,
    isLoadingTemplates: false,
    isOpen: false,
    isSubmitting: false,
    mode: "default",
    name: "",
    schools: [],
    selectedSchoolId: "",
    selectedTemplateId: "",
    sourceTemplates: [],
    ...overrides,
  };
}
