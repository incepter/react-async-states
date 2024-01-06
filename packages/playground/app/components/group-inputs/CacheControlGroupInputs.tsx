import { Button, Form, Input, Select, Switch } from "@/components";

export default function CacheControlGroupInputs() {
  // @TODO Manage current source's cache config.
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Form.Item label="Hash">
          <Select className="w-full" name="hash">
            <Select.Item value="id">id</Select.Item>
            <Select.Item value="cardId">cardId</Select.Item>
            <Select.Item value="username">username</Select.Item>
          </Select>
        </Form.Item>
        <Form.Item label="Timeout (ms)">
          <Input
            className="w-full"
            type="number"
            min="0"
            step="100"
            name="timeout"
            defaultValue="0"
          />
        </Form.Item>
      </div>
      <div className="flex items-center gap-2">
        <Switch name="isAuto" />
        <label>Auto run after the cache expiration</label>
      </div>
      <div className="space-y-2">
        <Button className="w-full" variant="error">
          Clear
        </Button>
        <p className="text-foreground-secondary">
          Do not forget to clear the cache whenever you change something.
        </p>
      </div>
    </div>
  );
}
