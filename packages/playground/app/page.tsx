"use client";

import { JSONTree } from "@/components";

import { useCurrentInstance, useIsMounted } from "@/hooks";

export default function Home() {
  const isMounted = useIsMounted();
  const { instance: currentInstance } = useCurrentInstance();

  return (
    <div className="flex-1 overflow-auto whitespace-pre-wrap p-4">
      {isMounted && (
        <JSONTree
          scheme="react-async-states"
          data={currentInstance.state}
          shouldExpandNodeInitially={(keyPath, data, level) => {
            if (keyPath.join().endsWith("args,props")) {
              return level < 4;
            }

            return level < 2;
          }}
        />
      )}
    </div>
  );
}
