const {
  dispatchBrowserMouseDrag,
  getEditorTableCellBoundaryPoint,
  getEditorTableCellRowBoundaryPoint,
  getEditorTableLogicalCellBoundaryPoint,
  getEditorTableLogicalCellRowBoundaryPoint,
} = require("../../../smoke-browser-cdp");

const SHIFT_KEY_MODIFIERS = 8;

async function dragCellColumnBoundary(client, rowNumber, cellNumber, deltaX, description) {
  const startPoint = await getEditorTableCellBoundaryPoint(client, rowNumber, cellNumber, description);
  await dispatchBrowserMouseDrag(
    client,
    startPoint,
    { x: startPoint.x + deltaX, y: startPoint.y },
    { modifiers: SHIFT_KEY_MODIFIERS },
  );
}

async function dragLogicalCellColumnBoundary(client, rowNumber, columnNumber, deltaX, description) {
  const startPoint = await getEditorTableLogicalCellBoundaryPoint(client, rowNumber, columnNumber, description);
  await dispatchBrowserMouseDrag(
    client,
    startPoint,
    { x: startPoint.x + deltaX, y: startPoint.y },
    { modifiers: SHIFT_KEY_MODIFIERS },
  );
}

async function dragCellRowBoundary(client, rowNumber, cellNumber, deltaY, description) {
  const startPoint = await getEditorTableCellRowBoundaryPoint(client, rowNumber, cellNumber, description);
  await dispatchBrowserMouseDrag(
    client,
    startPoint,
    { x: startPoint.x, y: startPoint.y + deltaY },
    { modifiers: SHIFT_KEY_MODIFIERS },
  );
}

async function dragLogicalCellRowBoundary(client, rowNumber, columnNumber, deltaY, description) {
  const startPoint = await getEditorTableLogicalCellRowBoundaryPoint(client, rowNumber, columnNumber, description);
  await dispatchBrowserMouseDrag(
    client,
    startPoint,
    { x: startPoint.x, y: startPoint.y + deltaY },
    { modifiers: SHIFT_KEY_MODIFIERS },
  );
}

module.exports = {
  dragCellColumnBoundary,
  dragCellRowBoundary,
  dragLogicalCellColumnBoundary,
  dragLogicalCellRowBoundary,
};
