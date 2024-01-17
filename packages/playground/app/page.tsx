"use client";

import { useAsync } from "react-async-states";

import { JSONTree } from "@/components";

import { useInstances } from "@/hooks";

export default function Home() {
  const { currentInstance } = useInstances();
  const { state } = useAsync(currentInstance.actions, [currentInstance]);

  return (
    <JSONTree
      scheme="react-async-states"
      data={state}
      shouldExpandNodeInitially={(keyPath, _, level) => {
        // Deeply expand the `props` key
        if (keyPath.join(".").endsWith("args.props")) {
          return level < 4;
        }

        return level < 2;
      }}
    />
  );
}
