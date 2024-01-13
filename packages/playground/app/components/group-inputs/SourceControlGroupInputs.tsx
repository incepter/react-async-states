import * as React from "react";

import { Form, Select } from "@/components";

import { useCurrentInstance, useInstances } from "@/hooks";

export default function SourceControlGroupInputs() {
  const { instances } = useInstances();
  const { instance: currentInstance } = useCurrentInstance();

  function handleValueChange(value: string) {
    alert("Set current source to " + value);
  }

  return (
    <Form.Item
      label="Key"
      link="https://incepter.github.io/react-async-states/docs/api/create-source#the-source"
    >
      <Select
        onValueChange={handleValueChange}
        value={currentInstance.key}
        className="w-full"
        name="key"
      >
        {Object.values(instances).map(({ key }) => (
          <Select.Item key={key} value={key}>
            {key}
          </Select.Item>
        ))}
      </Select>
    </Form.Item>
  );
}
