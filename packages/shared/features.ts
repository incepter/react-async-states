export const enableComponentSuspension = true;

export function areRunEffectsSupported() {
  return typeof setTimeout === "function";
}
