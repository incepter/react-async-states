import * as React from "react";
import {createSource, useSource} from "react-async-states";


const counterSource = createSource("counter", null, {initialValue: 0});

export default function DevModeApp() {
  const source = React.useMemo(() => createSource<number>("devmodeapp", null, {initialValue: 0}), []);
  const {state} = useSource(source);
  return <button
    onClick={() => source.run(old => old.data + 1)}>{state.data}</button>
}
