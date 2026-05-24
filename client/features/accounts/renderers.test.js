import test from "node:test";
import assert from "node:assert/strict";

import { renderAccountManagementView } from "./renderers.js";

test("account management view is restricted without manageAccounts permission", () => {
  const html = renderAccountManagementView({
    access: { permissions: { manageAccounts: false } },
    accounts: { items: [], total: 0 },
  });

  assert.match(html, /슈퍼 관리자만 접근할 수 있습니다/);
  assert.doesNotMatch(html, /data-action="refresh-accounts"/);
});

test("account management view renders account rows for super administrators", () => {
  const html = renderAccountManagementView({
    access: { permissions: { manageAccounts: true } },
    accounts: {
      items: [
        {
          lastLoginAt: "2026-05-20T10:30:00.000Z",
          role: "admin",
          roleLabel: "관리자",
          userId: "kim",
          userName: "김성준",
        },
      ],
      total: 1,
    },
  });

  assert.match(html, /계정 관리/);
  assert.match(html, /김성준/);
  assert.match(html, /관리자/);
  assert.doesNotMatch(html, /table-column-status/);
  assert.match(html, /data-action="refresh-accounts"/);
  assert.match(html, /data-action="open-account-create-modal"/);
  assert.match(html, /data-action="open-account-edit-modal"/);
  assert.match(html, /data-action="delete-account"/);
  assert.match(html, /table-inline-icon-button/);
  assert.match(html, /<div class="table-header-static">관리<\/div>/);
  assert.match(html, /<div class="table-header-static">삭제<\/div>/);
  assert.match(html, /title="설정"/);
  assert.match(html, /title="삭제"/);
});

test("account management view renders the create account modal", () => {
  const html = renderAccountManagementView({
    access: { permissions: { manageAccounts: true } },
    accounts: {
      items: [],
      modal: {
        isOpen: true,
        mode: "create",
      },
      total: 0,
    },
  });

  assert.match(html, /계정 추가/);
  assert.match(html, /data-account-form/);
  assert.match(html, /<option value="admin" selected>/);
  assert.match(html, /placeholder="1234"/);
  assert.doesNotMatch(html, /계정 사용/);
  assert.doesNotMatch(html, /data-account-modal-field="isActive"/);
});
