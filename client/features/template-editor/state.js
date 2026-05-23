export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getEditorLayout(editorState) {
  return editorState?.template?.layout || null;
}

export function getEditorPages(editorState) {
  const layout = getEditorLayout(editorState);
  return Array.isArray(layout?.pages) ? layout.pages : [];
}

export function getSelectedPage(editorState) {
  const pages = getEditorPages(editorState);

  if (!pages.length) {
    return null;
  }

  return pages.find((page) => page.id === editorState.selectedPageId) || pages[0];
}
