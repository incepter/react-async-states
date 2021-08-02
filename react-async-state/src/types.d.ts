/**
 * @typedef {Object} AsyncStateForkConfig
 * @property {boolean} keepState
 *
 * @typedef {Object} HoistToProviderConfig
 * @property {boolean} override
 *
 * @typedef {Object} AsyncStateState
 * @property {"initial" | "success" | "error" | "loading" | "aborted"} status
 * @property {any} data
 * @property {any} args
 *
 * @typedef {Object} AsyncStateParameterObject
 * @property {boolean} aborted
 * @property {any} payload
 * @property {any} executionArgs
 * @property {AsyncStateState} lastSuccess
 * @property {function} onAbort
 *
 * @typedef {Object} UseAsyncStateValue
 * @property {string} key
 * @property {function} run
 * @property {function} abort
 * @property {function} replaceState
 * @property {function} runAsyncState
 * @property {AsyncStateState} state
 * @property {AsyncStateState | undefined} lastSuccess
 *
 * @callback AsyncStatePromise
 * @param {AsyncStateParameterObject} argv
 * @returns {UseAsyncStateValue}
 *
 * @typedef {Object} AsyncStatePromiseConfig
 * @property {boolean} lazy
 *
 * @typedef {Object} UseAsyncStateConfiguration
 * @property {string} key
 * @property {boolean} [fork=false]
 * @property {boolean} [condition=true]
 * @property {boolean} [hoistToProvider=false]
 * @property {AsyncStateForkConfig} [forkConfig={}]
 * @property {HoistToProviderConfig} [hoistToProviderConfig={}]
 * @property {AsyncStatePromise} promise
 * @property {AsyncStatePromiseConfig} promiseConfig
 *
 * @param {UseAsyncStateConfiguration} subscriptionConfig
 * @param {Array} dependencies
 * @returns {undefined}
 */
