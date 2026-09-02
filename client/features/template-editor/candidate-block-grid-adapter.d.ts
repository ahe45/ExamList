export interface CandidateBlockGridBindingOptions {
  appState?: unknown;
  editor?: unknown;
  onDirty?: (() => void) | null;
  pagePropertiesHost: HTMLElement;
  readOnly?: boolean;
  selectedPage: Record<string, unknown>;
  surfaceElement: HTMLElement;
}

export function bindCandidateBlockGridControls(options: CandidateBlockGridBindingOptions): (() => void) | null;
