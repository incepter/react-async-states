import { Button, Input } from "@/components";

export default function ProducerRunner() {
  // @TODO Run current source.
  return (
    <div className="flex gap-2 border-b border-foreground-secondary/20 bg-neutral p-4 text-sm">
      <Input
        className="flex-1"
        type="url"
        name="url"
        defaultValue="https://example.com/api/users"
        readOnly
      />
      <Button>Run</Button>
    </div>
  );
}
