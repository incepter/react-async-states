import qs from "querystring";

import { Badge, Button } from "@/components";

import { AnyInstance } from "@/types/lib";

export default function InstanceRunner({
  instance,
}: {
  instance: AnyInstance;
}) {
  const instanceMetadata = instance.payload as {
    method: "GET" | "POST";
    args: Record<string, unknown>;
  };

  function handleRunClick() {
    instance.actions.run(instanceMetadata.args);
  }

  const stringify =
    instanceMetadata.method === "GET" ? qs.stringify : JSON.stringify;

  return (
    <div className="flex items-stretch gap-2">
      <div className="inline-flex flex-1 gap-2 overflow-hidden border border-foreground-secondary/20 px-2">
        <Badge
          color={instanceMetadata.method === "GET" ? "success" : "warning"}
          className="self-center"
        >
          {instanceMetadata.method}
        </Badge>
        <div className="flex items-center overflow-auto whitespace-nowrap">
          <code>
            <span className="text-foreground-secondary">
              --{instanceMetadata.method === "GET" ? "params" : "body"}
            </span>{" "}
            <span>{stringify(instanceMetadata.args)}</span>
          </code>
        </div>
      </div>
      <Button onClick={handleRunClick}>Run</Button>
    </div>
  );
}
