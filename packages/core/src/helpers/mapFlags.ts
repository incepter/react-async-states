import * as Flags from "../state-hook/StateHookFlags";

export function mapFlags(flags: number) {
  if (process.env.NODE_ENV === "production") {
    return [];
  }
  if (flags === null || flags === undefined) {
    return [];
  }
  let out: string[] = [];
  Object
    .entries(Flags)
    .forEach(([name, value]) => {
      if (value & flags) {
        out.push(name);
      }
    });
  return out;
}
