import * as React from "react";
import Skeleton from "react-loading-skeleton";

import { Form, Select } from "@/components";

import { useCurrentInstance, useInstances, useIsMounted } from "@/hooks";

export default function SourceControlGroupInputs() {
  const isMounted = useIsMounted();
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
      {!isMounted ? (
        <Skeleton className="h-8 animate-pulse leading-[inherit]" />
      ) : (
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
      )}
    </Form.Item>
  );
}
