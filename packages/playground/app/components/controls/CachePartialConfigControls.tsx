import { Button, Form, Input, Switch } from "@/components";

import { AnyInstance } from "@/types/lib";

export default function CachePartialConfigControls({
  instance,
}: {
  instance: AnyInstance;
}) {
  const instConfig = instance.config;

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type } = e.target;
    instance.actions.patchConfig({
      cacheConfig: {
        ...instConfig.cacheConfig!,
        [name]: type === "number" ? +value : value,
      },
    });
  }

  function handleSwitchCheckedChange(name: string, checked: boolean) {
    instance.actions.patchConfig({
      cacheConfig: {
        ...instConfig.cacheConfig!,
        [name]: checked,
      },
    });
  }

  function handleClearClick() {
    instance.actions.invalidateCache();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Form.Item
          label="Timeout (ms)"
          link="https://incepter.github.io/react-async-states/docs/api/create-source#timeout"
        >
          <Input
            className="w-full"
            type="number"
            min="0"
            step="100"
            name="timeout"
            onChange={handleInputChange}
            defaultValue={instConfig.cacheConfig?.timeout as number}
          />
        </Form.Item>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          name="auto"
          defaultChecked={!!instConfig.cacheConfig?.auto}
          onCheckedChange={(checked) => {
            handleSwitchCheckedChange("auto", checked);
          }}
        />
        <label>Auto run after the expiration</label>
      </div>
      <div className="space-y-2">
        <Button className="w-full" variant="error" onClick={handleClearClick}>
          Clear
        </Button>
        <p className="text-foreground-secondary">
          Do not forget to clear the cache whenever you change something.
        </p>
      </div>
    </div>
  );
}
