const {
  evaluate,
  waitForCondition
} = require("../../smoke-browser-cdp");

async function runSaveRestoreScenario(context) {
  const { client } = context;
    await waitForCondition(
      client,
      `
        (() => {
          const tags = [...document.querySelectorAll('#templateTagStrip .template-tag-button')]
            .map((button) => ({
              token: button.dataset.templateTag || button.textContent.trim()
            }));
          const tagTexts = tags.map((tag) => tag.token).join('|');
          const groupLabels = [...document.querySelectorAll('#templateTagStrip .template-tag-accordion-summary')]
            .map((summary) => summary.textContent.trim())
            .join('|');
          const searchInput = document.querySelector('#templateTagStrip [data-template-tag-search]');

          return Boolean(
            searchInput &&
              groupLabels.includes('학교 정보') &&
              groupLabels.includes('수험생 정보') &&
            tagTexts.includes('#학교명') &&
              tagTexts.includes('#학교코드') &&
              !tagTexts.includes('#학년도') &&
              tagTexts.includes('#모집년도') &&
              !tagTexts.includes('#지정정렬') &&
              tagTexts.includes('#시험날짜') &&
              tagTexts.includes('#시작시간') &&
              tagTexts.includes('#종료시간') &&
              !tagTexts.includes('#시험시간') &&
              !tagTexts.includes('#시간') &&
              tagTexts.includes('#수험번호') &&
              tagTexts.includes('#가번호') &&
              tagTexts.includes('#조') &&
              tagTexts.includes('#수험생 사진')
          );
        })()
      `,
      "학교 설정 및 수험생 컬럼 데이터 태그 표시",
    );
    await evaluate(
      client,
      `
        (() => {
          const input = document.querySelector('#templateTagStrip [data-template-tag-search]');
          if (!input) {
            return false;
          }
          input.value = '가번호';
          input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '가번호', inputType: 'insertText' }));
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const visibleTags = [...document.querySelectorAll('#templateTagStrip .template-tag-button')]
            .filter((button) => !button.hidden)
            .map((button) => button.dataset.templateTag || button.textContent.trim());
          const hiddenExamNo = [...document.querySelectorAll('#templateTagStrip .template-tag-button')]
            .some((button) => button.hidden && button.dataset.templateTag === '#수험번호');

          return visibleTags.includes('#가번호') && hiddenExamNo;
        })()
      `,
      "데이터 태그 검색 필터 동작",
    );
    await evaluate(
      client,
      `
        (() => {
          const input = document.querySelector('#templateTagStrip [data-template-tag-search]');
          if (!input) {
            return false;
          }
          input.value = '';
          input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
          return true;
        })()
      `,
    );
    await evaluate(
      client,
      `
        (() => new Promise((resolve) => {
          const surface = document.querySelector('#templateEditorSurface');
          const root = surface?.querySelector('.template-doc') || surface;

          if (!surface || !root) {
            resolve(false);
            return;
          }

          surface.focus();

          if (!root.querySelector('.template-token[data-template-tag-value="candidate.examNo"]')) {
            const tokenParagraph = document.createElement('p');
            const token = document.createElement('span');

            token.className = 'template-token';
            token.dataset.templateToken = 'true';
            token.dataset.templateTagValue = 'candidate.examNo';
            token.dataset.templateTagLabel = '#수험번호';
            token.setAttribute('contenteditable', 'false');
            token.setAttribute('spellcheck', 'false');
            token.textContent = '#수험번호';
            tokenParagraph.append(token);
            root.append(tokenParagraph);
          }

          const paragraph = document.createElement('p');
          const textNode = document.createTextNode('');

          paragraph.append(textNode);
          root.append(paragraph);

          const selection = window.getSelection();
          const range = document.createRange();

          range.setStart(textNode, 0);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);

          surface.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
          textNode.textContent = 'ㅎ';
          surface.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            data: 'ㅎ',
            inputType: 'insertCompositionText',
            isComposing: true
          }));
          textNode.textContent = '한글';
          surface.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            data: '한글',
            inputType: 'insertCompositionText',
            isComposing: true
          }));
          surface.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '한글' }));

          requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)));
        }))()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          return Boolean(
            surface &&
              surface.textContent.includes('한글') &&
              !surface.textContent.includes('ㅎ한글') &&
              !surface.dataset.documentComposing
          );
        })()
      `,
      "한글 조합 입력 유지",
    );
    await waitForCondition(
      client,
      `Date.now() >= Number(window.__examlistTemplateEditorObjectInteractionUntil || 0)`,
      "객체 조작 후 저장 액션 가드 해제",
    );
    await evaluate(
      client,
      `
        (() => {
          window.__examlistSmokeLastTemplatePatch = null;
          window.__examlistSmokeLastTemplatePatchError = '';
          document.querySelector('[data-action="save-template-layout"]')?.click();
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const payload = window.__examlistSmokeLastTemplatePatch;
          return Boolean(
            payload &&
              JSON.stringify(payload.layout || {}).includes('한글') &&
              JSON.stringify(payload.layout || {}).includes('candidate.examNo')
          );
        })()
      `,
      "저장 버튼 최신 편집 내용 반영",
    );
    await waitForCondition(
      client,
      `
        (() => {
          const toastRoot = document.querySelector('.toast-root.has-toast');
          const toast = toastRoot?.querySelector('.toast-message');
          return Boolean(
            toastRoot &&
              toast &&
              toast.textContent.trim() === '양식을 저장했습니다.' &&
              !document.querySelector('.template-editor-toast')
          );
        })()
      `,
      "양식 저장 성공 토스트 표시",
    );
    await evaluate(
      client,
      `
        (async () => {
          const originalTemplate = window.__examlistSmokeOriginalTemplate;
          const templateId = window.__examlistSmokeTemplateId;
          const originalFetch = window.__examlistSmokeOriginalFetch || window.fetch.bind(window);

          if (!originalTemplate || !templateId) {
            return false;
          }

          const response = await originalFetch('/api/pdf-templates/' + encodeURIComponent(templateId), {
            body: JSON.stringify({
              description: originalTemplate.description,
              generationUnit: originalTemplate.generationUnit,
              layout: originalTemplate.layout,
              name: originalTemplate.name,
              orientation: originalTemplate.orientation,
              paperPreset: originalTemplate.paperPreset
            }),
            headers: { 'Content-Type': 'application/json' },
            method: 'PATCH'
          });

          return response.ok;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const wrappers = [...(surface?.querySelectorAll('.template-doc') || [])];
          const directWrappers = [...(surface?.children || [])].filter((child) => child.classList.contains('template-doc'));
          const wrapperStyle = directWrappers[0] ? getComputedStyle(directWrappers[0]) : null;

          return Boolean(
            surface &&
              wrappers.length === 1 &&
              directWrappers.length === 1 &&
              wrapperStyle &&
              wrapperStyle.borderTopStyle === 'dashed' &&
              parseFloat(wrapperStyle.borderTopWidth) >= 1 &&
              wrapperStyle.borderTopLeftRadius === '0px' &&
              wrapperStyle.backgroundImage === 'none'
          );
        })()
      `,
      "양식 편집기 여백 경계선 표시 및 래퍼 중복 방지",
    );
    await evaluate(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const documentElement = surface?.querySelector('.template-doc');
          if (!surface) {
            return false;
          }
          (documentElement || surface).insertAdjacentHTML('beforeend', Array.from({ length: 120 }, (_item, index) => '<p>초과 검증 ' + index + '</p>').join(''));
          surface.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '' }));
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const wrappers = [...(surface?.querySelectorAll('.template-doc') || [])];
          const directWrappers = [...(surface?.children || [])].filter((child) => child.classList.contains('template-doc'));
          const documentElement = directWrappers[0] || null;
          const documentRect = documentElement?.getBoundingClientRect();
          const toast = document.querySelector('.toast-root.has-toast .toast-message');
          let contentBottom = documentRect?.top || 0;

          if (documentElement && documentRect) {
            const includeRect = (rect) => {
              if (rect && (rect.width || rect.height)) {
                contentBottom = Math.max(contentBottom, rect.bottom);
              }
            };
            const range = document.createRange();

            range.selectNodeContents(documentElement);
            [...range.getClientRects()].forEach(includeRect);
            range.detach?.();
            [...documentElement.querySelectorAll('blockquote, figure, h1, h2, h3, hr, img, li, ol, p, table, ul, .template-generated-object, .template-token')]
              .forEach((element) => [...element.getClientRects()].forEach(includeRect));
          }

          return Boolean(
            surface &&
              wrappers.length === 1 &&
              directWrappers.length === 1 &&
              documentRect &&
              !surface.textContent.includes('초과 검증') &&
              Math.max(0, Math.ceil(contentBottom - documentRect.bottom)) <= 4 &&
              toast &&
              /여백|영역|초과|넘어/.test(toast.textContent || '')
          );
        })()
      `,
      "A4 영역 초과 입력 차단 후 편집기 유지",
    );
    await waitForCondition(
      client,
      `
        (() => {
          const canvas = document.querySelector('.template-editor-page');
          const properties = document.querySelector('#templatePagePropertiesPanel');
          return Boolean(
            canvas &&
              properties &&
              properties.querySelector('[data-template-page-setting="size"]') &&
              properties.getBoundingClientRect().left > canvas.getBoundingClientRect().right
          );
        })()
      `,
      "양식 관리 캔버스 우측 페이지 속성 패널 표시",
    );
}

module.exports = { runSaveRestoreScenario };
