import { Form, Input } from "@/components";

import { AnyInstance } from "@/types/lib";

export default function PendingPartialConfigControls({
  instance,
}: {
  instance: AnyInstance;
}) {
  const instConfig = instance.config;

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { type, name, value } = e.target;
    instance.actions.patchConfig({
      [name]: type === "number" ? +value : value,
    });
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-2">
      <Form.Item
        label="Keep pending"
        link="https://incepter.github.io/react-async-states/docs/api/create-source#keeppendingforms"
      >
        <Input
          className="w-full"
          type="number"
          min="0"
          step="100"
          name="keepPendingForMs"
          defaultValue={instConfig.keepPendingForMs}
          onChange={handleInputChange}
        />
      </Form.Item>
      <Form.Item
        label="Skip pending delay"
        link="https://incepter.github.io/react-async-states/docs/api/create-source#skippendingdelayms"
      >
        <Input
          className="w-full"
          type="number"
          min="0"
          step="50"
          name="skipPendingDelayMs"
          defaultValue={instConfig.skipPendingDelayMs}
          onChange={handleInputChange}
        />
      </Form.Item>
    </div>
  );
}
