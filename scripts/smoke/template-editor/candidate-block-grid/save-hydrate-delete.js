const {
  dispatchBrowserKey,
  dispatchBrowserMouseClick,
  dispatchBrowserMouseClickAtPoint,
  evaluate,
  getBrowserPoint,
  waitForCondition
} = require("../../../smoke-browser-cdp");

async function runCandidateBlockGridSaveHydrateDeleteScenario(context) {
  const { client } = context;
    await dispatchBrowserMouseClick(client, '[data-action="save-template-layout"]');
    await waitForCondition(
      client,
      `document.querySelector('#examlist-toast-root')?.textContent.includes('양식을 저장했습니다.')`,
      "수험생 데이터 블록 저장 완료",
    );
    const savedCandidateBlockState = JSON.parse(
      await evaluate(
        client,
        `
          (async () => {
            const templateId = decodeURIComponent(location.pathname.match(/\\/templates\\/([^/]+)\\/edit/)?.[1] || "");
            const payload = await fetch('/api/pdf-templates/' + encodeURIComponent(templateId)).then((response) => response.json());
            const contentPage = payload?.layout?.pages?.find((page) => page.type === 'content');
            const savedHtml = String(contentPage?.settings?.documentHtml || '');
            const savedBlockTemplateHtml = String(contentPage?.settings?.candidateBlockGrid?.blockTemplateHtml || '');
            const hasRuntimeBlockClass = [...savedHtml.matchAll(/class="([^"]*)"/g)]
              .some((match) => String(match[1] || '').split(/\\s+/).includes('examlist-candidate-block'));

            return JSON.stringify({
              hasBlockTemplate: savedBlockTemplateHtml.trim() === '<p><br></p>',
              hasRuntimeBlockClass,
              hasRuntimeBlockInstance: savedHtml.includes('data-candidate-block-instance'),
              hasStoragePlaceholder: savedHtml.includes('data-candidate-block-grid="true"')
            });
          })()
        `,
      ),
    );

    if (
      !savedCandidateBlockState.hasStoragePlaceholder ||
      !savedCandidateBlockState.hasBlockTemplate ||
      savedCandidateBlockState.hasRuntimeBlockClass ||
      savedCandidateBlockState.hasRuntimeBlockInstance
    ) {
      throw new Error(`수험생 데이터 저장 HTML 정규화 실패: ${JSON.stringify(savedCandidateBlockState)}`);
    }
    await waitForCondition(
      client,
      `document.querySelectorAll('#templateEditorSurface [data-candidate-block-instance]').length === 4`,
      "저장 후 수험생 데이터 블록 재수화",
    );
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const blocks = [...document.querySelectorAll('#templateEditorSurface [data-candidate-block-instance]')];

          return Boolean(
            grid &&
              !grid.classList.contains('is-selected-candidate-block-grid') &&
              blocks.length === 4 &&
              blocks.every((block) => block.getAttribute('contenteditable') === 'false')
          );
        })()
      `,
      "저장 후 수험생 데이터 블록 비선택 읽기 전용 진입",
    );
    const savedCandidateBlockInteriorPoint = await getBrowserPoint(
      client,
      `(() => {
        const block = document.querySelector('#templateEditorSurface [data-candidate-block-instance]');
        const rect = block?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "저장 후 수험생 데이터 블록 내부 클릭 시작",
    );
    await dispatchBrowserMouseClickAtPoint(client, savedCandidateBlockInteriorPoint);
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const focusedBlock = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor');
          const sourceBlock = grid?.querySelector('[data-candidate-block-template-role="source"]');

          return Boolean(
            grid &&
              sourceBlock &&
              focusedBlock &&
              focusedBlock.matches('[data-candidate-block-modal-editor-surface]') &&
              sourceBlock !== focusedBlock &&
              sourceBlock.getAttribute('contenteditable') === 'false' &&
              focusedBlock.getAttribute('contenteditable') === 'true' &&
              !grid.classList.contains('is-selected-candidate-block-grid')
          );
        })()
      `,
      "저장 후 수험생 데이터 블록 내부 클릭 확대 편집 표시",
    );
    await dispatchBrowserMouseClick(client, "[data-candidate-block-focus-close]");
    await waitForCondition(
      client,
      `!document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor') && !document.querySelector('[data-candidate-block-focus-layer]')`,
      "저장 후 수험생 데이터 블록 확대 편집 닫기",
    );
    const savedCandidateBlockBorderPoint = await getBrowserPoint(
      client,
      `(() => {
        const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
        const rect = grid?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + 2, y: rect.top + rect.height / 2 };
      })()`,
      "저장 후 수험생 데이터 블록 외곽선 선택 시작",
    );
    await dispatchBrowserMouseClickAtPoint(client, savedCandidateBlockBorderPoint);
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');

          return Boolean(
            grid &&
              grid.classList.contains('is-selected-candidate-block-grid') &&
              document.activeElement === grid
          );
        })()
      `,
      "저장 후 수험생 데이터 블록 외곽선 클릭 선택",
    );
    await evaluate(
      client,
      `
        (() => {
          const firstBlock = document.querySelector('#templateEditorSurface [data-candidate-block-instance]');

          if (!firstBlock) {
            return false;
          }

          firstBlock.innerHTML = '<p>삭제 후 재생성 검증</p>';
          firstBlock.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '삭제 후 재생성 검증' }));
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const blocks = [...document.querySelectorAll('#templateEditorSurface [data-candidate-block-instance]')];

          return Boolean(
            blocks.length === 4 &&
              blocks.every((block) => block.textContent.includes('삭제 후 재생성 검증'))
          );
        })()
      `,
      "수험생 데이터 블록 삭제 전 템플릿 동기화",
    );
    await dispatchBrowserMouseClickAtPoint(client, savedCandidateBlockBorderPoint);
    await waitForCondition(
      client,
      `document.querySelector('#templateEditorSurface [data-candidate-block-grid]')?.classList.contains('is-selected-candidate-block-grid')`,
      "수험생 데이터 블록 삭제 전 외곽선 재선택",
    );
    await dispatchBrowserKey(client, "Backspace", { code: "Backspace", keyCode: 8 });
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');

          return Boolean(
            grid &&
              grid.classList.contains('is-selected-candidate-block-grid') &&
              document.activeElement === grid
          );
        })()
      `,
      "수험생 데이터 블록 개체 선택 Backspace 삭제 방지",
    );
    await evaluate(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const documentElement = surface?.querySelector('.template-doc');
          const grid = documentElement?.querySelector('[data-candidate-block-grid]');

          if (!surface || !documentElement || !grid) {
            return false;
          }

          let outsideHost = [...documentElement.children].find((element) =>
            element instanceof HTMLElement &&
              !element.matches('[data-candidate-block-grid]') &&
              !element.closest('[data-candidate-block-grid]') &&
              element.matches('p, div, h1, h2, h3, blockquote, ul, ol')
          );

          if (!outsideHost) {
            outsideHost = document.createElement('p');
            documentElement.append(outsideHost);
          }

          outsideHost.id = 'candidateBlockBackspaceBoundaryHost';
          outsideHost.innerHTML = '<br>';

          const selection = window.getSelection();
          const range = document.createRange();

          range.selectNodeContents(outsideHost);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
          surface.focus({ preventScroll: true });
          return document.activeElement === surface &&
            grid.classList.contains('is-selected-candidate-block-grid');
        })()
      `,
    );
    await dispatchBrowserKey(client, "Backspace", { code: "Backspace", keyCode: 8 });
    await waitForCondition(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const grid = surface?.querySelector('[data-candidate-block-grid]');

          return Boolean(
            surface &&
              grid &&
              surface.contains(grid)
          );
        })()
      `,
      "수험생 데이터 블록 밖 빈 커서 Backspace 삭제 방지",
    );
    await dispatchBrowserMouseClickAtPoint(client, savedCandidateBlockBorderPoint);
    await waitForCondition(
      client,
      `document.querySelector('#templateEditorSurface [data-candidate-block-grid]')?.classList.contains('is-selected-candidate-block-grid')`,
      "수험생 데이터 블록 Delete 삭제 전 외곽선 재선택",
    );
    await dispatchBrowserKey(client, "Delete", { code: "Delete", keyCode: 46 });
    await waitForCondition(
      client,
      `!document.querySelector('#templateEditorSurface [data-candidate-block-grid]')`,
      "수험생 데이터 블록 모음 삭제",
    );
    await evaluate(
      client,
      `
        (() => {
          const createButton = document.querySelector('[data-examlist-block-grid-create]');

          if (!(createButton instanceof HTMLButtonElement) || createButton.disabled) {
            return false;
          }

          createButton.click();
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const blocks = [...document.querySelectorAll('#templateEditorSurface [data-candidate-block-instance]')];

          return Boolean(
            blocks.length === 4 &&
              blocks.every((block) => !block.textContent.trim() && block.querySelector('p'))
          );
        })()
      `,
      "수험생 데이터 블록 삭제 후 빈 블록 재생성",
    );
    const recreatedCandidateBlockBorderPoint = await getBrowserPoint(
      client,
      `(() => {
        const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
        const rect = grid?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + 2, y: rect.top + rect.height / 2 };
      })()`,
      "재생성 수험생 데이터 블록 외곽선 선택 시작",
    );
    await dispatchBrowserMouseClickAtPoint(client, recreatedCandidateBlockBorderPoint);
    await waitForCondition(
      client,
      `document.querySelector('#templateEditorSurface [data-candidate-block-grid]')?.classList.contains('is-selected-candidate-block-grid')`,
      "재생성 수험생 데이터 블록 외곽선 선택",
    );
    await dispatchBrowserKey(client, "Delete", { code: "Delete", keyCode: 46 });
    await waitForCondition(
      client,
      `!document.querySelector('#templateEditorSurface [data-candidate-block-grid]')`,
      "수험생 데이터 블록 재생성 검증 후 정리",
    );
}

module.exports = { runCandidateBlockGridSaveHydrateDeleteScenario };
