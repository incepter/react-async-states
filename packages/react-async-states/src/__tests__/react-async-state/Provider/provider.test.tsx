import * as React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {mockDateNow} from "../utils/setup";
import {AsyncStateProvider} from "../../../provider/AsyncStateProvider";
import {useAsyncState} from "../../../hooks/useAsyncState";
import {UseAsyncState} from "../../../types.internal";
import {flushPromises} from "../utils/test-utils";

mockDateNow();


describe('dynamic provider states hoisting', () => {

  function newOne(key) {
    return {
      key,
      config: {
        initialValue: key.length,
      }
    };
  }

  function Father() {
    const {mode, state, uniqueId, run} = useAsyncState({
      key: "counter",
      initialValue: 0,
      hoistToProvider: true
    });
    return <button data-testid={`father`} onClick={() => run((old) => old.data + 1)}>
      FATHER - {state.data} - {mode}
    </button>;
  }

  function DynamicSubscribe() {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [asyncStates, setAsyncStates] = React.useState<string[]>([]);

    function onClick() {
      if (inputRef.current?.value) {
        setAsyncStates(old => ([...old, inputRef.current!.value]))
      }
    }

    return (
      <section>
        <input data-testid={`add-subscription-input`} ref={inputRef}/>
        <button
          data-testid={`add-subscription-button`}
          onClick={onClick}>Add
        </button>
        <main>
          {asyncStates.map((t, i) => <SimpleSub alias="dynamic" subIndex={i} key={`${t}-${i}`}
                                                subKey={t}/>)}
        </main>
      </section>
    );
  }

  function SimpleSub({subKey, alias, subIndex}) {
    const {
      mode,
      state,
      run
    } = useAsyncState({key: subKey}, [subKey]) as UseAsyncState<number>;

    function onClick() {
      run(old => old.data + 1)
    }

    return (
      <p>
        <button data-testid={`subscription-${subKey}-${alias}-${subIndex}-button`}
                onClick={onClick}>{subKey} - {mode} - {state?.data}
        </button>
      </p>
    )
  }


  function Test() {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [asyncStates, setAsyncStates] = React.useState({});

    function onClick() {
      if (inputRef.current?.value) {
        setAsyncStates(old => ({
          ...old,
          [inputRef.current!.value]: newOne(inputRef.current!.value)
        }))
      }
    }

    return (
      <>
        <section>
          <input data-testid={`add-state-input`} ref={inputRef}/>
          <button
            data-testid={`add-state-button`}
            onClick={onClick}>Add
          </button>
        </section>
        <AsyncStateProvider initialStates={asyncStates}>
          {Object.keys(asyncStates).map((t, i) => <SimpleSub alias="global" subIndex={i}
                                                             key={`${t}-${i}`}
                                                             subKey={t}/>)}
          <Father/>
          <DynamicSubscribe/>
        </AsyncStateProvider>
      </>
    );
  }

  it('should add new entries to provider and subscribe to them', async () => {
    // given
    // when
    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    )

    // then

    const addStateInput = screen.getByTestId("add-state-input");
    const addStateButton = screen.getByTestId("add-state-button");

    const addSubscriberInput = screen.getByTestId("add-subscription-input");
    const addSubscriberButton = screen.getByTestId("add-subscription-button");


    // then
    act(() => {
      fireEvent.change(addStateInput, {target: {value: 'counter-1'}}); // length = 9
      fireEvent.click(addStateButton);
    });

    expect(screen.getByTestId("subscription-counter-1-global-0-button").innerHTML)
      .toEqual("counter-1 - LISTEN - 9");


    act(() => {
      fireEvent.change(addSubscriberInput, {target: {value: 'counter-1'}}); // length = 9
      fireEvent.click(addSubscriberButton);
    });

    expect(screen.getByTestId("subscription-counter-1-dynamic-0-button").innerHTML)
      .toEqual("counter-1 - LISTEN - 9");

    act(() => {
      // increment value
      fireEvent.click(screen.getByTestId("subscription-counter-1-dynamic-0-button"));
    });


    expect(screen.getByTestId("subscription-counter-1-global-0-button").innerHTML)
      .toEqual("counter-1 - LISTEN - 10");
    expect(screen.getByTestId("subscription-counter-1-dynamic-0-button").innerHTML)
      .toEqual("counter-1 - LISTEN - 10");
  });
  it('should add subscriber and wait for entries', async () => {
    // given
    // when
    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    )

    // then

    const addStateInput = screen.getByTestId("add-state-input");
    const addStateButton = screen.getByTestId("add-state-button");

    const addSubscriberInput = screen.getByTestId("add-subscription-input");
    const addSubscriberButton = screen.getByTestId("add-subscription-button");



    act(() => {
      fireEvent.change(addSubscriberInput, {target: {value: 'counter-1'}}); // length = 9
      fireEvent.click(addSubscriberButton);
    });


    expect(screen.getByTestId("subscription-counter-1-dynamic-0-button").innerHTML)
      .toEqual("counter-1 - WAITING - ");

    // then
    act(() => {
      fireEvent.change(addStateInput, {target: {value: 'counter-1'}}); // length = 9
      fireEvent.click(addStateButton);
    });

    expect(screen.getByTestId("subscription-counter-1-global-0-button").innerHTML)
      .toEqual("counter-1 - LISTEN - 9");


    await act(async () => {
      await flushPromises();
    });
    expect(screen.getByTestId("subscription-counter-1-dynamic-0-button").innerHTML)
      .toEqual("counter-1 - LISTEN - 9");


    act(() => {
      // increment value
      fireEvent.click(screen.getByTestId("subscription-counter-1-global-0-button"));
    });


    expect(screen.getByTestId("subscription-counter-1-global-0-button").innerHTML)
      .toEqual("counter-1 - LISTEN - 10");
    expect(screen.getByTestId("subscription-counter-1-dynamic-0-button").innerHTML)
      .toEqual("counter-1 - LISTEN - 10");
  });
});
