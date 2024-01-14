"use client";

import Skeleton from "react-loading-skeleton";

import { JSONTree } from "@/components";

import { useCurrentInstance, useIsMounted } from "@/hooks";

export default function Home() {
  const isMounted = useIsMounted();
  const { instance: currentInstance } = useCurrentInstance();

  return isMounted ? (
    <JSONTree
      scheme="react-async-states"
      data={currentInstance.state}
      shouldExpandNodeInitially={(keyPath, data, level) => {
        // Deeply expand the `props` key
        if (keyPath.join(".").endsWith("args.props")) {
          return level < 4;
        }

        return level < 2;
      }}
    />
  ) : (
    <Skeleton className="animate-pulse" count={8} />
  );
}
