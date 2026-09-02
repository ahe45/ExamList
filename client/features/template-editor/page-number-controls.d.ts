export function bindPageNumberControls(options: {
  appState: unknown;
  onDirty?: () => void;
  pagePropertiesHost: HTMLElement;
  selectedPage: unknown;
  surfaceElement: HTMLElement;
}): (() => void) | null;
