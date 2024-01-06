import { Form, Input, Select } from "@/components";

export default function ProducerControlGroupInputs() {
  // @TODO Change current source's producer (pre-defined functions).
  return (
    <div className="space-y-2">
      <Form.Item label="Function">
        <Select className="w-full" name="function">
          <Select.Item value="fetchUsers">fetchUsers</Select.Item>
          <Select.Item value="searchUserByUsername">
            searchUserByUsername
          </Select.Item>
        </Select>
      </Form.Item>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-2">
        <Form.Item label="[arg-0] Page">
          <Input
            className="w-full"
            type="number"
            min="1"
            name="arg_0"
            defaultValue="1"
          />
        </Form.Item>
        <Form.Item label="[arg-1] Limit">
          <Input
            className="w-full"
            type="number"
            min="1"
            name="arg_1"
            defaultValue="5"
          />
        </Form.Item>
      </div>
    </div>
  );
}
