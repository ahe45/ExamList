const {
  dispatchBrowserKey,
  dispatchBrowserMouseClickAtPoint,
  evaluate,
  getBrowserPoint,
  waitForCondition
} = require("../../../smoke-browser-cdp");

async function runCandidateBlockGridSetupSelectionScenario(context) {
  const { client } = context;
    await waitForCondition(
      client,
      `Boolean(window.ExamListTemplateEditorRuntime?.setHtml && document.querySelector('#templateEditorSurface'))`,
      "수험생 데이터 블록 테스트 편집기 런타임 준비",
    );
    await waitForCondition(
      client,
      `document.querySelector('#templateEditorSurface')?.innerHTML.length > 0`,
      "수험생 데이터 블록 테스트 기본 양식 로드",
    );
    await evaluate(
      client,
      `
        (() => {
          window.ExamListTemplateEditorRuntime?.setHtml?.(
            '<div class="template-doc"><p><br></p></div>',
            { resetHistory: false, notify: false }
          );
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `Boolean(document.querySelector('#templateEditorSurface .template-doc') && !document.querySelector('#templateEditorSurface [data-candidate-block-grid]'))`,
      "수험생 데이터 블록 테스트 문서 적용",
    );
    await evaluate(
      client,
      `
        (() => {
          const setControlValue = (selector, value) => {
            const control = document.querySelector(selector);

            if (!control) {
              return false;
            }

            control.value = value;
            control.dispatchEvent(new Event('input', { bubbles: true }));
            control.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          };
          const portraitControl = document.querySelector('[data-template-page-setting="orientation"][value="portrait"]');

          if (!portraitControl) {
            return false;
          }

          portraitControl.checked = true;
          portraitControl.dispatchEvent(new Event('change', { bubbles: true }));

          return setControlValue('[data-template-page-setting="size"]', 'A4') &&
            setControlValue('[data-template-page-setting="marginTop"]', '10') &&
            setControlValue('[data-template-page-setting="marginRight"]', '10') &&
            setControlValue('[data-template-page-setting="marginBottom"]', '10') &&
            setControlValue('[data-template-page-setting="marginLeft"]', '10');
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const documentElement = surface?.querySelector('.template-doc');
          const surfaceStyle = surface ? getComputedStyle(surface) : null;

          return Boolean(
            documentElement?.dataset.templatePageSize === 'A4' &&
              documentElement.dataset.templatePageOrientation === 'portrait' &&
              documentElement.dataset.templatePageMarginTop === '10' &&
              documentElement.dataset.templatePageMarginRight === '10' &&
              documentElement.dataset.templatePageMarginBottom === '10' &&
              documentElement.dataset.templatePageMarginLeft === '10' &&
              surfaceStyle?.paddingTop === '38px'
          );
        })()
      `,
      "수험생 데이터 블록 테스트 A4 10mm 여백 적용",
    );
    await evaluate(
      client,
      `
        (() => {
          const columnsControl = document.querySelector('[data-examlist-block-grid-setting="columns"]');
          const rowsControl = document.querySelector('[data-examlist-block-grid-setting="rows"]');
          const createButton = document.querySelector('[data-examlist-block-grid-create]');

          if (!columnsControl || !rowsControl || !createButton) {
            return false;
          }

          columnsControl.value = '2';
          rowsControl.value = '2';
          columnsControl.dispatchEvent(new Event('input', { bubbles: true }));
          rowsControl.dispatchEvent(new Event('input', { bubbles: true }));
          createButton.click();
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `document.querySelectorAll('#templateEditorSurface [data-candidate-block-instance]').length === 4`,
      "사진형 반복 블록 생성 버튼 삽입",
    );
    await waitForCondition(
      client,
      `
        (() => {
          const blocks = [...document.querySelectorAll('#templateEditorSurface [data-candidate-block-instance]')];
          const sourceBlock = blocks[0];
          const previewBlock = blocks[1];
          const sourceStyle = sourceBlock ? getComputedStyle(sourceBlock) : null;
          const previewStyle = previewBlock ? getComputedStyle(previewBlock) : null;

          return Boolean(
            blocks.length === 4 &&
              blocks.every((block) => block.getAttribute('contenteditable') === 'false') &&
              sourceStyle &&
              previewStyle &&
              sourceStyle.borderStyle === previewStyle.borderStyle &&
              sourceStyle.borderColor === previewStyle.borderColor &&
              sourceStyle.backgroundColor === 'rgb(255, 255, 255)' &&
              previewStyle.backgroundColor === 'rgb(255, 255, 255)' &&
              sourceStyle.cursor === 'zoom-in' &&
              previewStyle.cursor === 'zoom-in' &&
              !String(previewStyle.backgroundImage || '').includes('repeating-linear-gradient')
          );
        })()
      `,
      "수험생 데이터 블록 캔버스 읽기 전용 표시",
    );
    await waitForCondition(
      client,
      `document.querySelector('#templateEditorSurface [data-candidate-block-grid]')?.classList.contains('is-selected-candidate-block-grid')`,
      "수험생 데이터 블록 모음 개체 선택",
    );
    await waitForCondition(
      client,
      `
        (() => {
          const documentElement = document.querySelector('#templateEditorSurface .template-doc');
          const grid = documentElement?.querySelector('[data-candidate-block-grid]');
          const outsideHosts = [...(documentElement?.children || [])].filter((element) =>
            element !== grid &&
              !element.closest('[data-candidate-block-grid]') &&
              /^(P|DIV|H1|H2|H3|BLOCKQUOTE|UL|OL)$/i.test(element.tagName)
          );

          return Boolean(documentElement && grid && outsideHosts.length > 0);
        })()
      `,
      "수험생 데이터 블록 외부 본문 입력 위치 유지",
    );
    await evaluate(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const documentElement = surface?.querySelector('.template-doc');
          const surfaceStyle = surface ? getComputedStyle(surface) : null;
          const documentRect = documentElement?.getBoundingClientRect();

          window.__examlistCandidateBlockPageMetrics = surfaceStyle && documentRect && documentElement
            ? {
                documentHeight: documentRect.height,
                documentWidth: documentRect.width,
                marginBottom: documentElement.dataset.templatePageMarginBottom,
                marginLeft: documentElement.dataset.templatePageMarginLeft,
                marginRight: documentElement.dataset.templatePageMarginRight,
                marginTop: documentElement.dataset.templatePageMarginTop,
                paddingBottom: surfaceStyle.paddingBottom,
                paddingLeft: surfaceStyle.paddingLeft,
                paddingRight: surfaceStyle.paddingRight,
                paddingTop: surfaceStyle.paddingTop
              }
            : null;
          return Boolean(window.__examlistCandidateBlockPageMetrics);
        })()
      `,
    );
    const candidateBlockOutsidePoint = await getBrowserPoint(
      client,
      `(() => {
        const documentElement = document.querySelector('#templateEditorSurface .template-doc');
        const grid = documentElement?.querySelector('[data-candidate-block-grid]');
        const host = [...(documentElement?.children || [])].find((element) =>
          element !== grid &&
            !element.closest('[data-candidate-block-grid]') &&
            /^(P|DIV|H1|H2|H3|BLOCKQUOTE|UL|OL)$/i.test(element.tagName)
        );
        const rect = host?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + Math.min(24, Math.max(8, rect.width / 2)), y: rect.top + Math.max(8, rect.height / 2) };
      })()`,
      "수험생 데이터 블록 외부 본문 클릭 시작",
    );
    await dispatchBrowserMouseClickAtPoint(client, candidateBlockOutsidePoint);
    await client.send("Input.insertText", { text: "블록밖입력" });
    await dispatchBrowserKey(client, "Enter", { code: "Enter", keyCode: 13 });
    await client.send("Input.insertText", { text: "다음줄" });
    await waitForCondition(
      client,
      `
        (() => {
          const documentElement = document.querySelector('#templateEditorSurface .template-doc');
          const grid = documentElement?.querySelector('[data-candidate-block-grid]');
          const outsideText = [...(documentElement?.childNodes || [])]
            .filter((node) => node !== grid && !(node.nodeType === Node.ELEMENT_NODE && node.closest('[data-candidate-block-grid]')))
            .map((node) => node.textContent || '')
            .join(' ');
          const blockText = grid?.textContent || '';
          const selection = window.getSelection();
          const anchorElement = selection?.anchorNode?.nodeType === Node.ELEMENT_NODE
            ? selection.anchorNode
            : selection?.anchorNode?.parentElement || null;
          const beforeMetrics = window.__examlistCandidateBlockPageMetrics;
          const surface = document.querySelector('#templateEditorSurface');
          const surfaceStyle = surface ? getComputedStyle(surface) : null;
          const documentRect = documentElement?.getBoundingClientRect();
          const pageMarginsAreStable = Boolean(
            beforeMetrics &&
              surfaceStyle &&
              documentRect &&
              documentElement.dataset.templatePageMarginTop === beforeMetrics.marginTop &&
              documentElement.dataset.templatePageMarginRight === beforeMetrics.marginRight &&
              documentElement.dataset.templatePageMarginBottom === beforeMetrics.marginBottom &&
              documentElement.dataset.templatePageMarginLeft === beforeMetrics.marginLeft &&
              surfaceStyle.paddingTop === beforeMetrics.paddingTop &&
              surfaceStyle.paddingRight === beforeMetrics.paddingRight &&
              surfaceStyle.paddingBottom === beforeMetrics.paddingBottom &&
              surfaceStyle.paddingLeft === beforeMetrics.paddingLeft &&
              Math.abs(documentRect.width - beforeMetrics.documentWidth) <= 1 &&
              Math.abs(documentRect.height - beforeMetrics.documentHeight) <= 1
          );

          return Boolean(
            documentElement &&
              grid &&
              outsideText.includes('블록밖입력') &&
              outsideText.includes('다음줄') &&
              !blockText.includes('블록밖입력') &&
              !blockText.includes('다음줄') &&
              !anchorElement?.closest?.('[data-candidate-block-instance]') &&
              pageMarginsAreStable
          );
        })()
      `,
      "수험생 데이터 블록 외부 본문 입력 및 여백 유지",
    );
    await evaluate(
      client,
      `
        (() => {
          const documentElement = document.querySelector('#templateEditorSurface .template-doc');
          const grid = documentElement?.querySelector('[data-candidate-block-grid]');
          const outsideBlocks = [...(documentElement?.children || [])].filter((element) =>
            element !== grid &&
              !element.closest('[data-candidate-block-grid]') &&
              /^(P|DIV)$/i.test(element.tagName)
          );

          outsideBlocks.forEach((element, index) => {
            if (index === 0) {
              element.innerHTML = '<br>';
            } else {
              element.remove();
            }
          });
          document.querySelector('#templateEditorSurface')?.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward', data: null }));
          return true;
        })()
      `,
    );
    const candidateBlockInteriorPoint = await getBrowserPoint(
      client,
      `(() => {
        const block = document.querySelector('#templateEditorSurface [data-candidate-block-instance]');
        const rect = block?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "수험생 데이터 블록 내부 클릭 시작",
    );
    await dispatchBrowserMouseClickAtPoint(client, candidateBlockInteriorPoint);
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const focusedBlock = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor');
          const sourceBlock = grid?.querySelector('[data-candidate-block-template-role="source"]');
          const gridBlocks = [...(grid?.querySelectorAll('[data-candidate-block-instance]') || [])];
          const layer = document.querySelector('[data-candidate-block-focus-layer]');
          const blankParagraph = focusedBlock?.querySelector('p:only-child');
          const blankParagraphRect = blankParagraph?.getBoundingClientRect();
          const hasEditableContent = Boolean(
            focusedBlock?.querySelector('table, img, .template-token') ||
              String(focusedBlock?.textContent || '').trim()
          );

          return Boolean(
            grid &&
              focusedBlock &&
              layer &&
              sourceBlock &&
              gridBlocks.length === 4 &&
              sourceBlock !== focusedBlock &&
              sourceBlock.getAttribute('contenteditable') === 'false' &&
              focusedBlock.getAttribute('contenteditable') === 'true' &&
              focusedBlock.matches('[data-candidate-block-modal-editor-surface]') &&
              focusedBlock.dataset.templateEditorRuntimeActiveSurface === 'true' &&
              (
                hasEditableContent ||
                (blankParagraph && blankParagraphRect && blankParagraphRect.height > 0)
              ) &&
              !grid.classList.contains('is-selected-candidate-block-grid')
          );
        })()
      `,
      "수험생 데이터 블록 내부 클릭 확대 편집 표시",
    );
    await evaluate(
      client,
      `
        (() => {
          const focusedBlock = document.querySelector('#templateEditorSurface .examlist-candidate-block.is-candidate-block-focus-editor');
          const tagButton = [...document.querySelectorAll('#templateTagStrip .template-tag-button')]
            .find((button) => button.dataset.templateTag === '#캠퍼스명');

          if (!focusedBlock || !tagButton) {
            return false;
          }

          focusedBlock.innerHTML = '<p>데이터블록태그치환스모크</p>';
          const range = document.createRange();
          range.selectNodeContents(focusedBlock);
          const selection = window.getSelection();

          selection.removeAllRanges();
          selection.addRange(range);
          window.ExamListTemplateEditorRuntime.state.templateEditor.savedRange = range.cloneRange();
          tagButton.click();
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const focusedBlock = document.querySelector('#templateEditorSurface .examlist-candidate-block.is-candidate-block-focus-editor');
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const canvasBlocks = [...(grid?.querySelectorAll('[data-candidate-block-instance]') || [])];
          const sourceBlock = grid?.querySelector('[data-candidate-block-template-role="source"]');
          const previewBlocks = canvasBlocks.filter((block) => block.classList.contains('is-candidate-block-template-preview'));
          const oldText = '데이터블록태그치환스모크';
          const focusedToken = focusedBlock?.querySelector('.template-token[data-template-tag-value="candidate.campusName"]');
          const sourceToken = sourceBlock?.querySelector('.template-token[data-template-tag-value="candidate.campusName"]');
          const previewTokens = previewBlocks.map((block) => block.querySelector('.template-token[data-template-tag-value="candidate.campusName"]'));

          return Boolean(
            focusedBlock &&
              grid &&
              sourceBlock &&
              focusedToken &&
              sourceToken &&
              canvasBlocks.length === 4 &&
              previewBlocks.length === 3 &&
              previewTokens.every(Boolean) &&
              sourceBlock.classList.contains('is-candidate-block-template-source') &&
              canvasBlocks.every((block) => !block.textContent.includes(oldText)) &&
              !focusedBlock.textContent.includes(oldText)
          );
        })()
      `,
      "수험생 데이터 블록 데이터태그 치환 후 1행1열 미리보기 동기화",
    );
    await waitForCondition(
      client,
      `
        (() => {
          const focusedBlock = document.querySelector('#templateEditorSurface .examlist-candidate-block.is-candidate-block-focus-editor');
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const sourceBlock = grid?.querySelector('[data-candidate-block-template-role="source"]');
          const backdrop = document.querySelector('[data-candidate-block-focus-backdrop]');
          const backdropPiece = backdrop?.querySelector('[data-candidate-block-focus-backdrop-piece]');
          const layer = document.querySelector('[data-candidate-block-focus-layer]');
          const viewport = layer?.querySelector('.examlist-candidate-block-modal-editor-viewport');
          const recognitionOverlay = document.querySelector('.template-recognition-marks-overlay');
          const title = layer?.querySelector('.examlist-candidate-block-focus-title');
          const blockRect = focusedBlock?.getBoundingClientRect();
          const layerRect = layer?.getBoundingClientRect();
          const viewportRect = viewport?.getBoundingClientRect();

          if (!focusedBlock || !sourceBlock || !backdrop || !backdropPiece || !layer || !viewport || !title || !blockRect || !layerRect || !viewportRect) {
            return false;
          }

          const topElement = document.elementFromPoint(blockRect.left + blockRect.width / 2, blockRect.top + blockRect.height / 2);
          const backdropStyle = getComputedStyle(backdropPiece);
          const focusedBlockStyle = getComputedStyle(focusedBlock);
          const layerStyle = getComputedStyle(layer);
          const recognitionOverlayStyle = recognitionOverlay ? getComputedStyle(recognitionOverlay) : null;
          const layerZIndex = Number.parseInt(getComputedStyle(layer).zIndex, 10);
          const backdropZIndex = Number.parseInt(backdropStyle.zIndex, 10);

          return Boolean(
            focusedBlock.contains(topElement) &&
              Number.isFinite(backdropZIndex) &&
              Number.isFinite(layerZIndex) &&
              backdropZIndex < layerZIndex &&
              backdropStyle.backgroundColor === 'rgba(15, 23, 42, 0.24)' &&
              backdropStyle.pointerEvents === 'auto' &&
              backdrop.querySelectorAll('[data-candidate-block-focus-backdrop-piece]').length === 4 &&
              title.textContent.trim() === '데이터 블록 편집' &&
              sourceBlock.getAttribute('contenteditable') === 'false' &&
              !sourceBlock.classList.contains('is-candidate-block-focus-editor') &&
              focusedBlockStyle.backgroundClip === 'border-box' &&
              focusedBlockStyle.outlineStyle === 'none' &&
              layer.contains(focusedBlock) &&
              viewport.contains(focusedBlock) &&
              viewportRect.width > 0 &&
              viewportRect.height > 0 &&
              blockRect.width > 0 &&
              blockRect.height > 0 &&
              layerStyle.backgroundColor === 'rgb(255, 255, 255)' &&
              layerStyle.borderStyle === 'solid' &&
              layerStyle.borderRadius === '8px' &&
              (!recognitionOverlayStyle || recognitionOverlayStyle.visibility === 'hidden')
          );
        })()
      `,
      "수험생 데이터 블록 확대 편집 패널 가시성",
    );
    await waitForCondition(
      client,
      `
        (() => {
          const page = document.querySelector('#templateEditorSurface')?.closest('.template-editor-page');
          const layer = document.querySelector('[data-candidate-block-focus-layer]');
          const backdrop = document.querySelector('[data-candidate-block-focus-backdrop]');
          const pageRect = page?.getBoundingClientRect();
          const layerRect = layer?.getBoundingClientRect();

          if (!pageRect || !layerRect || !backdrop) {
            return false;
          }

          const backdropPieces = [...backdrop.querySelectorAll('[data-candidate-block-focus-backdrop-piece]')];

          return backdropPieces.length === 4 && backdropPieces.every((piece) => {
            const rect = piece.getBoundingClientRect();

            return rect.width >= 0 &&
              rect.height >= 0 &&
              getComputedStyle(piece).pointerEvents === 'auto';
          });
        })()
      `,
      "수험생 데이터 블록 확대 편집 캔버스 백드롭 차단",
    );
    const candidateBlockFocusPanelPoint = await getBrowserPoint(
      client,
      `(() => {
        const layer = document.querySelector('[data-candidate-block-focus-layer]');
        const rect = layer?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + 18, y: rect.top + 18 };
      })()`,
      "수험생 데이터 블록 확대 편집 패널 여백 클릭 시작",
    );
    await waitForCondition(
      client,
      `
        (() => {
          const hitElement = document.elementFromPoint(${JSON.stringify(candidateBlockFocusPanelPoint.x)}, ${JSON.stringify(candidateBlockFocusPanelPoint.y)});

          return Boolean(hitElement?.closest?.('[data-candidate-block-focus-layer]'));
        })()
      `,
      "수험생 데이터 블록 확대 편집 패널 여백 포인터 차단",
    );
    await dispatchBrowserMouseClickAtPoint(client, candidateBlockFocusPanelPoint);
    await waitForCondition(
      client,
      `
        (() => {
          const focusedBlock = document.querySelector('#templateEditorSurface .examlist-candidate-block.is-candidate-block-focus-editor');
          const selectedGrid = document.querySelector('#templateEditorSurface [data-candidate-block-grid].is-selected-candidate-block-grid');

          return Boolean(
            focusedBlock &&
              !selectedGrid &&
              document.querySelector('[data-candidate-block-focus-layer]')
          );
        })()
      `,
      "수험생 데이터 블록 확대 편집 패널 여백 클릭 후 유지",
    );
    const candidateBlockFocusPanelEdgePoint = await getBrowserPoint(
      client,
      `(() => {
        const layer = document.querySelector('[data-candidate-block-focus-layer]');
        const rect = layer?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.right - 6, y: rect.top + rect.height / 2 };
      })()`,
      "수험생 데이터 블록 확대 편집 패널 세로 여백 클릭 시작",
    );
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: candidateBlockFocusPanelEdgePoint.x,
      y: candidateBlockFocusPanelEdgePoint.y,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const layer = document.querySelector('[data-candidate-block-focus-layer]');
          const layerRect = layer?.getBoundingClientRect();
          const focusedBlock = document.querySelector('#templateEditorSurface .examlist-candidate-block.is-candidate-block-focus-editor');
          const blockRect = focusedBlock?.getBoundingClientRect();

          if (!layerRect || !blockRect) {
            return false;
          }

          const points = [
            { x: layerRect.left + 6, y: layerRect.top + layerRect.height / 2 },
            { x: layerRect.right - 6, y: layerRect.top + layerRect.height / 2 },
          ];

          return points.every((point) => {
            const hitElement = document.elementFromPoint(point.x, point.y);
            const hitStyle = hitElement ? getComputedStyle(hitElement) : null;

            return Boolean(
              hitElement?.closest?.('[data-candidate-block-focus-layer]') &&
                !hitElement.closest('[data-candidate-block-grid]') &&
                hitStyle?.cursor === 'default'
            );
          }) &&
            blockRect.left - layerRect.left >= 24 &&
            layerRect.right - blockRect.right >= 24;
        })()
      `,
      "수험생 데이터 블록 확대 편집 패널 세로 여백 포인터 차단",
    );
    await dispatchBrowserMouseClickAtPoint(client, candidateBlockFocusPanelEdgePoint);
    await waitForCondition(
      client,
      `
        (() => {
          const focusedBlock = document.querySelector('#templateEditorSurface .examlist-candidate-block.is-candidate-block-focus-editor');
          const selectedGrid = document.querySelector('#templateEditorSurface [data-candidate-block-grid].is-selected-candidate-block-grid');

          return Boolean(
            focusedBlock &&
              !selectedGrid &&
              document.querySelector('[data-candidate-block-focus-layer]')
          );
        })()
      `,
      "수험생 데이터 블록 확대 편집 패널 세로 여백 클릭 후 유지",
    );
    await evaluate(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const grid = surface?.querySelector('[data-candidate-block-grid]');
          const layer = document.querySelector('[data-candidate-block-focus-layer]');
          const layerRect = layer?.getBoundingClientRect();

          if (!surface || !grid || !layerRect) {
            return false;
          }

          grid.classList.remove('is-selected-candidate-block-grid');
          grid.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true,
            button: 0,
            buttons: 1,
            cancelable: true,
            clientX: layerRect.right - 6,
            clientY: layerRect.top + layerRect.height / 2,
            pointerId: 1,
            pointerType: 'mouse'
          }));
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const focusedBlock = document.querySelector('#templateEditorSurface .examlist-candidate-block.is-candidate-block-focus-editor');
          const selectedGrid = document.querySelector('#templateEditorSurface [data-candidate-block-grid].is-selected-candidate-block-grid');

          return Boolean(
            focusedBlock &&
              !selectedGrid &&
              document.querySelector('[data-candidate-block-focus-layer]')
          );
        })()
      `,
      "수험생 데이터 블록 확대 편집 좌표 누수 클릭 후 유지",
    );
    const candidateBlockFocusClosePoint = await getBrowserPoint(
      client,
      `(() => {
        const closeButton = document.querySelector('[data-candidate-block-focus-close]');
        const rect = closeButton?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "수험생 데이터 블록 확대 편집 닫기 시작",
    );
    await dispatchBrowserMouseClickAtPoint(client, candidateBlockFocusClosePoint);
    await waitForCondition(
      client,
      `
        (() => !document.querySelector('#templateEditorSurface .examlist-candidate-block.is-candidate-block-focus-editor') &&
          !document.querySelector('[data-candidate-block-focus-layer]'))()
      `,
      "수험생 데이터 블록 확대 편집 닫힘",
    );
    const candidateBlockGridBorderPoint = await getBrowserPoint(
      client,
      `(() => {
        const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
        const rect = grid?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + 2, y: rect.top + rect.height / 2 };
      })()`,
      "수험생 데이터 블록 외곽선 선택 시작",
    );
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: candidateBlockGridBorderPoint.x,
      y: candidateBlockGridBorderPoint.y,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');

          return Boolean(
            grid &&
              grid.classList.contains('is-candidate-block-grid-border-hover') &&
              getComputedStyle(grid).cursor === 'pointer'
          );
        })()
      `,
      "수험생 데이터 블록 외곽선 호버 표시",
    );
    await dispatchBrowserMouseClickAtPoint(client, candidateBlockGridBorderPoint);
    await waitForCondition(
      client,
      `document.querySelector('#templateEditorSurface [data-candidate-block-grid]')?.classList.contains('is-selected-candidate-block-grid')`,
      "수험생 데이터 블록 외곽선 클릭 선택",
    );
    await waitForCondition(
      client,
      `
        (() => {
          const handles = [...document.querySelectorAll('#templateEditorSurface [data-candidate-block-grid-resize-handle]')];
          const corners = new Set(handles.map((handle) => handle.dataset.candidateBlockGridResizeCorner));
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const moveHandle = document.querySelector('#templateEditorSurface [data-candidate-block-grid-move-handle]');
          const gridRect = grid?.getBoundingClientRect();
          const moveHandleRect = moveHandle?.getBoundingClientRect();
          const handleCenters = Object.fromEntries(handles.map((handle) => {
            const rect = handle.getBoundingClientRect();

            return [
              handle.dataset.candidateBlockGridResizeCorner,
              {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
              }
            ];
          }));
          const isNear = (value, expected, tolerance = 14) => Math.abs(value - expected) <= tolerance;
          const moveHandleCenter = moveHandleRect
            ? {
                x: moveHandleRect.left + moveHandleRect.width / 2,
                y: moveHandleRect.top + moveHandleRect.height / 2
              }
            : null;
          const moveHandleHitElement = moveHandleCenter
            ? document.elementFromPoint(moveHandleCenter.x, moveHandleCenter.y)
            : null;
          const moveHandleIsOutsideTopLeft = Boolean(
            gridRect &&
              moveHandleRect &&
              moveHandleRect.right <= gridRect.left - 4 &&
              moveHandleRect.bottom <= gridRect.top - 4 &&
              moveHandleHitElement &&
              (moveHandleHitElement === moveHandle ||
                moveHandle.contains(moveHandleHitElement) ||
                moveHandleHitElement.closest?.('[data-candidate-block-grid-move-handle]') === moveHandle)
          );
          const handlesAreOnBorder = Boolean(
            gridRect &&
              isNear(handleCenters['top-left']?.x, gridRect.left) &&
              isNear(handleCenters['top-left']?.y, gridRect.top) &&
              isNear(handleCenters.top?.x, gridRect.left + gridRect.width / 2) &&
              isNear(handleCenters.top?.y, gridRect.top) &&
              isNear(handleCenters['top-right']?.x, gridRect.right) &&
              isNear(handleCenters['top-right']?.y, gridRect.top) &&
              isNear(handleCenters.right?.x, gridRect.right) &&
              isNear(handleCenters.right?.y, gridRect.top + gridRect.height / 2) &&
              isNear(handleCenters['bottom-right']?.x, gridRect.right) &&
              isNear(handleCenters['bottom-right']?.y, gridRect.bottom) &&
              isNear(handleCenters.bottom?.x, gridRect.left + gridRect.width / 2) &&
              isNear(handleCenters.bottom?.y, gridRect.bottom) &&
              isNear(handleCenters['bottom-left']?.x, gridRect.left) &&
              isNear(handleCenters['bottom-left']?.y, gridRect.bottom) &&
              isNear(handleCenters.left?.x, gridRect.left) &&
              isNear(handleCenters.left?.y, gridRect.top + gridRect.height / 2)
          );

          return Boolean(
            grid &&
              moveHandle &&
              getComputedStyle(moveHandle).display !== 'none' &&
              handles.length === 8 &&
              corners.has('top-left') &&
              corners.has('top') &&
              corners.has('top-right') &&
              corners.has('right') &&
              corners.has('bottom') &&
              corners.has('bottom-left') &&
              corners.has('bottom-right') &&
              corners.has('left') &&
              handlesAreOnBorder &&
              moveHandleIsOutsideTopLeft &&
              handles.every((handle) => {
                const rect = handle.getBoundingClientRect();

                return rect.width <= 10 && rect.height <= 10;
              })
          );
        })()
      `,
      "수험생 데이터 블록 8방향 리사이즈 핸들 표시",
    );
}

module.exports = { runCandidateBlockGridSetupSelectionScenario };
