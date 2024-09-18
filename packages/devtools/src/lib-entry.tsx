import { __DEV__ } from "./utils";

export function Devtools() {
  if (!__DEV__) {
    return null;
  }
}

export function autoConfigureDevtools(props?: { open?: boolean }) {
  if (!__DEV__) {
    return;
  }
}
