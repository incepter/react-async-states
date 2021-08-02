import { __DEV__, noop } from "./shared";

const LogLevels = Object.freeze({
  trace: {order: 1, value: "trace"},
  debug: {order: 2, value: "debug"},
  info: {order: 3, value: "info"},
  warn: {order: 4, value: "warn"},
  error: {order: 5, value: "error"},
});

export const IS_LOGGER_ENABLED = process.env.IS_LOGGER_ENABLED || __DEV__;
export const LOG_LEVEL = process.env.LOG_LEVEL || LogLevels.trace.value;

function Logger(enable) {
  if (enable) {
    consoleLog("Logger is enabled!");
  } else {
    return {
      trace: noop,
      debug: noop,
      info: noop,
      warn: noop,
      error: noop,
    };
  }
  const configuredLoglevel = LogLevels[LOG_LEVEL];

  function consoleLog(...args) {
    return console.log(...args);
  }
  function consoleWarn(...args) {
    return console.warn(...args);
  }
  function consoleError(...args) {
    return console.error(...args);
  }

  function log(level, fn) {
    return function loggingFunc(...args) {
      if (configuredLoglevel.order <= level.order) {
        fn(...args);
      }
    }
  }

  return {
    trace: log(LogLevels.trace, consoleLog),
    debug: log(LogLevels.debug, consoleLog),
    info: log(LogLevels.info, consoleLog),
    warn: log(LogLevels.warn, consoleWarn),
    error: log(LogLevels.error, consoleError),
  };
}

export const logger = Logger(IS_LOGGER_ENABLED);
