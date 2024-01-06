import { Form, Input } from "@/components";

export default function TimingControlGroupInputs() {
  // @TODO Change timing stuff.
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-2">
      <Form.Item label="Keep pending">
        <Input
          className="w-full"
          type="number"
          min="0"
          step="100"
          name="keepPending"
          defaultValue="500"
        />
      </Form.Item>
      <Form.Item label="Skip pending delay">
        <Input
          className="w-full"
          type="number"
          min="0"
          step="100"
          name="skipPendingDelay"
          defaultValue="200"
        />
      </Form.Item>
    </div>
  );
}
