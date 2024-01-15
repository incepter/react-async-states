// "use client";
import { useAsync } from "react-async-states";

// import Skeleton from "react-loading-skeleton";
import { JSONTree } from "@/components";

import { useInstances } from "@/hooks";

export default function Home() {
  // const isMounted = useIsMounted();
  const { currentInstance } = useInstances();
  const { state } = useAsync(currentInstance.actions, [currentInstance]);

  // return isMounted ? (
  //   <JSONTree
  //     scheme="react-async-states"
  //     data={state}
  //     shouldExpandNodeInitially={(keyPath, _, level) => {
  //       // Deeply expand the `props` key
  //       if (keyPath.join(".").endsWith("args.props")) {
  //         return level < 4;
  //       }

  //       return level < 2;
  //     }}
  //   />
  // ) : (
  //   <Skeleton className="animate-pulse" count={8} />
  // );
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
