import { Form, Select } from "@/components";

export default function SourceControlGroupInputs() {
  // @TODO Pick a source from available options.
  return (
    <Form.Item label="Key">
      <Select className="w-full" name="key">
        <Select.Item value="users">users</Select.Item>
        <Select.Item value="userByUsername">userByUsername</Select.Item>
      </Select>
    </Form.Item>
  );
}
