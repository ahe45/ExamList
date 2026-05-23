const {
  dispatchBrowserKey,
  dispatchBrowserMouseClickAtPoint,
  dispatchBrowserMouseDrag,
  evaluate,
  getBrowserPoint,
  waitForCondition
} = require("../../smoke-browser-cdp");

async function runTableObjectSelectionScenario(context) {
  const { client } = context;
    await waitForCondition(
      client,
      `Boolean(window.ExamListTemplateEditorRuntime?.setHtml && document.querySelector('#templateEditorSurface'))`,
      "일반 표 개체 테스트 편집기 런타임 준비",
    );
    await evaluate(
      client,
      `
        (() => {
          window.ExamListTemplateEditorRuntime?.setHtml?.(
            '<div class="template-doc"><p>표 삭제 테스트</p><table id="plainTableDeleteSmoke" style="width: 240px; table-layout: fixed;"><tbody><tr><td>A1</td><td>B1</td></tr><tr><td>A2</td><td>B2</td></tr><tr><td>A3</td><td>B3</td></tr><tr><td>A4</td><td>B4</td></tr></tbody></table><p id="plainTableAfterMoveText">다른 표</p><table id="plainTableHoverSmoke" style="width: 220px; table-layout: fixed;"><tbody><tr><td>C</td><td>D</td></tr></tbody></table></div>',
            { resetHistory: false, notify: false }
          );
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      "document.querySelector('#plainTableDeleteSmoke') && document.querySelector('#plainTableHoverSmoke')",
      "일반 표 개체 테스트 문서 삽입",
    );
    const plainTableObjectBorderPoint = await getBrowserPoint(
      client,
      `(() => {
        const table = document.querySelector('#plainTableDeleteSmoke');
        table?.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = table?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top - 4 };
      })()`,
      "일반 표 외곽선 선택 시작",
    );

    await client.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: plainTableObjectBorderPoint.x,
      y: plainTableObjectBorderPoint.y,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const overlay = document.querySelector('.template-editor-table-selection:not(.hidden)');

          return Boolean(overlay && overlay.classList.contains('is-hover-only'));
        })()
      `,
      "일반 표 외곽선 호버 표시",
    );
    await dispatchBrowserMouseClickAtPoint(client, plainTableObjectBorderPoint);
    await waitForCondition(
      client,
      `
        (() => {
          const editor = window.ExamListTemplateEditorRuntime;
          const table = document.querySelector('#plainTableDeleteSmoke');
          const handles = document.querySelectorAll('.template-editor-table-selection:not(.hidden).is-selected .template-editor-table-handle');
          const moveHandle = document.querySelector('.template-editor-table-selection:not(.hidden).is-selected .template-editor-table-move-handle');
          const overlay = document.querySelector('.template-editor-table-selection:not(.hidden).is-selected');
          const overlayRect = overlay?.getBoundingClientRect();
          const moveHandleRect = moveHandle?.getBoundingClientRect();
          const moveHandleIsOutsideTopLeft = Boolean(
            overlayRect &&
              moveHandleRect &&
              moveHandleRect.right <= overlayRect.left - 2 &&
              moveHandleRect.bottom <= overlayRect.top - 2
          );

          return Boolean(
              editor?.state?.templateEditor?.selectedTableElement === table &&
              table?.classList.contains('is-selected-table-object') &&
              handles.length === 8 &&
              moveHandle &&
              getComputedStyle(moveHandle).display !== 'none' &&
              moveHandleIsOutsideTopLeft
          );
        })()
      `,
      "일반 표 개체 선택",
    );
    const otherPlainTableObjectBorderPoint = await getBrowserPoint(
      client,
      `(() => {
        const table = document.querySelector('#plainTableHoverSmoke');
        table?.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = table?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top - 4 };
      })()`,
      "다른 일반 표 외곽선 호버 시작",
    );
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: otherPlainTableObjectBorderPoint.x,
      y: otherPlainTableObjectBorderPoint.y,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const selectedTable = document.querySelector('#plainTableDeleteSmoke');
          const hoveredTable = document.querySelector('#plainTableHoverSmoke');
          const selectedOverlay = document.querySelector('.template-editor-table-selection:not(.hidden).is-selected');
          const hoverOverlay = document.querySelector('.template-editor-table-selection:not(.hidden).is-hover-only');
          const hoverMoveHandle = hoverOverlay?.querySelector('.template-editor-table-move-handle');
          const hoverResizeHandles = [...(hoverOverlay?.querySelectorAll('.template-editor-table-handle') || [])];

          return Boolean(
            selectedTable &&
              hoveredTable &&
              selectedOverlay &&
              hoverOverlay &&
              selectedOverlay !== hoverOverlay &&
              selectedOverlay.__templateEditorTableElement === selectedTable &&
              hoverOverlay.__templateEditorTableElement === hoveredTable &&
              getComputedStyle(hoverMoveHandle).display === 'none' &&
              hoverResizeHandles.length === 8 &&
              hoverResizeHandles.every((handle) => getComputedStyle(handle).display === 'none') &&
              document.querySelector('#templateEditorSurface')?.classList.contains('is-table-object-border-hover')
          );
        })()
      `,
      "선택된 표 유지 중 다른 표 개체 호버 UI 표시",
    );
    const plainTableObjectMoveBefore = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const table = document.querySelector('#plainTableDeleteSmoke');
            const rect = table?.getBoundingClientRect();

          return {
              height: Math.round(rect?.height || 0),
              left: Math.round(rect?.left || 0),
              position: table?.style?.position || '',
              top: Math.round(rect?.top || 0),
              width: Math.round(rect?.width || 0)
            };
          })())
        `,
      ),
    );
    const plainTableObjectMovePoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('.template-editor-table-selection:not(.hidden).is-selected .template-editor-table-move-handle');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "일반 표 개체 위치 이동 시작",
    );

    await dispatchBrowserMouseClickAtPoint(client, plainTableObjectMovePoint);
    await waitForCondition(
      client,
      `
        (() => {
          const table = document.querySelector('#plainTableDeleteSmoke');
          const rect = table?.getBoundingClientRect();
          const before = ${JSON.stringify(plainTableObjectMoveBefore)};

          return Boolean(
            table &&
              rect &&
              table.style.position === 'absolute' &&
              Math.abs(Math.round(rect.width) - before.width) <= 1 &&
              Math.abs(Math.round(rect.height) - before.height) <= 1
          );
        })()
      `,
      "일반 표 개체 이동 핸들 클릭 시 크기 유지",
    );
    const plainTableObjectDragPoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('.template-editor-table-selection:not(.hidden).is-selected .template-editor-table-move-handle');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "일반 표 개체 위치 이동 드래그 시작",
    );

    await dispatchBrowserMouseDrag(client, plainTableObjectDragPoint, {
      x: plainTableObjectDragPoint.x + 42,
      y: plainTableObjectDragPoint.y + 30,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const table = document.querySelector('#plainTableDeleteSmoke');
          const followingText = document.querySelector('#plainTableAfterMoveText');
          const rect = table?.getBoundingClientRect();
          const textRect = followingText?.getBoundingClientRect();
          const before = ${JSON.stringify(plainTableObjectMoveBefore)};

          return Boolean(
            table &&
              followingText &&
              rect &&
              textRect &&
              table.style.position === 'absolute' &&
              Math.round(rect.left) >= before.left + 30 &&
              Math.round(rect.top) >= before.top + 20 &&
              textRect.top >= rect.bottom - 1 &&
              Math.abs(Math.round(rect.width) - before.width) <= 1 &&
              Math.abs(Math.round(rect.height) - before.height) <= 1
          );
        })()
      `,
      "일반 표 개체 위치 이동 핸들 드래그",
    );
    const plainTableObjectResizeBefore = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const table = document.querySelector('#plainTableDeleteSmoke');
            const rect = table?.getBoundingClientRect();
            const style = table ? getComputedStyle(table) : null;

            return {
              height: Math.round(rect?.height || 0),
              outlineStyle: style?.outlineStyle || '',
              width: Math.round(rect?.width || 0)
            };
          })())
        `,
      ),
    );
    const plainTableObjectRightResizePoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('.template-editor-table-selection:not(.hidden).is-selected .template-editor-table-handle[data-template-table-object-handle-position="right"]');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "일반 표 개체 우측 핸들 리사이즈 시작",
    );

    await dispatchBrowserMouseDrag(client, plainTableObjectRightResizePoint, {
      x: plainTableObjectRightResizePoint.x + 44,
      y: plainTableObjectRightResizePoint.y + 24,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const table = document.querySelector('#plainTableDeleteSmoke');
          const rect = table?.getBoundingClientRect();
          const before = ${JSON.stringify(plainTableObjectResizeBefore)};

          return Boolean(
            table &&
              rect &&
              Math.round(rect.width) >= before.width + 30 &&
              Math.abs(Math.round(rect.height) - before.height) <= 3
          );
        })()
      `,
      "일반 표 개체 우측 핸들 단일축 리사이즈",
    );
    const plainTableObjectTopResizeBefore = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const table = document.querySelector('#plainTableDeleteSmoke');
            const rect = table?.getBoundingClientRect();

            return {
              bottom: Math.round(rect?.bottom || 0),
              height: Math.round(rect?.height || 0),
              top: Math.round(rect?.top || 0)
            };
          })())
        `,
      ),
    );
    const plainTableObjectTopResizePoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('.template-editor-table-selection:not(.hidden).is-selected .template-editor-table-handle[data-template-table-object-handle-position="top"]');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "일반 표 개체 상단 핸들 리사이즈 시작",
    );

    await dispatchBrowserMouseDrag(client, plainTableObjectTopResizePoint, {
      x: plainTableObjectTopResizePoint.x,
      y: plainTableObjectTopResizePoint.y - 30,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const table = document.querySelector('#plainTableDeleteSmoke');
          const rect = table?.getBoundingClientRect();
          const before = ${JSON.stringify(plainTableObjectTopResizeBefore)};

          return Boolean(
            table &&
              rect &&
              Math.round(rect.top) <= before.top - 18 &&
              Math.abs(Math.round(rect.bottom) - before.bottom) <= 3 &&
              Math.round(rect.height) >= before.height + 18
          );
        })()
      `,
      "일반 표 개체 상단 핸들 반대편 고정 리사이즈",
    );
    const plainTableObjectResizePoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('.template-editor-table-selection:not(.hidden).is-selected .template-editor-table-handle[data-template-table-object-handle-position="bottom-right"]');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "일반 표 개체 리사이즈 시작",
    );

    await dispatchBrowserMouseDrag(client, plainTableObjectResizePoint, {
      x: plainTableObjectResizePoint.x + 56,
      y: plainTableObjectResizePoint.y + 34,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const table = document.querySelector('#plainTableDeleteSmoke');
          const rect = table?.getBoundingClientRect();
          const style = table ? getComputedStyle(table) : null;
          const handles = document.querySelectorAll('.template-editor-table-selection:not(.hidden).is-selected .template-editor-table-handle');
          const before = ${JSON.stringify(plainTableObjectResizeBefore)};

          return Boolean(
            table &&
              rect &&
              Math.round(rect.width) >= before.width + 40 &&
              Math.round(rect.height) >= before.height + 20 &&
              style?.outlineStyle !== 'solid' &&
              table.style.width.endsWith('px') &&
              table.style.height.endsWith('px') &&
              handles.length === 8
          );
        })()
      `,
      "일반 표 개체 코너 핸들 리사이즈",
    );
    await waitForCondition(
      client,
      `
        (() => {
          const table = document.querySelector('#plainTableDeleteSmoke');
          const tableRect = table?.getBoundingClientRect();
          const rows = [...(table?.rows || [])];
          const lastRowRect = rows[rows.length - 1]?.getBoundingClientRect();
          const rowHeights = rows.map((row) =>
            Number.parseFloat(row.style.height || '') || Math.round(row.getBoundingClientRect().height || 0)
          );
          const columnWidths = [...(table?.querySelectorAll('colgroup col') || [])].map((column) =>
            Number.parseFloat(column.style.width || '0')
          );
          const rowTotalHeight = rowHeights.reduce((heightSum, height) => heightSum + Math.max(0, height || 0), 0);
          const columnTotalWidth = columnWidths.reduce((widthSum, width) => widthSum + Math.max(0, width || 0), 0);
          const tableStyleHeight = Number.parseFloat(table?.style?.height || '0');
          const tableStyleWidth = Number.parseFloat(table?.style?.width || '0');
          const isEven = (values) =>
            values.length > 0 &&
              values.every((value) => Number.isFinite(value) && value > 0) &&
              Math.max(...values) - Math.min(...values) <= 1;

          return Boolean(
            table &&
              tableRect &&
              rows.length === 4 &&
              columnWidths.length === 2 &&
              isEven(rowHeights) &&
              isEven(columnWidths) &&
              Math.abs(rowTotalHeight - tableStyleHeight) <= 2 &&
              Math.abs(columnTotalWidth - tableStyleWidth) <= 2 &&
              Math.abs(lastRowRect.bottom - tableRect.bottom) <= 4
          );
        })()
      `,
      "일반 표 개체 리사이즈 행열 균등 확장",
    );
    await evaluate(
      client,
      `
        (() => {
          window.ExamListTemplateEditorRuntime?.setHtml?.(
            '<div class="template-doc"><p>경계 테스트 앞</p><table id="plainTableBoundaryResizeSmoke" style="width: 100%; table-layout: fixed;"><tbody><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></tbody></table><p>경계 테스트 뒤</p></div>',
            { resetHistory: false, notify: false }
          );
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      "document.querySelector('#plainTableBoundaryResizeSmoke')",
      "일반 표 경계 리사이즈 테스트 문서 삽입",
    );
    const plainTableBoundaryBorderPoint = await getBrowserPoint(
      client,
      `(() => {
        const table = document.querySelector('#plainTableBoundaryResizeSmoke');
        table?.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = table?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top - 4 };
      })()`,
      "일반 표 경계 리사이즈 외곽선 선택 시작",
    );

    await client.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: plainTableBoundaryBorderPoint.x,
      y: plainTableBoundaryBorderPoint.y,
    });
    await dispatchBrowserMouseClickAtPoint(client, plainTableBoundaryBorderPoint);
    await waitForCondition(
      client,
      "document.querySelector('.template-editor-table-selection.is-selected:not(.hidden) [data-template-table-object-handle-position=\"right\"]')",
      "일반 표 경계 리사이즈 우측 핸들 표시",
    );
    const plainTableBoundaryRightHandlePoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('.template-editor-table-selection.is-selected:not(.hidden) [data-template-table-object-handle-position="right"]');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "일반 표 경계 리사이즈 우측 핸들 시작",
    );

    await dispatchBrowserMouseDrag(client, plainTableBoundaryRightHandlePoint, {
      x: plainTableBoundaryRightHandlePoint.x + 260,
      y: plainTableBoundaryRightHandlePoint.y,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const documentElement = document.querySelector('#templateEditorSurface .template-doc');
          const table = document.querySelector('#plainTableBoundaryResizeSmoke');
          const documentRect = documentElement?.getBoundingClientRect();
          const tableRect = table?.getBoundingClientRect();

          return Boolean(
            documentElement &&
              table &&
              documentRect &&
              tableRect &&
              tableRect.left >= documentRect.left - 0.5 &&
              tableRect.right <= documentRect.right + 0.5 &&
              Math.round(tableRect.width) <= Math.round(documentElement.clientWidth) + 2
          );
        })()
      `,
      "일반 표 우측 확대 시 여백 경계 내부 유지",
    );
    const plainTableBoundaryBottomHandlePoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('.template-editor-table-selection.is-selected:not(.hidden) [data-template-table-object-handle-position="bottom"]');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "일반 표 경계 리사이즈 하단 핸들 시작",
    );

    await dispatchBrowserMouseDrag(client, plainTableBoundaryBottomHandlePoint, {
      x: plainTableBoundaryBottomHandlePoint.x,
      y: plainTableBoundaryBottomHandlePoint.y + 900,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const documentElement = document.querySelector('#templateEditorSurface .template-doc');
          const table = document.querySelector('#plainTableBoundaryResizeSmoke');
          const documentRect = documentElement?.getBoundingClientRect();
          const tableRect = table?.getBoundingClientRect();

          return Boolean(
            documentElement &&
              table &&
              documentRect &&
              tableRect &&
              tableRect.top >= documentRect.top - 0.5 &&
              tableRect.bottom <= documentRect.bottom + 0.5
          );
        })()
      `,
      "일반 표 하단 확대 시 여백 경계 내부 유지",
    );
    await evaluate(
      client,
      `
        (() => {
          window.ExamListTemplateEditorRuntime?.setHtml?.(
            '<div class="template-doc"><p>최소 표 앞</p><table id="plainTableMinimumResizeSmoke" style="width: 48px; height: 48px; table-layout: fixed;"><colgroup><col style="width: 24px;"><col style="width: 24px;"></colgroup><tbody><tr style="height: 24px;"><td style="width: 24px; height: 24px;">A</td><td style="width: 24px; height: 24px;">B</td></tr><tr style="height: 24px;"><td style="width: 24px; height: 24px;">C</td><td style="width: 24px; height: 24px;">D</td></tr></tbody></table><p>최소 표 뒤</p></div>',
            { resetHistory: false, notify: false }
          );
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      "document.querySelector('#plainTableMinimumResizeSmoke')",
      "일반 표 최소 크기 리사이즈 테스트 문서 삽입",
    );
    const plainTableMinimumBorderPoint = await getBrowserPoint(
      client,
      `(() => {
        const table = document.querySelector('#plainTableMinimumResizeSmoke');
        table?.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = table?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top - 4 };
      })()`,
      "일반 표 최소 크기 외곽선 선택 시작",
    );

    await client.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: plainTableMinimumBorderPoint.x,
      y: plainTableMinimumBorderPoint.y,
    });
    await dispatchBrowserMouseClickAtPoint(client, plainTableMinimumBorderPoint);
    await waitForCondition(
      client,
      "document.querySelector('.template-editor-table-selection.is-selected:not(.hidden) [data-template-table-object-handle-position=\"bottom\"]')",
      "일반 표 최소 크기 하단 핸들 표시",
    );
    const plainTableMinimumHeightShrinkBefore = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const table = document.querySelector('#plainTableMinimumResizeSmoke');
            const rect = table?.getBoundingClientRect();

            return {
              height: Math.round(rect?.height || 0),
              width: Math.round(rect?.width || 0)
            };
          })())
        `,
      ),
    );
    const plainTableMinimumBottomHandlePoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('.template-editor-table-selection.is-selected:not(.hidden) [data-template-table-object-handle-position="bottom"]');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "일반 표 최소 크기 하단 리사이즈 시작",
    );

    await dispatchBrowserMouseDrag(client, plainTableMinimumBottomHandlePoint, {
      x: plainTableMinimumBottomHandlePoint.x,
      y: plainTableMinimumBottomHandlePoint.y - 60,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const table = document.querySelector('#plainTableMinimumResizeSmoke');
          const rect = table?.getBoundingClientRect();
          const before = ${JSON.stringify(plainTableMinimumHeightShrinkBefore)};

          return Boolean(
            table &&
              rect &&
              Math.round(rect.width) <= before.width + 1 &&
              Math.round(rect.height) <= before.height + 1
          );
        })()
      `,
      "일반 표 최소 높이 축소 시도 중 너비 유지",
    );
    const plainTableMinimumWidthShrinkBefore = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const table = document.querySelector('#plainTableMinimumResizeSmoke');
            const rect = table?.getBoundingClientRect();

            return {
              height: Math.round(rect?.height || 0),
              width: Math.round(rect?.width || 0)
            };
          })())
        `,
      ),
    );
    const plainTableMinimumRightHandlePoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('.template-editor-table-selection.is-selected:not(.hidden) [data-template-table-object-handle-position="right"]');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "일반 표 최소 크기 우측 리사이즈 시작",
    );

    await dispatchBrowserMouseDrag(client, plainTableMinimumRightHandlePoint, {
      x: plainTableMinimumRightHandlePoint.x - 60,
      y: plainTableMinimumRightHandlePoint.y,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const table = document.querySelector('#plainTableMinimumResizeSmoke');
          const rect = table?.getBoundingClientRect();
          const before = ${JSON.stringify(plainTableMinimumWidthShrinkBefore)};

          return Boolean(
            table &&
              rect &&
              Math.round(rect.width) <= before.width + 1 &&
              Math.round(rect.height) <= before.height + 1
          );
        })()
      `,
      "일반 표 최소 너비 축소 시도 중 높이 유지",
    );
    await dispatchBrowserKey(client, "Delete", { code: "Delete", keyCode: 46 });
    await waitForCondition(
      client,
      `
        (() => {
          const documentElement = document.querySelector('#templateEditorSurface .template-doc');

          return Boolean(
            documentElement &&
              !document.querySelector('#plainTableDeleteSmoke') &&
              !document.querySelector('#plainTableMinimumResizeSmoke') &&
              !documentElement.querySelector('.is-selected-table-object') &&
              documentElement.querySelectorAll('p').length >= 2
          );
        })()
      `,
      "일반 표 개체 Delete 삭제",
    );
}

module.exports = { runTableObjectSelectionScenario };
