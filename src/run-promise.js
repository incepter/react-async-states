export function runPromiseState(promiseState, ...args) {
  if (!promiseState.promise || typeof promiseState.promise !== "function") {
    return null;
  }
  const { renderCtx = {}, providerCtx = {}, executionArgs = {} } = promiseState;

  const paramsObject = {
    renderCtx,
    providerCtx,
    executionArgs,
    ...args,
  };

  return promiseState.promise(paramsObject);
}
