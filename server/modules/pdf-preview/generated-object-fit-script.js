// Collapsed table borders occupy half their width inside each cell. Leave a
// half-pixel clearance as well so an image's opaque background cannot paint
// over the border when Chromium rounds coordinates during PDF output.
function fitPreviewGeneratedObjects(root) {
  root.querySelectorAll('.preview-candidate-block img[data-template-object-type="barcode"]').forEach((image) => {
    const cell = image.closest("td, th");
    if (!cell) return;

    const cellRect = cell.getBoundingClientRect();
    const cellStyle = getComputedStyle(cell);
    const collapsed = getComputedStyle(cell.closest("table")).borderCollapse === "collapse";
    const borderFactor = collapsed ? 0.5 : 1;
    const number = (value) => Math.max(0, parseFloat(value) || 0);
    const leftInset = number(cellStyle.borderLeftWidth) * borderFactor + number(cellStyle.paddingLeft) + 0.5;
    const rightInset = number(cellStyle.borderRightWidth) * borderFactor + number(cellStyle.paddingRight) + 0.5;
    const availableWidth = cellRect.width - leftInset - rightInset;
    if (!(availableWidth > 0)) return;

    image.style.maxWidth = `${availableWidth}px`;
    const imageRect = image.getBoundingClientRect();
    const imageStyle = getComputedStyle(image);
    if (imageStyle.position !== "absolute" || image.offsetParent !== cell) return;

    const safeLeft = cellRect.left + leftInset;
    const safeRight = cellRect.right - rightInset;
    const nextLeft = Math.max(safeLeft, Math.min(imageRect.left, safeRight - imageRect.width));
    const shift = nextLeft - imageRect.left;
    if (Math.abs(shift) > 0.01) {
      image.style.left = `${(parseFloat(imageStyle.left) || 0) + shift}px`;
    }
  });
}

module.exports = { fitPreviewGeneratedObjects };
