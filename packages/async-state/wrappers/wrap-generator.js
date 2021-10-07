import { stepAndContinueGenerator } from "../runners/gen-runner";

export function wrapGenerator(generator, asyncState, argsArray) {
  return new Promise((resolve, reject) => {
    argsArray[0].onAbort(stepAndContinueGenerator(generator, resolve, reject));
  });
}
