export function areRunEffectsSupported() {
  return typeof setTimeout === "function";
}
