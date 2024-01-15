import Skeleton from "react-loading-skeleton";

import { Form, Input } from "@/components";

import { useIsMounted } from "@/hooks";
import { AnyInstance } from "@/types/lib";

export default function ProducerControls({
  instance,
}: {
  instance: AnyInstance;
}) {
  const isMounted = useIsMounted();

  const instanceMetadata = instance.payload as {
    method: "GET" | "POST";
    args: Record<string, unknown>;
  };

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type } = e.target;

    instance.actions.mergePayload({
      args: {
        ...instanceMetadata.args,
        [name]: type === "number" ? +value : value,
      },
    });
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
          <Input
            disabled
            className="w-full"
            name="function"
            value={instance.fn?.name}
          />
        )}
      </Form.Item>{" "}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-2">
        {Object.entries(instanceMetadata.args).map((arg, index) => {
          const [key, value] = arg;

          return (
            <Form.Item key={key} label={`[arg-${index}] ${key}`}>
              <Input
                className="w-full"
                type={typeof value === "number" ? "number" : "text"}
                name={key}
                onChange={handleInputChange}
                defaultValue={value as string}
              />
            </Form.Item>
          );
        })}
      </div>
    </div>
  );
}
