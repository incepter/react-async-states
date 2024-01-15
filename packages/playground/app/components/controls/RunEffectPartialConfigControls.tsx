import { RunEffect } from "react-async-states";

import { Form, Input, Select } from "@/components";

import { AnyInstance } from "@/types/lib";

const runEffectOptions = [
  {
    value: "delay",
    label: "Delay",
  },
  {
    value: "debounce",
    label: "Debounce",
  },
  {
    value: "throttle",
    label: "Throttle",
  },
];

export default function RunEffectPartialConfigControls({
  instance,
}: {
  instance: AnyInstance;
}) {
  const instConfig = instance.config;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-2">
        <Form.Item
          label="Type"
          link="https://incepter.github.io/react-async-states/docs/api/create-source#runeffect"
        >
          <Select
            onValueChange={(value) => {
              instance.actions.patchConfig({
                runEffect: value as RunEffect,
              });
            }}
            className="w-full"
            defaultValue={instConfig.runEffect}
            name="runEffect"
            placeholder="Select effect..."
          >
            {runEffectOptions.map(({ value, label }) => (
              <Select.Item key={value} value={value}>
                {label}
              </Select.Item>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          label="Duration"
          link="https://incepter.github.io/react-async-states/docs/api/create-source/#runeffectdurationms"
        >
          <Input
            className="w-full"
            type="number"
            min="0"
            step="100"
            name="runEffectDurationMs"
            onChange={(e) => {
              instance.actions.patchConfig({
                [e.target.name]: +e.target.value,
              });
            }}
            defaultValue={instConfig.runEffectDurationMs}
          />
        </Form.Item>
      </div>
      <p className="text-foreground-secondary">
        To see this in action, inspect the{" "}
        <span className="text-foreground-primary">Network</span> activity and
        click <span className="text-foreground-primary">Run</span> multiple
        times.
      </p>
    </div>
  );
}
