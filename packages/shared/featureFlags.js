export const enableComponentSuspension = true;
const supportsTimeout = typeof setTimeout === "function";
export const enableRunEffects = supportsTimeout;
