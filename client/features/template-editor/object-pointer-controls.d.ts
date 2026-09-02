export function bindObjectPointerControls(options: {
  editor: unknown;
  onDirty?: () => void;
  selectedPage: unknown;
  surfaceElement: HTMLElement;
  rootElement: HTMLElement;
}): (() => void) | null;

export function syncTableObjectOverlayGeometry(rootElement: HTMLElement): void;
