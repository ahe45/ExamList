export function hasAccess(summary, permissionKey) {
  return Boolean(summary?.access?.permissions?.[permissionKey] ?? summary?.permissions?.[permissionKey]);
}
