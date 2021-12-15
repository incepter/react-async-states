---
sidebar_position: 3
sidebar_label: Library status
---

# Library status
`react-async-states` is in its early phases, where we've boxed more or less the features we would like it to have.
It is far from complete, we do not recommend using it in production at the moment, unless
you are a core contributor or a believer in the concepts and you want to explore it while having the ability to be
blocked by a bug or an unsupported feature, and either help solving it or wait for it to be released/fixed.

Having a stable release will require a lot of more work to be done, as actual contributors do not have enough time.
Here is the road map and the list of things that should be added before talking about a stable release (or if you wish to contribute):

- [x] support sync and async generators
- [x] re-use old instances if nothing changed (originalProducer + key + initialValue)
- [x] subscription to be aware of provider async states change, to re-connect and re-run lazy...
- [x] support the standalone/anonymous `useAsyncState(producer, dependencies)`
- [x] support default embedded provider payload (select, run other async states)
- [x] support `selector` in useAsyncState configuration
- [x] support `selector` keys to be a function receiving available keys in provider(regex usage against keys may be used in this function)
- [x] enhance logging and add dev tools to visualize states transitions
- [x] support concurrent mode to add a special mode with suspending abilities
- [ ] writing better docs
- [ ] writing codesandbox usage examples
- [ ] support passive listen mode without running async state on deps change
- [ ] investigate supporting REMOTE async states
- [ ] writing tests: only the core part is tested atm, not the react parts (although we kept a huge separation of concerns and the react fingerprint should be minimal)
- [ ] add types for a better development experience
- [ ] performance tests and optimizations
- [ ] support config at provider level for all async states to inherit it (we must define supported config)
- [ ] support server side rendering

A [trello board](https://trello.com/b/Xx23e0Dc/react-async-states) was created for better team organization.

