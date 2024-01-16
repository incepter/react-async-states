import { Button, Collapsible, Form, Input } from "@/components";

import { AnyInstance } from "@/types/lib";

function CollapsibleProducerValidExample({ data }: { data: unknown }) {
  const triggerText = "Toggle a valid example";

  return (
    <Collapsible className="border border-foreground-secondary/20 text-sm">
      <Collapsible.Trigger asChild>
        <Button className="w-full">{triggerText}</Button>
      </Collapsible.Trigger>

      <Collapsible.Content className="p-2">
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      </Collapsible.Content>
    </Collapsible>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Main Component                               */
/* -------------------------------------------------------------------------- */

export default function ProducerControls({
  instance,
}: {
  instance: AnyInstance;
}) {
  const instanceMetadata = instance.payload as {
    method: "GET" | "POST";
    args: Record<string, unknown>;
    validSample?: object;
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
        <Input
          disabled
          className="w-full"
          name="function"
          value={instance.fn?.name}
        />
      </Form.Item>
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
      {instanceMetadata.validSample && (
        <CollapsibleProducerValidExample data={instanceMetadata.validSample} />
      )}
    </div>
  );
}
