"use client";

import InstanceRunner from "./InstanceRunner";
import { useCurrentInstance } from "@/hooks";

export default function Header() {
  const { instance: currentInstance } = useCurrentInstance();

  return (
    <div className="border-b border-foreground-secondary/20 bg-neutral p-4 text-sm">
      <InstanceRunner instance={currentInstance} />
    </div>
  );
}
