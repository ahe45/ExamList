export type ObjectResizeHandle =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left";

export const objectResizeHandles: readonly ObjectResizeHandle[];

export function clampObjectCoordinate(value: number, maximum: number): number;

export function getObjectResizeDirections(handle: string): { x: -1 | 0 | 1; y: -1 | 0 | 1 };

export function calculateObjectMovePosition(options?: {
  deltaX?: number;
  deltaY?: number;
  maximumLeft?: number;
  maximumTop?: number;
  startLeft?: number;
  startTop?: number;
}): { left: number; top: number };

export function calculateObjectResizeRect(options?: {
  deltaX?: number;
  deltaY?: number;
  directionX?: number;
  directionY?: number;
  maximumHeight?: number;
  maximumWidth?: number;
  minimumHeight?: number;
  minimumWidth?: number;
  preserveAspectRatio?: boolean;
  startHeight?: number;
  startLeft?: number;
  startTop?: number;
  startWidth?: number;
}): { height: number; left: number; top: number; width: number };
