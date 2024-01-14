"use client";

import InstanceTracker from "./InstanceTracker";
import { useCurrentInstance } from "@/hooks";

export default function StateTimeline() {
  const { instance: currentInstance } = useCurrentInstance();

  return (
    <div className="border-t border-foreground-secondary/20 bg-neutral">
      <InstanceTracker instance={currentInstance} />
    </div>
  );
}
