import React from "react";
import { useAsyncState, createReducerPromise } from "react-async-states";

function reducer(old, name, value) {
  return {...old, [name]: value};
}

const size = 3;
export default function Demo() {
  useAsyncState({
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
    </div>
  );
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
