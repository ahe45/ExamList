// Namespaces are internal event bindings, never data supplied by a row.
export function assertGridNamespace(namespace) {
  if (!/^[a-z][a-z0-9-]*$/.test(namespace || "")) {
    throw new Error("A valid grid event namespace is required");
  }
}
