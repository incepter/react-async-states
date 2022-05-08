import React from "react";
import {
  createReducerProducer,
  useAsyncState,
  useAsyncStateSelector
} from "react-async-states";

function reducer(old, name, value) {
  // console.log('running', name, value);
  return {...old, [name]: value};
}

const size = 5;
export default function Demo() {
  // console.log('___________APP_____________')
  // React.useEffect(() => {
  //   console.log('---------App effect----------')
  //   return () => console.log('----------App cleanup------------')
  // })
  useAsyncState({
    lazy: true,
    key: "login-form",
    hoistToProvider: true,
    initialValue: {hello: "world!"},
    producer: createReducerProducer(reducer),
  });

  return (
    <div>
      <h3>This is a controlled dynamic form of size: {size}</h3>
      <DynamicForm initialSize={size}/>
      <hr/>
      {/*<div>*/}
      {/*  <h3>Function selector</h3>*/}
      {/*  <FunctionSelectorDemo/>*/}
      {/*</div>*/}
    </div>
  );
}

function keysSelector(allKeys) {
  return allKeys.filter(key => key.match(new RegExp('timeout|login-form', 'g')));
}

function selectorFunctionDemo(states) {
  // console.log('function selector, from', states);
  return states;
}

function FunctionSelectorDemo() {
  const t = useAsyncStateSelector(keysSelector, selectorFunctionDemo);

  return <pre>{JSON.stringify(t, null, "    ")}</pre>;
}


function DynamicForm({initialSize}) {
  const name = React.useRef();

  const [fields, setFields] = React.useState(() => [...Array(initialSize).keys()].map(t => ({name: `name_${t}`})));
  // console.log('___________________dynamic form____________________')
  return (
    <div>
      <div style={{display: "flex", flexWrap: "wrap"}}>
        {fields.map(field => <RealInput key={field.name} name={field.name}
                                        type={field.type}/>)}
      </div>
      <hr/>
      <input ref={name} placeholder="name"/>
      <button onClick={() => {
        setFields(old => [...old, {name: name.current.value}])
      }}>add new input
      </button>
    </div>
  )
}

function Input({name}) {
  const {mode, state, run, uniqueId} = useAsyncState
    .lazy({
      key: "login-form",
      selector: s => s.data[name]
    }, [name]);

  React.useEffect(() => run(name, "init_" + name), [])

  const data = state; // .data[name];

  // console.log('____________INPUT_____ss_______', name, data, uniqueId, mode)
  return (<input
    value={data || ""}
    name={name}
    placeholder={name}
    style={{maxWidth: "250px"}}
    onChange={({target: {name, value}}) => run(name, value)}
  />);
}

const RealInput = React.memo(Input, () => true);
