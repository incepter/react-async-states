import React from "react";
import { createSourceAsyncState } from "react-async-states";

function* reduxPromise(argv) {
  yield argv.lastSuccess.data.store.dispatch(...argv.executionArgs, argv);
  return argv.lastSuccess.data;
}

const initialRedux = {}; // createReduxStore(reducers, middlewares...);
const reduxSource = createSourceAsyncState("redux", reduxPromise, {initialValue: initialRedux});

export default function Demo() {

  return (
    <>
      Maarouf
    </>
  );
}
