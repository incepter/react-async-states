import * as Flags from './StateHookFlags';

export function humanizeDevFlags(flags: number) {
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
