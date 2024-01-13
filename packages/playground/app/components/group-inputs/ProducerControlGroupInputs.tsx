import { createSource, useAsync } from "react-async-states";
import Skeleton from "react-loading-skeleton";

import { Badge, Form, Input, Select } from "@/components";

import { getInputTypeForVariable } from "@/lib/mapping";

import { useCurrentInstance, useIsMounted } from "@/hooks";

const argsSource = createSource<unknown[]>("args-source", null, {
  initialValue: [{ _page: 1, _limit: 5 }],
});

export default function ProducerControlGroupInputs() {
  const isMounted = useIsMounted();

  const { instance: currentInstance } = useCurrentInstance();

  const {
    data: argsData,
    source: { setData },
  } = useAsync(argsSource);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type } = e.target;

    setData([]);
  }

  return (
    <div className="space-y-2">
      <Form.Item
        label="Function"
        link="https://incepter.github.io/react-async-states/docs/api/producer-function"
      >
        {!isMounted ? (
          <Skeleton className="h-8 animate-pulse leading-[inherit]" />
        ) : (
          <Select
            disabled
            className="w-full"
            name="function"
            value={currentInstance.fn?.name}
          >
            <Select.Item className="group" value={currentInstance.fn?.name!}>
              <div className="flex items-center gap-2">
                <Badge
                  color="success"
                  className="group-hover:bg-primary-contrast-text group-hover:text-primary"
                >
                  GET
                </Badge>
                <span>{currentInstance.fn?.name}</span>
              </div>
            </Select.Item>
          </Select>
        )}
      </Form.Item>{" "}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-2">
        {argsData?.map((arg, index) => {
          if (typeof arg === "object") {
            return Object.entries(arg!).map(({ 0: key, 1: value }, index) => (
              <Form.Item key={key} label={`[arg_${index}] ${key}`}>
                <Input
                  className="w-full"
                  type={getInputTypeForVariable(value)}
                  name={key}
                  value={value}
                  onChange={handleInputChange}
                />
              </Form.Item>
            ));
          }

          // ! arg should not be string
          return (
            <Form.Item key={`${arg}`} label={`[arg-${index}] ${arg}`}>
              <Input
                className="w-full"
                type={getInputTypeForVariable(arg)}
                name={`${arg}`}
                onChange={handleInputChange}
              />
            </Form.Item>
          );
        })}
      </div>
    </div>
  );
}
