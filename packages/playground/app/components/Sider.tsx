"use client";

import InstancePatcher from "./InstancePatcher";
import { useInstances } from "@/hooks";

export default function Sider() {
  const { currentInstance } = useInstances();

  return (
    <div className="w-3/12 min-w-[200px] max-w-[300px] overflow-auto border-l border-foreground-secondary/20 bg-neutral pb-4">
      <InstancePatcher instance={currentInstance} />
    </div>
  );
}
