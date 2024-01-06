import { Form, Input, Select } from "@/components";

export default function RunEffectControlGroupInputs() {
  // @TODO Change the run effect.
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-2">
      <Form.Item label="Type">
        <Select className="w-full" name="type">
          <Select.Item value="delay">Delay</Select.Item>
          <Select.Item value="debounce">Debounce</Select.Item>
          <Select.Item value="throttle">Throttle</Select.Item>
        </Select>
      </Form.Item>
      <Form.Item label="Duration">
        <Input
          className="w-full"
          type="number"
          min="0"
          step="100"
          name="runEffectDuration"
          defaultValue="2000"
        />
      </Form.Item>
    </div>
  );
}
