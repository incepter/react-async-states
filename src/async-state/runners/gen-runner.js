/* not used, yet! */
/* istanbul ignore next */
import { invokeIfPresent } from "../../shared";

export function generatorRunner(generator, ...genArgs) {
  let gen = generator(...genArgs);

  return stepAndContinueGenerator(gen);
}

export function stepAndContinueGenerator(generator, onDone, onReject) {
  let done = false;
  let aborted = false;

  function step(input) {
    if (done) throw new Error("generator already done! cannot step further");
    let next = generator.next(input);

    if (next.done) done = true;
    let promise = Promise.resolve(next.value);

    promise
      .then(function continueGen(value) {
        if (!done && !aborted) {
          step(value);
        }
        if (done && !aborted) {
          invokeIfPresent(onDone, value);
        }
      })
      .catch(function onCatch(e){
        if (!aborted && !done) {
          generator.throw(e);
          invokeIfPresent(onReject, e);
        }
      })
  }

  step();

  return function abort() {
    aborted = true;
  }
}
