"use client";

import InstanceTracker from "./InstanceTracker";
import { useInstances } from "@/hooks";

export default function StateTimeline() {
  const { currentInstance } = useInstances();

  return (
    <div className="border-t border-foreground-secondary/20 bg-neutral">
      <InstanceTracker instance={currentInstance} />
    </div>
  );
}
