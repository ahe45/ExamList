import { bindTemplateEditorClickEvents } from "./template-editor-click-events.js";
import { bindTemplateEditorFormEvents } from "./template-editor-form-events.js";
import { bindTemplateEditorPointerKeyEvents } from "./template-editor-pointer-key-events.js";

export function bindTemplateEditorEventHandlers(context) {
  bindTemplateEditorClickEvents(context);
  bindTemplateEditorFormEvents(context);
  bindTemplateEditorPointerKeyEvents(context);
}
