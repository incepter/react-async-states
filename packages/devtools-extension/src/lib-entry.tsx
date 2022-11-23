import {__DEV__} from "./utils";

export function DevtoolsViewLib() {
  if (!__DEV__) {
    return null;
  }
}


export function AutoConfiguredDevtools() {
  if (!__DEV__) {
    return null;
  }
}


export function autoConfigureDevtools(props?: { open?: boolean }) {
  if (!__DEV__) {
    return;
  }
}
