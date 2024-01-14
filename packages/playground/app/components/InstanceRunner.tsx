import qs from "querystring";

import { Badge, Button } from "@/components";

import { AnyInstance } from "@/types/lib";

export default function InstanceRunner({
  instance,
}: {
  instance: AnyInstance;
}) {
  function handleRunClick() {
    // TODO Args should be state
    instance.actions.run({ _page: 1, _limit: 5 });
  }

  return (
    <div className="flex items-stretch gap-2">
      <div className="inline-flex flex-1 gap-2 overflow-hidden border border-foreground-secondary/20 px-2">
        <Badge color="success" className="self-center">
          GET
        </Badge>
        <div className="flex items-center overflow-auto whitespace-nowrap">
          <code>
            <span className="text-foreground-secondary">--params</span>{" "}
            <span>{qs.stringify({ _page: 1, _limit: 5 })}</span>{" "}
            <span className="text-foreground-secondary">--body</span>{" "}
            <span>
              {JSON.stringify({
                username: "hello",
                password: "pa$$word",
              })}
            </span>
          </code>
        </div>
      </div>
      <Button onClick={handleRunClick}>Run</Button>
    </div>
  );
}
