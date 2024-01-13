import * as React from "react";
import { CommonExternalProps } from "react-json-tree";
import { JSONTree as BaseJSONTree } from "react-json-tree";

import { VariantProps, cva } from "class-variance-authority";

import { clsxm } from "@/lib/utils";

const base16Colors = {
  "react-async-states": {
    author: "Hassan Ait Nacer (https://github.com/hassanaitnacer)",
    base00: "transparent",
    base01: "#282a2e",
    base02: "#373b41",
    base03: "hsl(var(--color-foreground-secondary))",
    base04: "#b4b7b4",
    base05: "#c5c8c6",
    base06: "#e0e0e0",
    base07: "#ffffff",
    base08: "hsl(var(--color-error-default))",
    base09: "hsl(var(--color-warning-default))",
    base0A: "#FBA922",
    base0B: "hsl(var(--color-success-default))",
    base0C: "#3971ED",
    base0D: "hsl(var(--color-foreground-primary))",
    base0E: "hsl(var(--color-info-default))",
    base0F: "#3971ED",
  },
};

export interface JSONTreeProps
  extends React.ComponentProps<typeof BaseJSONTree> {
  scheme?: keyof typeof base16Colors;
}

const JSONTree = (props: JSONTreeProps) => {
  const {
    scheme,
    theme,
    hideRoot = true,
    sortObjectKeys = true,
    ...rest
  } = props;

  const overrideTheme = scheme
    ? {
        extend: {
          scheme,
          ...base16Colors[scheme],
        },
        tree: {
          padding: 0,
          margin: 0,
        },
      }
    : theme;

  return (
    <BaseJSONTree
      theme={overrideTheme}
      hideRoot={hideRoot}
      sortObjectKeys={sortObjectKeys}
      {...rest}
    />
  );
};
JSONTree.displayName = "JSONTree";

export default JSONTree;
