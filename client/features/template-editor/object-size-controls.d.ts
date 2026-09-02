export function bindObjectSizeControls(options: {
  editor: unknown;
  onDirty?: () => void;
  selectedPage: unknown;
  surfaceElement: HTMLElement;
  toolbarHost: HTMLElement;
}): (() => void) | null;
export function applyObjectTableSize(
  tableElement: HTMLTableElement,
  size: { height?: number | null; width?: number | null },
): boolean;
