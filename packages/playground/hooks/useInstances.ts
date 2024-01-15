import { useContext } from "react";

import { InstancesContext } from "@/store";

export default function useInstances() {
  const instancesCtx = useContext(InstancesContext);

  if (!instancesCtx) {
    throw new Error("You forgot to wrap your app with `InstancesProvider`");
  }

  return instancesCtx;
}
