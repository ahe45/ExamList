# Style Module Order

CSS is loaded from broad rules to narrow feature rules:

1. `styles/base.css` and `styles/surfaces.css`
2. shared feature primitives such as `styles/features/grids.css`
3. feature entry files such as `candidates.css`, `pdf-generations.css`, and `template-editor.css`
4. app shell overrides in `styles.css`
5. `styles/responsive.css`

Feature CSS may override shared grid primitives, but shared grid CSS should not contain feature-specific layout fixes unless the same rule is intentionally used by multiple features.

Nested feature entry files, for example `styles/features/template-editor.css`, should only import smaller files from their own folder.
