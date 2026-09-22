const assert = require("node:assert/strict");
const { evaluate } = require("../../smoke-browser-cdp");
const { setupCellObjectAlignment } = require("./cell-object-alignment");

async function runObjectSelectionZoomCheck(client) {
  await evaluate(client, `(${setupCellObjectAlignment.toString()})(false)`);
  try {
    await evaluate(client, `(() => {
      const surface = document.querySelector('#templateEditorSurface');
      surface.style.transform = '';
      surface.style.border = '3px solid transparent';
      document.querySelectorAll('.template-editor-image-selection').forEach(node => node.style.boxSizing = 'border-box');
    })()`);
    for (const kind of ["image", "cell-image", "table", "multiple"]) {
      await evaluate(client, `(async () => {
        const { applyObjectAlignmentSelection } = await import('/client/features/template-editor/object-alignment-selection.js');
        const surface = document.querySelector('#templateEditorSurface');
        const editor = window.ExamListTemplateEditorRuntime;
        let image = surface.querySelector('.template-doc > img');
        if (!image) {
          image = surface.querySelector('img').cloneNode(true);
          image.style.cssText = 'position:absolute;left:320px;top:300px;width:100px;height:60px';
          surface.querySelector('.template-doc').append(image);
        }
        const table = surface.querySelector('.template-doc > table');
        const selectedImage = '${kind}' === 'cell-image' ? surface.querySelector('td img') : image;
        applyObjectAlignmentSelection(editor, surface, ['image', 'cell-image'].includes('${kind}') ? [selectedImage] : '${kind}' === 'table' ? [table] : [image, table]);
        document.dispatchEvent(new Event('selectionchange'));
      })()`);
      for (const zoom of [1, 0.5, 0.75, 1.25, 1.5, 2, 0.6, 1]) {
        const result = await evaluate(client, `(async () => {
          const { applyTemplateEditorCanvasZoom } = await import('/client/features/template-editor/canvas-zoom.js');
          applyTemplateEditorCanvasZoom({ zoom: ${zoom}, rootElement: document.querySelector('#editor') });
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const surface = document.querySelector('#templateEditorSurface');
          const objectSelector = '${kind}' === 'cell-image' ? 'td img' : '${kind}' === 'image' ? '.template-doc > img' : '.template-doc > table';
          const pairs = '${kind}' === 'multiple'
            ? [...surface.querySelectorAll('.examlist-object-selection')].map(overlay => [overlay.__examlistObjectElement, overlay])
            : [[surface.querySelector(objectSelector), surface.querySelector('${kind}' !== 'table' ? '.template-editor-image-selection:not(.is-hover-only)' : '.template-editor-table-selection.is-selected')]];
          return pairs.map(([object, overlay]) => {
            const a = object?.getBoundingClientRect(), b = overlay?.getBoundingClientRect();
            return { visible: !!overlay && !overlay.classList.contains('hidden'),
              errors: a && b ? ['left', 'top', 'right', 'bottom'].map(key => Math.abs(a[key] - b[key])) : [] };
          });
        })()`);
        assert.equal(result.length, kind === "multiple" ? 2 : 1);
        for (const overlay of result) {
          assert.equal(overlay.visible, true, `${kind} selection must stay visible at ${zoom}`);
          assert.ok(overlay.errors.length === 4 && overlay.errors.every(error => error <= 1.6),
            `${kind} selection must follow all object edges at ${zoom}: ${JSON.stringify(overlay)}`);
        }
      }
    }
    const hoverResult = await evaluate(client, `(async () => {
      const { applyTemplateEditorCanvasZoom } = await import('/client/features/template-editor/canvas-zoom.js');
      const { clearObjectAlignmentSelection } = await import('/client/features/template-editor/object-alignment-selection.js');
      const surface = document.querySelector('#templateEditorSurface');
      clearObjectAlignmentSelection(window.ExamListTemplateEditorRuntime, surface);
      applyTemplateEditorCanvasZoom({ zoom: 0.65 });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const image = surface.querySelector('.template-doc > img');
      image.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
      const overlay = surface.querySelector('[data-template-image-hover-overlay]');
      overlay.style.boxSizing = 'border-box';
      const a = image.getBoundingClientRect(), b = overlay.getBoundingClientRect();
      const matched = !overlay.classList.contains('hidden') && ['left', 'top', 'right', 'bottom'].every(key => Math.abs(a[key] - b[key]) <= 1.6);
      applyTemplateEditorCanvasZoom({ zoom: 1.5 });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { matched, staleHoverHidden: overlay.classList.contains('hidden') };
    })()`);
    assert.deepEqual(hoverResult, { matched: true, staleHoverHidden: true });
  } finally { await evaluate(client, "window.cellObjectAlignment.dispose()"); }
}

module.exports = { runObjectSelectionZoomCheck };
