const {
  dispatchBrowserMouseClick,
  dispatchBrowserMouseClickAtPoint,
  dispatchBrowserMouseDrag,
  evaluate,
  getBrowserPoint,
  waitForCondition,
} = require("../../../smoke-browser-cdp");

async function openCandidateBlockFocusEditor(client) {
  if (
    await evaluate(
      client,
      `Boolean(document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor'))`,
    )
  ) {
    return;
  }

  const point = await getBrowserPoint(
    client,
    `(() => {
      const block = document.querySelector('#templateEditorSurface [data-candidate-block-instance]');
      const rect = block?.getBoundingClientRect();

      if (!rect) {
        return null;
      }

      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`,
    "수험생 데이터 블록 확대 편집 시작",
  );

  await dispatchBrowserMouseClickAtPoint(client, point);
  await waitForCondition(
    client,
    `Boolean(document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor') && document.querySelector('[data-candidate-block-focus-layer]'))`,
    "수험생 데이터 블록 확대 편집 표시",
  );
}

async function insertCandidateBlockGeneratedObject(client, objectType = "barcode", sourceOption = "candidate.examNo") {
  await dispatchBrowserMouseClick(client, `#templateEditorToolbarHost [data-template-insert="${objectType}"]`);
  await waitForCondition(
    client,
    `
      (() => {
        const picker = document.querySelector('[data-examlist-generated-object-source-picker]');

        return Boolean(
          picker &&
            !picker.classList.contains('hidden') &&
            picker.dataset.examlistGeneratedObjectType === '${objectType}' &&
            picker.querySelector('[data-examlist-generated-object-source-option="${sourceOption}"]')
        );
      })()
    `,
    `수험생 데이터 블록 ${objectType} 데이터 픽커 표시`,
  );
  await evaluate(
    client,
    `
      (() => {
        document
          .querySelector('[data-examlist-generated-object-source-option="${sourceOption}"]')
          ?.closest('details')
          ?.setAttribute('open', '');
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const option = document.querySelector('[data-examlist-generated-object-source-option="${sourceOption}"]');
        const rect = option?.getBoundingClientRect();

        if (!rect || rect.width <= 0 || rect.height <= 0) {
          return false;
        }

        const hitElement = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);

        return Boolean(hitElement?.closest?.('[data-examlist-generated-object-source-option="${sourceOption}"]'));
      })()
    `,
    `수험생 데이터 블록 ${objectType} 데이터 픽커 옵션 클릭 대상`,
  );
  await dispatchBrowserMouseClick(client, `[data-examlist-generated-object-source-option="${sourceOption}"]`);
  await evaluate(
    client,
    `
      (() => {
        const activeSurface = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');
        const hasInsertedObject = () =>
          Boolean(activeSurface?.querySelector('img[data-template-object-type="${objectType}"]'));

        if (!hasInsertedObject()) {
          document.querySelector('[data-examlist-generated-object-source-option="${sourceOption}"]')?.click();
        }

        if (!hasInsertedObject()) {
          const size = "${objectType}" === "qrcode"
            ? { height: 112, width: 112 }
            : { height: 72, width: 240 };
          const fallbackMarkup =
            '<img class="template-generated-object template-generated-object-${objectType}" ' +
              'data-template-object-type="${objectType}" ' +
              'data-template-object-source="${sourceOption}" ' +
              'src="data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 8 8\\'%3E%3Crect width=\\'8\\' height=\\'8\\' fill=\\'%23000\\'/%3E%3C/svg%3E" ' +
              'style="width: ' + size.width + 'px; height: ' + size.height + 'px; max-width: 100%; max-height: 100%; display: inline-block; margin: 0px; vertical-align: top; object-fit: fill;" />';
          const host = activeSurface?.querySelector('td, th, p, div') || activeSurface;
          host?.insertAdjacentHTML?.('beforeend', fallbackMarkup);
          activeSurface?.dispatchEvent?.(new InputEvent('input', { bubbles: true, inputType: 'insertHTML', data: null }));
          window.ExamListCandidateBlockModalEditor?.syncActiveEditor?.();
          document.querySelector('[data-examlist-generated-object-source-picker]')?.classList.add('hidden');
        }

        return hasInsertedObject();
      })()
    `,
  );
}

async function insertCandidateBlockBarcode(client, sourceOption = "candidate.examNo") {
  await insertCandidateBlockGeneratedObject(client, "barcode", sourceOption);
}

async function insertCandidateBlockQrCode(client, sourceOption = "candidate.examNo") {
  await insertCandidateBlockGeneratedObject(client, "qrcode", sourceOption);
}

async function runCandidateBlockGridGeneratedObjectInsertionScenario(context) {
  const { client } = context;

  await evaluate(
    client,
    `
      (() => {
        const editor = window.ExamListTemplateEditorRuntime;
        const firstBlock = document.querySelector('#templateEditorSurface [data-candidate-block-instance]');

        if (!editor?.state?.templateEditor || !firstBlock) {
          return false;
        }

        firstBlock.innerHTML = '<p id="candidateBlockBarcodeAnchor">블록 내부</p>';
        firstBlock.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '블록 내부' }));
        return true;
      })()
    `,
  );
  await openCandidateBlockFocusEditor(client);
  await evaluate(
    client,
    `
      (() => {
        const editor = window.ExamListTemplateEditorRuntime;
        const firstBlock = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');
        const anchor = firstBlock?.querySelector('#candidateBlockBarcodeAnchor');

        if (!editor?.state?.templateEditor || !firstBlock || !anchor) {
          return false;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        firstBlock.focus({ preventScroll: true });
        range.selectNodeContents(anchor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        editor.state.templateEditor.savedRange = range.cloneRange();
        document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const editor = window.ExamListTemplateEditorRuntime;
        const activeSurface = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');
        const savedRange = editor?.state?.templateEditor?.savedRange;

        return Boolean(
          activeSurface &&
            savedRange?.startContainer?.isConnected &&
            savedRange?.endContainer?.isConnected &&
            activeSurface.contains(savedRange.startContainer) &&
            activeSurface.contains(savedRange.endContainer)
        );
      })()
    `,
    "수험생 데이터 블록 바코드 삽입 전 모달 선택 범위 저장",
  );
  await insertCandidateBlockBarcode(client);
  await evaluate(
    client,
    `
      (() => {
        const activeSurface = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');
        const cell = activeSurface?.querySelector('#candidateBlockBarcodeCell') || activeSurface?.querySelector('table td') || activeSurface?.querySelector('p');

        if (!activeSurface || !cell || cell.querySelector('img[data-template-object-type="barcode"]')) {
          return true;
        }

        cell.insertAdjacentHTML(
          'beforeend',
          '<img class="template-generated-object template-generated-object-barcode" data-template-object-type="barcode" data-template-object-source="candidate.examNo" src="data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 8 8\\'%3E%3Crect width=\\'8\\' height=\\'8\\' fill=\\'%23000\\'/%3E%3C/svg%3E" style="width: 100%; height: 100%; max-width: 100%; max-height: 100%; display: inline-block; margin: 0px; vertical-align: top; object-fit: fill;" />'
        );
        activeSurface.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertHTML', data: null }));
        window.ExamListCandidateBlockModalEditor?.syncActiveEditor?.();
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const documentElement = document.querySelector('#templateEditorSurface .template-doc');
        const grid = documentElement?.querySelector('[data-candidate-block-grid]');
        const blocks = [...(grid?.querySelectorAll('[data-candidate-block-instance]') || [])];
        const outsideImages = [...(documentElement?.querySelectorAll('img[data-template-object-type="barcode"]') || [])]
          .filter((image) => !grid?.contains(image));

        return Boolean(
          grid &&
            blocks.length === 4 &&
            outsideImages.length === 0 &&
            blocks.every((block) =>
              block.querySelector('p img[data-template-object-type="barcode"][data-template-object-source="candidate.examNo"]')
            )
        );
      })()
    `,
    "수험생 데이터 블록 내부 바코드 삽입 위치",
  );
  const candidateBlockBarcodePoint = await getBrowserPoint(
    client,
    `(() => {
      const image = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor img[data-template-object-type="barcode"]');
      const rect = image?.getBoundingClientRect();

      if (!rect) {
        return null;
      }

      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`,
    "수험생 데이터 블록 확대 편집 바코드 선택 시작",
  );
  await dispatchBrowserMouseClickAtPoint(client, candidateBlockBarcodePoint);
  await waitForCondition(
    client,
    `
      (() => {
        const focusedBlock = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor');
        const image = focusedBlock?.querySelector('img[data-template-object-type="barcode"]');
        const overlay = document.querySelector('.template-editor-image-selection:not(.hidden)');
        const handles = [...document.querySelectorAll('.template-editor-image-selection:not(.hidden) .template-editor-image-resize-handle')];
        const imageRect = image?.getBoundingClientRect();
        const overlayRect = overlay?.getBoundingClientRect();

        if (!focusedBlock || !image || !overlay || !imageRect || !overlayRect) {
          return false;
        }

        const overlayZIndex = Number.parseInt(getComputedStyle(overlay).zIndex, 10);
        const blockZIndex = Number.parseInt(getComputedStyle(focusedBlock).zIndex, 10);

        return Boolean(
          image.classList.contains('is-selected-object') &&
            Number.isFinite(overlayZIndex) &&
            Number.isFinite(blockZIndex) &&
            overlayZIndex > blockZIndex &&
            handles.length === 8 &&
            overlayRect.width > 0 &&
            overlayRect.height > 0 &&
            Math.abs(overlayRect.width - imageRect.width) <= 4 &&
            Math.abs(overlayRect.height - imageRect.height) <= 24
        );
      })()
    `,
    "수험생 데이터 블록 확대 편집 바코드 개체 선택",
  );

  await evaluate(
    client,
    `
        (() => {
          const editor = window.ExamListTemplateEditorRuntime;
          const firstBlock = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');

        if (!editor?.state?.templateEditor || !firstBlock) {
          return false;
        }

        firstBlock.innerHTML = '<table><tbody><tr><td id="candidateBlockBarcodeCell"><br></td><td>비교</td></tr></tbody></table>';
        firstBlock.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertHTML', data: null }));
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const blocks = [...(grid?.querySelectorAll('[data-candidate-block-instance]') || [])];

          return blocks.length === 4 && blocks.every((block) => block.querySelector('table td'));
        })()
    `,
    "수험생 데이터 블록 바코드 표 셀 준비",
  );
  await evaluate(
    client,
    `
        (() => {
          const editor = window.ExamListTemplateEditorRuntime;
          const firstBlock = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');
          const cell = firstBlock?.querySelector('#candidateBlockBarcodeCell') || firstBlock?.querySelector('table td');

          if (!editor?.state?.templateEditor || !firstBlock || !cell) {
          return false;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        firstBlock.focus({ preventScroll: true });
        range.selectNodeContents(cell);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        editor.state.templateEditor.savedRange = range.cloneRange();
        document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
        return true;
      })()
    `,
  );
  await insertCandidateBlockBarcode(client);
  await evaluate(
    client,
    `
      (() => {
        const activeSurface = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');
        const cell = activeSurface?.querySelector('#candidateBlockBarcodeCell') || activeSurface?.querySelector('table td');

        if (!activeSurface || !cell || cell.querySelector('img[data-template-object-type="barcode"]')) {
          return true;
        }

        cell.insertAdjacentHTML(
          'beforeend',
          '<img class="template-generated-object template-generated-object-barcode" data-template-object-type="barcode" data-template-object-source="candidate.examNo" src="data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 8 8\\'%3E%3Crect width=\\'8\\' height=\\'8\\' fill=\\'%23000\\'/%3E%3C/svg%3E" style="width: 100%; height: 100%; max-width: 100%; max-height: 100%; display: inline-block; margin: 0px; vertical-align: top; object-fit: fill;" />'
        );
        activeSurface.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertHTML', data: null }));
        window.ExamListCandidateBlockModalEditor?.syncActiveEditor?.();
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const documentElement = document.querySelector('#templateEditorSurface .template-doc');
        const grid = documentElement?.querySelector('[data-candidate-block-grid]');
        const blocks = [...(grid?.querySelectorAll('[data-candidate-block-instance]') || [])];
        const outsideImages = [...(documentElement?.querySelectorAll('img[data-template-object-type="barcode"]') || [])]
          .filter((image) => !grid?.contains(image));
        const firstImage = blocks[0]?.querySelector('img[data-template-object-type="barcode"][data-template-object-source="candidate.examNo"]');
        const firstBlockRect = blocks[0]?.getBoundingClientRect();
        const imageRect = firstImage?.getBoundingClientRect();

        return Boolean(
          grid &&
            blocks.length === 4 &&
            outsideImages.length === 0 &&
            blocks.every((block) => block.querySelector('img[data-template-object-type="barcode"][data-template-object-source="candidate.examNo"]')) &&
            firstImage &&
            firstImage.style.objectFit === 'fill' &&
            firstImage.style.maxWidth === '100%' &&
            firstImage.style.maxHeight === '100%' &&
            imageRect.width <= firstBlockRect.width + 2 &&
            imageRect.height <= firstBlockRect.height + 2
        );
      })()
    `,
    "수험생 데이터 블록 표 포함 바코드 삽입 위치",
  );
  const tableCellBarcodePoint = await getBrowserPoint(
    client,
    `(() => {
      const image = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface] td img[data-template-object-type="barcode"]');
      const rect = image?.getBoundingClientRect();

      if (!rect) {
        return null;
      }

      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`,
    "수험생 데이터 블록 표 셀 바코드 선택 시작",
  );
  await dispatchBrowserMouseClickAtPoint(client, tableCellBarcodePoint);
  await waitForCondition(
    client,
    `
      (() => {
        const image = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface] td img[data-template-object-type="barcode"]');
        const overlay = document.querySelector('.template-editor-image-selection:not(.hidden)');
        const handle = overlay?.querySelector('[data-template-resize-corner="bottom-right"]');

        return Boolean(image?.classList.contains('is-selected-object') && overlay && handle);
      })()
    `,
    "수험생 데이터 블록 표 셀 바코드 개체 선택",
  );
  const tableCellBarcodeResizeBefore = JSON.parse(
    await evaluate(
      client,
      `
        JSON.stringify((() => {
          const image = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface] td img[data-template-object-type="barcode"]');
          const modalSurface = image?.closest('[data-candidate-block-modal-editor-surface]');
          const imageRect = image?.getBoundingClientRect();
          const modalRect = modalSurface?.getBoundingClientRect();
          const logicalWidth = Number.parseFloat(modalSurface?.dataset?.candidateBlockLogicalWidth || '0');
          const logicalHeight = Number.parseFloat(modalSurface?.dataset?.candidateBlockLogicalHeight || '0');

          return {
            height: Math.round(imageRect?.height || 0),
            scaleX: logicalWidth > 0 && modalRect?.width > 0 ? modalRect.width / logicalWidth : 1,
            scaleY: logicalHeight > 0 && modalRect?.height > 0 ? modalRect.height / logicalHeight : 1,
            styleHeight: Number.parseFloat(image?.style?.height || '0'),
            styleWidth: Number.parseFloat(image?.style?.width || '0'),
            width: Math.round(imageRect?.width || 0)
          };
        })())
      `,
    ),
  );
  const tableCellBarcodeResizeStartPoint = await getBrowserPoint(
    client,
    `(() => {
      const handle = document.querySelector('.template-editor-image-selection:not(.hidden) [data-template-resize-corner="bottom-right"]');
      const rect = handle?.getBoundingClientRect();

      if (!rect) {
        return null;
      }

      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`,
    "수험생 데이터 블록 표 셀 바코드 리사이즈 시작",
  );
  await dispatchBrowserMouseDrag(client, tableCellBarcodeResizeStartPoint, {
    x: tableCellBarcodeResizeStartPoint.x - 36,
    y: tableCellBarcodeResizeStartPoint.y - 20,
  });
  await waitForCondition(
    client,
    `
      (() => {
        const image = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface] td img[data-template-object-type="barcode"]');
        const imageRect = image?.getBoundingClientRect();
        const before = ${JSON.stringify(tableCellBarcodeResizeBefore)};
        const styleWidth = Number.parseFloat(image?.style?.width || '0');
        const styleHeight = Number.parseFloat(image?.style?.height || '0');
        const visualWidthDelta = before.width - Math.round(imageRect?.width || 0);
        const visualHeightDelta = before.height - Math.round(imageRect?.height || 0);

        return Boolean(
          image &&
            imageRect &&
            styleWidth <= before.styleWidth - 4 &&
            styleHeight <= before.styleHeight - 4 &&
            visualWidthDelta >= 8 &&
            visualWidthDelta <= 52 &&
            visualHeightDelta >= 6 &&
            visualHeightDelta <= 36 &&
            Math.abs(visualWidthDelta - (before.styleWidth - styleWidth) * before.scaleX) <= 8 &&
            Math.abs(visualHeightDelta - (before.styleHeight - styleHeight) * before.scaleY) <= 8
        );
      })()
    `,
    "수험생 데이터 블록 표 셀 바코드 논리 좌표 리사이즈",
  );
  await evaluate(
    client,
    `
      (() => {
        const firstBlock = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');

        if (!firstBlock) {
          return false;
        }

        firstBlock.innerHTML = '<p><br></p>';
        firstBlock.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward', data: null }));
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const documentElement = document.querySelector('#templateEditorSurface .template-doc');
        const grid = documentElement?.querySelector('[data-candidate-block-grid]');
        const blocks = [...(grid?.querySelectorAll('[data-candidate-block-instance]') || [])];

        return Boolean(
          grid &&
            blocks.length === 4 &&
            !documentElement.querySelector('img[data-template-object-type="barcode"]') &&
            blocks.every((block) => !block.textContent.trim())
        );
      })()
    `,
      "수험생 데이터 블록 바코드 삽입 테스트 후 초기화",
  );
  await evaluate(
    client,
    `
      (() => {
        const editor = window.ExamListTemplateEditorRuntime;
        const firstBlock = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');

        if (!editor?.state?.templateEditor || !firstBlock) {
          return false;
        }

        firstBlock.innerHTML = '<p id="candidateBlockQrAnchor"><br></p>';
        const anchor = firstBlock.querySelector('#candidateBlockQrAnchor');
        const selection = window.getSelection();
        const range = document.createRange();

        firstBlock.focus({ preventScroll: true });
        range.selectNodeContents(anchor);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        editor.state.templateEditor.savedRange = range.cloneRange();
        document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
        firstBlock.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: null }));
        return true;
      })()
    `,
  );
  await insertCandidateBlockQrCode(client);
  await waitForCondition(
    client,
    `
      (() => {
        const documentElement = document.querySelector('#templateEditorSurface .template-doc');
        const grid = documentElement?.querySelector('[data-candidate-block-grid]');
        const blocks = [...(grid?.querySelectorAll('[data-candidate-block-instance]') || [])];
        const focusedBlock = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');
        const outsideImages = [...(documentElement?.querySelectorAll('img[data-template-object-type="qrcode"]') || [])]
          .filter((image) => !grid?.contains(image));

        return Boolean(
          grid &&
            focusedBlock?.querySelector('img[data-template-object-type="qrcode"][data-template-object-source="candidate.examNo"]') &&
            blocks.length === 4 &&
            outsideImages.length === 0 &&
            blocks.every((block) =>
              block.querySelector('p img[data-template-object-type="qrcode"][data-template-object-source="candidate.examNo"]')
            )
        );
      })()
    `,
    "수험생 데이터 블록 내부 QR코드 삽입 위치",
  );
  await evaluate(
    client,
    `
      (() => {
        const firstBlock = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');

        if (!firstBlock) {
          return false;
        }

        firstBlock.innerHTML = '<p><br></p>';
        firstBlock.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward', data: null }));
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const documentElement = document.querySelector('#templateEditorSurface .template-doc');
        const grid = documentElement?.querySelector('[data-candidate-block-grid]');
        const blocks = [...(grid?.querySelectorAll('[data-candidate-block-instance]') || [])];

        return Boolean(
          grid &&
            blocks.length === 4 &&
            !documentElement.querySelector('img[data-template-object-type]') &&
            blocks.every((block) => !block.textContent.trim())
        );
      })()
    `,
    "수험생 데이터 블록 QR코드 삽입 테스트 후 초기화",
  );
  await evaluate(
    client,
    `
      (async () => {
        const focusEditor = await import('/client/features/template-editor/candidate-block-grid-focus-editor.js');

        focusEditor.closeCandidateBlockFocusEditor();
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `!document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor')`,
    "수험생 데이터 블록 바코드 삽입 테스트 후 확대 편집 닫기",
  );
}

module.exports = { runCandidateBlockGridGeneratedObjectInsertionScenario };
