import type { ThemeRegistrationRaw } from "shiki";

interface Palette {
  foreground: string;
  keyword: string;
  string: string;
  function: string;
  number: string;
  type: string;
  comment: string;
  punctuation: string;
}

/**
 * Every token colour clears 4.5:1 against --code and --code-highlight
 * (styles/globals.css) in its mode. Re-check the ratios after changing
 * either side.
 */
const lightPalette: Palette = {
  comment: "#5d636f",
  foreground: "#141822",
  function: "#7f36bc",
  keyword: "#2e48e9",
  number: "#a34507",
  punctuation: "#555b66",
  string: "#006e4b",
  type: "#00668f",
};

const darkPalette: Palette = {
  comment: "#878c97",
  foreground: "#cdd1d8",
  function: "#cba1fa",
  keyword: "#8fa7ff",
  number: "#f9a870",
  punctuation: "#9ca2ad",
  string: "#69d6aa",
  type: "#6ccdea",
};

const createTheme = ({
  name,
  type,
  palette,
}: {
  name: string;
  type: "light" | "dark";
  palette: Palette;
}): ThemeRegistrationRaw => ({
  colors: {
    "editor.background": "#00000000",
    "editor.foreground": palette.foreground,
  },
  name,
  settings: [
    { settings: { foreground: palette.foreground } },
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { fontStyle: "italic", foreground: palette.comment },
    },
    {
      scope: [
        "string",
        "string.template",
        "punctuation.definition.string",
        "markup.inserted",
      ],
      settings: { foreground: palette.string },
    },
    {
      scope: [
        "keyword",
        "storage",
        "storage.type",
        "storage.modifier",
        "keyword.operator.new",
        "keyword.operator.expression",
        "variable.language",
        "punctuation.definition.template-expression",
      ],
      settings: { foreground: palette.keyword },
    },
    {
      scope: [
        "keyword.operator",
        "punctuation",
        "meta.brace",
        "punctuation.definition.tag",
        "punctuation.separator",
        "punctuation.terminator",
        "punctuation.accessor",
      ],
      settings: { foreground: palette.punctuation },
    },
    {
      scope: [
        "entity.name.function",
        "support.function",
        "meta.function-call entity.name.function",
        "entity.name.command",
        "entity.other.attribute-name",
      ],
      settings: { foreground: palette.function },
    },
    {
      scope: [
        "constant.numeric",
        "constant.language",
        "constant.character",
        "constant.other",
        "support.constant",
        "keyword.other.unit",
        "markup.deleted",
      ],
      settings: { foreground: palette.number },
    },
    {
      scope: [
        "entity.name.type",
        "entity.name.class",
        "entity.other.inherited-class",
        "support.type",
        "support.class",
        "entity.name.tag",
      ],
      settings: { foreground: palette.type },
    },
    {
      scope: [
        "variable",
        "variable.other.property",
        "variable.other.object.property",
        "meta.object-literal.key",
      ],
      settings: { foreground: palette.foreground },
    },
    {
      scope: [
        "support.type.property-name",
        "support.type.property-name.css",
        "support.type.property-name.json",
        "punctuation.support.type.property-name",
        "variable.css",
        "variable.argument.css",
      ],
      settings: { foreground: palette.keyword },
    },
    {
      scope: [
        "meta.property-value.css",
        "support.constant.property-value",
        "support.constant.property-value.css",
      ],
      settings: { foreground: palette.string },
    },
  ],
  type,
});

export const dithercnLight = createTheme({
  name: "dithercn-light",
  palette: lightPalette,
  type: "light",
});

export const dithercnDark = createTheme({
  name: "dithercn-dark",
  palette: darkPalette,
  type: "dark",
});
