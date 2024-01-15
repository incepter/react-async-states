import * as React from "react";
import Skeleton from "react-loading-skeleton";

import { Form, Select } from "@/components";

import { useInstances, useIsMounted } from "@/hooks";
import { AnyInstance } from "@/types/lib";

export default function SourceControls({
  instance,
}: {
  instance: AnyInstance;
}) {
  const isMounted = useIsMounted();
  const { instances, setCurrentInstanceKey } = useInstances();

  function handleValueChange(value: string) {
    setCurrentInstanceKey(value);
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
          value={instance.key}
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
