import { escapeHtml } from "../../app/html-utils.js";
import {
  canUseCandidateBlockGrid,
  candidateBlockGridSortOptions,
  getCandidateBlockGridConfig,
  normalizeCandidateBlockGridConfig,
} from "./candidate-block-grid-config.js";

function renderSortKeyOptions(selectedKey) {
  return candidateBlockGridSortOptions
    .map(
      (option) =>
        `<option value="${escapeHtml(option.key)}" ${option.key === selectedKey ? "selected" : ""}>${escapeHtml(option.label)}</option>`,
    )
    .join("");
}

export function createCandidateBlockGridControls(page) {
  const config = getCandidateBlockGridConfig(page);
  const sectionElement = document.createElement("section");
  const isEnabled = canUseCandidateBlockGrid(page);

  sectionElement.className = "template-page-property-field examlist-candidate-block-grid-field";
  sectionElement.innerHTML = `
    <div class="examlist-candidate-block-grid-header">
      <span>수험생 데이터</span>
    </div>
    <div class="template-page-margin-grid examlist-candidate-block-grid-controls">
      <label>
        <span>열</span>
        <span class="template-page-property-unit-control">
          <input class="template-page-property-control" data-examlist-block-grid-setting="columns" type="number" inputmode="numeric" autocomplete="off" min="1" max="4" step="1" value="${escapeHtml(config.columns)}" aria-label="수험생 데이터 열 직접 입력" ${isEnabled ? "" : "disabled"} />
          <span class="template-page-property-control-unit" aria-hidden="true">개</span>
        </span>
      </label>
      <label>
        <span>행</span>
        <span class="template-page-property-unit-control">
          <input class="template-page-property-control" data-examlist-block-grid-setting="rows" type="number" inputmode="numeric" autocomplete="off" min="1" max="30" step="1" value="${escapeHtml(config.rows)}" aria-label="수험생 데이터 행 직접 입력" ${isEnabled ? "" : "disabled"} />
          <span class="template-page-property-control-unit" aria-hidden="true">개</span>
        </span>
      </label>
      <label>
        <span>가로 간격</span>
        <span class="template-page-property-unit-control">
          <input class="template-page-property-control" data-examlist-block-grid-setting="gapXPt" type="number" inputmode="decimal" autocomplete="off" min="0" max="48" step="0.5" value="${escapeHtml(config.gapXPt)}" aria-label="수험생 데이터 가로 간격 직접 입력" ${isEnabled ? "" : "disabled"} />
          <span class="template-page-property-control-unit" aria-hidden="true">pt</span>
        </span>
      </label>
      <label>
        <span>세로 간격</span>
        <span class="template-page-property-unit-control">
          <input class="template-page-property-control" data-examlist-block-grid-setting="gapYPt" type="number" inputmode="decimal" autocomplete="off" min="0" max="48" step="0.5" value="${escapeHtml(config.gapYPt)}" aria-label="수험생 데이터 세로 간격 직접 입력" ${isEnabled ? "" : "disabled"} />
          <span class="template-page-property-control-unit" aria-hidden="true">pt</span>
        </span>
      </label>
    </div>
    <div class="template-page-margin-grid examlist-candidate-block-grid-sort-controls">
      <label>
        <span>정렬 기준</span>
        <select class="template-page-property-control" data-examlist-block-grid-setting="sortKey" ${isEnabled ? "" : "disabled"}>
          ${renderSortKeyOptions(config.sortKey)}
        </select>
      </label>
      <label>
        <span>정렬 방향</span>
        <select class="template-page-property-control" data-examlist-block-grid-setting="sortDirection" ${isEnabled ? "" : "disabled"}>
          <option value="asc" ${config.sortDirection === "desc" ? "" : "selected"}>오름차순</option>
          <option value="desc" ${config.sortDirection === "desc" ? "selected" : ""}>내림차순</option>
        </select>
      </label>
    </div>
    <label class="examlist-candidate-block-grid-check">
      <input data-examlist-block-grid-setting="fillEmptyBlocks" type="checkbox" ${config.fillEmptyBlocks ? "checked" : ""} ${isEnabled ? "" : "disabled"} />
      <span>빈 블록까지 표시</span>
    </label>
    <button class="template-tool-button examlist-candidate-block-grid-create" data-examlist-block-grid-create type="button" aria-disabled="${isEnabled ? "false" : "true"}" ${isEnabled ? "" : "disabled"}>
      생성
    </button>
  `;

  return sectionElement;
}

export function syncCandidateBlockGridControls(sectionElement, page) {
  const config = getCandidateBlockGridConfig(page);
  const isEnabled = canUseCandidateBlockGrid(page);
  const dependentControls = sectionElement?.querySelectorAll?.(
    '[data-examlist-block-grid-setting="columns"], [data-examlist-block-grid-setting="rows"], [data-examlist-block-grid-setting="gapXPt"], [data-examlist-block-grid-setting="gapYPt"], [data-examlist-block-grid-setting="sortKey"], [data-examlist-block-grid-setting="sortDirection"], [data-examlist-block-grid-setting="fillEmptyBlocks"]',
  );
  const createButton = sectionElement?.querySelector?.("[data-examlist-block-grid-create]");

  sectionElement?.querySelectorAll?.("[data-examlist-block-grid-setting]").forEach((control) => {
    const settingName = control.dataset.examlistBlockGridSetting;

    if (control instanceof HTMLInputElement && control.type === "checkbox") {
      control.checked = Boolean(config[settingName]);
      return;
    }

    if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
      control.value = String(config[settingName] ?? "");
    }
  });

  dependentControls?.forEach((control) => {
    control.disabled = !isEnabled;
  });

  if (createButton instanceof HTMLButtonElement) {
    createButton.disabled = !isEnabled;
    createButton.setAttribute("aria-disabled", createButton.disabled ? "true" : "false");
  }
}

export function readCandidateBlockGridControls(sectionElement, fallbackConfig) {
  const fallback = normalizeCandidateBlockGridConfig(fallbackConfig);
  const getControl = (name) => sectionElement?.querySelector?.(`[data-examlist-block-grid-setting="${name}"]`);
  const fillEmptyBlocksControl = getControl("fillEmptyBlocks");

  return normalizeCandidateBlockGridConfig({
    ...fallback,
    columns: getControl("columns")?.value ?? fallback.columns,
    fillEmptyBlocks: fillEmptyBlocksControl instanceof HTMLInputElement ? fillEmptyBlocksControl.checked : fallback.fillEmptyBlocks,
    gapXPt: getControl("gapXPt")?.value ?? fallback.gapXPt,
    gapYPt: getControl("gapYPt")?.value ?? fallback.gapYPt,
    rows: getControl("rows")?.value ?? fallback.rows,
    sortDirection: getControl("sortDirection")?.value ?? fallback.sortDirection,
    sortKey: getControl("sortKey")?.value ?? fallback.sortKey,
    variant: "photo",
  });
}
