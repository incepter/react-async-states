import { invokeIfPresent } from "../../shared";

export function generatorRunner(generator, ...genArgs) {
  let gen = generator(...genArgs);

  return stepAndContinueGenerator(gen);
}

export function stepAndContinueGenerator(generator, onDone, onReject) {
  let aborted = false;

  function step(input) {
    // if we try to step in an already finished generator, we throw. That's a bug
    if (generator.done) throw new Error("generator already done! cannot step further");

    // now, move generator forward
    let next = generator.next(input);
    // is it done now ?
    const {done} = next;

    let promise = Promise.resolve(next.value);

    promise
      .then(function continueGenerator(value) {
        if (!done && !aborted) {
          step(value);
        }
        if (done && !aborted) {
          invokeIfPresent(onDone, value);
        }
      })
      .catch(function onCatch(e){
        if (!aborted && !done) {
          invokeIfPresent(onReject, e);
          generator.throw(e);
        }
      })
  }

  step();

  return function abort() {
    aborted = true;
  }
}
