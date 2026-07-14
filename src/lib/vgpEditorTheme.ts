import { createTheme } from "@uiw/codemirror-themes";
import { tags as t } from "@lezer/highlight";

export const vgpEditorTheme = createTheme({
  theme: "dark",
  settings: {
    background: "var(--color-app_base)",
    foreground: "var(--color-text_primary)",
    caret: "var(--color-accent_primary_cyan)",
    selection:
      "color-mix(in oklch, var(--color-accent_primary_cyan) 22%, transparent)",
    selectionMatch:
      "color-mix(in oklch, var(--color-accent_primary_cyan) 16%, transparent)",
    lineHighlight: "var(--color-panel)",
    gutterBackground: "var(--color-app_base)",
    gutterForeground: "var(--color-text_muted)",
    gutterBorder: "transparent",
    fontFamily: "JetBrainsMono, monospace",
  },
  styles: [
    {
      tag: [t.propertyName, t.attributeName],
      color: "var(--color-text_secondary)",
    },
    { tag: t.string, color: "var(--color-accent_primary_cyan)" },
    { tag: [t.number, t.bool, t.atom], color: "var(--color-status_warning)" },
    { tag: t.null, color: "var(--color-accent_select_violet)" },
    { tag: t.comment, color: "var(--color-text_muted)", fontStyle: "italic" },
    { tag: t.meta, color: "var(--color-accent_select_violet)" },
    {
      tag: [t.punctuation, t.bracket, t.separator],
      color: "var(--color-text_muted)",
    },
    { tag: t.invalid, color: "var(--color-status_error)" },
  ],
});
