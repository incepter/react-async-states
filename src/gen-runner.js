export function generatorRunner(generator, ...genArgs) {
  let done = false;
  let aborted = false;
  let gen = generator(...genArgs);

  function step(...params) {
    if (done) throw new Error("gen already done! cannot step further");
    let next = gen.next(...params);

    if (next.done) done = true;
    let promise = Promise.resolve(next.value);

    promise
      .then((...args) => {
        if (!done && !aborted) {
          step(...args);
        }
      })
      .catch(e => {
        if (!aborted && !done) {
          gen.throw(e);
        }
      })
  }

  step();

  return function() {
    aborted = true;
  }
}
