import * as React from "react";
import ReactDOM from "react-dom";
import ReactDOMClient from "react-dom/client";
// import {useAsyncState,} from "react-async-states";
import DevtoolsViewInternalV2 from "./v2";

import {gatewaySource} from "./sources";
// import CurrentStateDisplay from "./CurrentStateDisplay";
// import SiderDisplay from "./SiderDisplay";
// import {DevtoolsProvider} from "./context";
import {__DEV__} from "../utils";

import '../index.css';

// function DevtoolsViewInternal({
//   useDevMode,
//   onClose,
// }: {
//   useDevMode?: boolean;
//   onClose?: Function;
// }) {
//   useAsyncState.auto(
//     {
//       source: gatewaySource,
//       payload: {dev: useDevMode ?? true},
//     },
//     [useDevMode]
//   );
//
//   return (
//     <DevtoolsProvider dev={useDevMode}>
//       <div
//         className="main-bg scroll-y-auto devtools-root-animated"
//         style={{height: "100%", overflow: "auto"}}
//       >
//         {onClose && (
//           <button
//             style={{
//               zIndex: 9,
//               bottom: "16px",
//               right: "16px",
//               position: "absolute",
//               borderRadius: 100,
//               width: 50,
//               height: 50,
//               color: "#000",
//               cursor: "pointer",
//             }}
//             onClick={() => onClose()}
//           >
//             X
//           </button>
//         )}
//         <div
//           className="main-bg scroll-y-auto flex flex-row"
//           style={{height: "100%"}}
//         >
//           <SiderDisplay/>
//           <CurrentStateDisplay/>
//         </div>
//       </div>
//     </DevtoolsProvider>
//   );
// }

export function DevtoolsView() {
  if (!__DEV__) {
    return null;
  }
  return <DevtoolsView/>;
}

export function AutoConfiguredDevtools() {
  if (!__DEV__) {
    return null;
  }
  return ReactDOM.createPortal(
    <AutoConfiguredDevtoolsImpl allowResize wrapperStyle={{
      top: '50vh',
      width: '100%',
      height: '50vh',
      position: "absolute"
    }}/>,
    createHostContainer("async-states-devtools"),
  )
}

export function autoConfigureDevtools(props?: { open?: boolean }) {
  if (!__DEV__) {
    return null;
  }
  let hostContainer = createHostContainer("async-states-devtools", {
    top: '50vh',
    width: '100%',
    height: '50vh',
    position: "absolute"
  }, 'auto-devtools');

  ReactDomRender(hostContainer, <AutoConfiguredDevtoolsImpl allowResize
                                                            wrapperClassname='root-devtools-animated'
                                                            initiallyOpen={props?.open}
                                                            wrapperStyle={{
                                                              width: '100%',
                                                              height: '100%',
                                                            }}/>)
}

function ReactDomRender(hostRoot, element) {
  if (ReactDOMClient && typeof ReactDOMClient.createRoot === "function") {
    const root = ReactDOMClient.createRoot(hostRoot);
    root.render(element);
  } else {
    ReactDOM.render(element, hostRoot);
  }
}

function AutoConfiguredDevtoolsImpl({
  wrapperStyle,
  wrapperClassname,
  initiallyOpen = false,
  allowResize = false
}: { wrapperStyle?: object, wrapperClassname?: string, initiallyOpen?: boolean, allowResize?: boolean }) {
  const [visible, setVisible] = React.useState(initiallyOpen);

  React.useEffect(() => {
    function listener(e) {
      if (e.key === "Escape") {
        setVisible(old => !old);
      }
    }

    window && window.addEventListener("keydown", listener);

    return () => window && window.removeEventListener("keydown", listener);
  }, []);

  return (
    <>
      {!visible && (
        <button
          className="main-bg main-color"
          style={{
            zIndex: 9,
            bottom: "16px",
            right: "16px",
            position: "absolute",
            borderRadius: 100,
            width: 50,
            height: 50,
            cursor: "pointer",
          }}
          onClick={() => setVisible(old => !old)}
        >
          +
        </button>
      )}
      {visible && (
        <div className={wrapperClassname} style={wrapperStyle}>
          {allowResize && <Resizer/>}
          <DevtoolsViewInternalV2 />
          {/*<DevtoolsViewInternal onClose={() => setVisible(false)}/>*/}
        </div>
      )}
    </>
  );
}

function makeResizable(
  target: HTMLElement | null | undefined,
  resizer: HTMLElement | null | undefined,
) {
  function startCapture(e) {
    if (!target || !resizer) {
      return;
    }

    let startPosition = e.clientY;
    let top = target.style.top;
    let height = target.style.height;

    function updateHeight(delta: string) {
      target!.style.top = `calc(${top} - ${delta})`;
      target!.style.height = `calc(${height} + ${delta})`;
    }

    function stopCapture() {
      document.removeEventListener('mouseup', stopCapture);
      document.removeEventListener('mousemove', continueCapture);
    }

    function continueCapture(ev) {
      updateHeight(`${startPosition - ev.clientY}px`);
    }

    document.addEventListener('mouseup', stopCapture);
    document.addEventListener('mousemove', continueCapture);
  }

  resizer!.addEventListener("mousedown", startCapture);
  return () => resizer!.removeEventListener("mousedown", startCapture);
}

function Resizer() {
  const resizer = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    return makeResizable(
      document.getElementById("async-states-devtools"),
      resizer.current
    );
  }, []);

  return (
    <div ref={resizer} className="resizer"></div>
  );
}

function createHostContainer(id: string, style?: any, className?: string) {
  let maybeNode = document.getElementById(id);
  if (maybeNode) {
    return maybeNode;
  }
  let node = document.createElement("div");
  node.setAttribute("id", id);
  if (className) {
    node.setAttribute("class", className);
  }
  if (style) {
    Object.assign(node.style, style);
  }
  document.body.appendChild(node);
  return node;
}
