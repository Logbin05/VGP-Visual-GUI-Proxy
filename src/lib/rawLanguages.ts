import type { Extension } from "@codemirror/state";
import { yaml } from "@codemirror/lang-yaml";
import { json } from "@codemirror/lang-json";
import { StreamLanguage } from "@codemirror/language";
import { toml } from "@codemirror/legacy-modes/mode/toml";
import type { RawFormat } from "./configSerialize";

const tomlLanguage = StreamLanguage.define(toml);

export function languageFor(format: RawFormat): Extension {
  switch (format) {
    case "yaml":
      return yaml();
    case "json":
      return json();
    case "toml":
      return tomlLanguage;
  }
}
