import React from "react";
import { useAsyncStateSelector, useAsyncState, createReducerPromise } from "react-async-states";

function reducer(old, name, value) {
  return {...old, [name]: value};
}

const size = 30;
export default function Demo() {
  useAsyncState({
    lazy: true,
    key: "login-form",
    hoistToProvider: true,
    initialValue: {hello: "world!"},
    promise: createReducerPromise(reducer),
    rerenderStatus: {pending: false, success: false}
  });

  return (
    <div>
      <h3>This is a controlled dynamic login form of size: {size}</h3>
      <DynamicForm initialSize={size}/>
      <hr />
      <div>
        <h3>Function selector</h3>
        <FunctionSelectorDemo />
      </div>
    </div>
  );
}

function keysSelector(allKeys) {
  return allKeys.filter(key => key.match(new RegExp('timeout|login-form', 'g')));
}

function selectorFunctionDemo(states) {
  return states;
}

function FunctionSelectorDemo() {
  const t = useAsyncStateSelector(keysSelector, selectorFunctionDemo);

  return JSON.stringify(t);
}


function DynamicForm({ initialSize}) {
  const name = React.useRef();

  const [fields, setFields] = React.useState(() => [...Array(initialSize).keys()].map(t => ({name: `name_${t}`})));
  return (
    <div>
      <div style={{display: "flex", flexWrap: "wrap"}}>
        {fields.map(field => <RealInput key={field.name} name={field.name} type={field.type}/>)}
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
  const {state, run} = useAsyncState({
    lazy: true,
    key: "login-form",
    selector: state => state.data[name],
  }, [name]);

  return (<input
    value={state || ""}
    name={name}
    placeholder={name}
    style={{maxWidth: "250px"}}
    onChange={({target: {name, value}}) => run(name, value)}
  />);
}

const RealInput = React.memo(Input);
