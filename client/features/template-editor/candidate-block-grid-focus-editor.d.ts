export function openCandidateBlockFocusEditor(options: {
  blockElement: HTMLElement;
  editor?: unknown;
  onDirty?: (() => void) | null;
  selectedPage?: unknown;
  surfaceElement: HTMLElement;
}): boolean;

export function closeCandidateBlockFocusEditor(): boolean;
export function cancelCandidateBlockFocusEditor(): boolean;
export function refreshCandidateBlockFocusEditor(): boolean;
export function isCandidateBlockFocusEditorOpen(blockElement?: HTMLElement | null): boolean;
