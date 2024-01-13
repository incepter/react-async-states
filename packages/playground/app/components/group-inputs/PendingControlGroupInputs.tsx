import { Form, Input } from "@/components";

import { useCurrentInstance } from "@/hooks";

export default function PendingControlGroupInputs() {
  const { instance: currentInstance } = useCurrentInstance();

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { type, name, value } = e.target;
    currentInstance.actions.patchConfig({
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
          defaultValue={currentInstance.config.keepPendingForMs}
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
          defaultValue={currentInstance.config.skipPendingDelayMs}
          onChange={handleInputChange}
        />
      </Form.Item>
    </div>
  );
}
