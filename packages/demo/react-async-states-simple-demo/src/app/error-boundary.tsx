import * as React from "react";

type State = {
  counter: number;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
};
type BoundaryProps = {
  logErrors?: boolean;
  children: React.ReactNode;
};
export default class DefaultErrorBoundary extends React.PureComponent<
  BoundaryProps,
  State
> {
  constructor(props) {
    super(props);
    this.state = {
      counter: 0,
      error: null,
      errorInfo: null,
    };
    this.retry = this.retry.bind(this);
  }

  componentDidCatch(error, errorInfo) {
    this.setState((old) => ({
      ...old,
      error,
      errorInfo,
    }));
    if (this.props.logErrors) {
      console.error("RetryableErrorBoundary error", { error, errorInfo });
    }
  }

  retry() {
    this.setState((old) => ({
      error: null,
      errorInfo: null,
      counter: old.counter + 1,
    }));
  }

  render() {
    const { children } = this.props;
    const { error, errorInfo, counter } = this.state;

    if (errorInfo) {
      return (
        <div
          style={{
            padding: 8,
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={
              {
                // display: "flex",
                // alignItems: "center",
                // justifyContent: "space-between",
              }
            }
          >
            <h3>
              <span>The following error occurred {this.state.counter + 1}</span>
              <button
                className="button secondary light"
                style={{ marginLeft: 32 }}
                onClick={this.retry}
              >
                Retry
              </button>
            </h3>

            <details open>
              <summary>{error?.toString?.()}</summary>
              <button
                className="button primary light"
                style={{ marginLeft: 32 }}
                onClick={() => copyErrorInfo(this.state)}
              >
                Copy to clipboard
              </button>
              <pre>{errorInfo.componentStack}</pre>
            </details>
          </div>
        </div>
      );
    }
    return <Ghost key={counter}>{children}</Ghost>;
  }
}

function Ghost({ children }) {
  return children;
}

function copyErrorInfo(state) {
  if (!state.error) {
    return;
  }
  try {
    let messageToCopy = JSON.stringify(
      {
        app: navigator.platform,
        userAgent: navigator.userAgent,
        componentName: resolveComponentNameFromStackTrace(
          state.errorInfo.componentStack
        ),
        ...state,
      },
      null,
      4
    );
    navigator.clipboard.writeText(messageToCopy);
  } catch (e) {
    console.error("couldn't copy error info to clipboard", e);
  }
}

export function resolveComponentNameFromStackTrace(
  stack,
  level = 0
): undefined | string {
  if (!stack) {
    return undefined;
  }
  // eslint-disable-next-line prefer-regex-literals
  const regex = new RegExp(/at.(\w+).*$/, "gm");

  let levelsCount = 0;

  let match = regex.exec(stack);

  while (levelsCount < level && match) {
    match = regex.exec(stack);

    levelsCount += 1;
  }

  return match?.[1];
}
