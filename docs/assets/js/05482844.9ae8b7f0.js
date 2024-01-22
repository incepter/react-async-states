"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[566],{4993:(e,t,n)=>{n.d(t,{Zo:()=>c,kt:()=>k});var a=n(2983);function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function s(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?s(Object(n),!0).forEach((function(t){r(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):s(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function o(e,t){if(null==e)return{};var n,a,r=function(e,t){if(null==e)return{};var n,a,r={},s=Object.keys(e);for(a=0;a<s.length;a++)n=s[a],t.indexOf(n)>=0||(r[n]=e[n]);return r}(e,t);if(Object.getOwnPropertySymbols){var s=Object.getOwnPropertySymbols(e);for(a=0;a<s.length;a++)n=s[a],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}var l=a.createContext({}),u=function(e){var t=a.useContext(l),n=t;return e&&(n="function"==typeof e?e(t):i(i({},t),e)),n},c=function(e){var t=u(e.components);return a.createElement(l.Provider,{value:t},e.children)},d="mdxType",p={inlineCode:"code",wrapper:function(e){var t=e.children;return a.createElement(a.Fragment,{},t)}},h=a.forwardRef((function(e,t){var n=e.components,r=e.mdxType,s=e.originalType,l=e.parentName,c=o(e,["components","mdxType","originalType","parentName"]),d=u(n),h=r,k=d["".concat(l,".").concat(h)]||d[h]||p[h]||s;return n?a.createElement(k,i(i({ref:t},c),{},{components:n})):a.createElement(k,i({ref:t},c))}));function k(e,t){var n=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var s=n.length,i=new Array(s);i[0]=h;var o={};for(var l in t)hasOwnProperty.call(t,l)&&(o[l]=t[l]);o.originalType=e,o[d]="string"==typeof e?e:r,i[1]=o;for(var u=2;u<s;u++)i[u]=n[u];return a.createElement.apply(null,i)}return a.createElement.apply(null,n)}h.displayName="MDXCreateElement"},2318:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>l,contentTitle:()=>i,default:()=>p,frontMatter:()=>s,metadata:()=>o,toc:()=>u});var a=n(2206),r=(n(2983),n(4993));const s={sidebar_position:1,sidebar_label:"useAsync"},i="useAsync",o={unversionedId:"hooks/use-async-state",id:"hooks/use-async-state",title:"useAsync",description:"The useAsync hook",source:"@site/docs/hooks/1-use-async-state.md",sourceDirName:"hooks",slug:"/hooks/use-async-state",permalink:"/react-async-states/docs/hooks/use-async-state",draft:!1,editUrl:"https://github.com/incepter/react-async-states/edit/main/packages/docs/docs/hooks/1-use-async-state.md",tags:[],version:"current",sidebarPosition:1,frontMatter:{sidebar_position:1,sidebar_label:"useAsync"},sidebar:"tutorialSidebar",previous:{title:"Create source",permalink:"/react-async-states/docs/api/create-source"},next:{title:"useData",permalink:"/react-async-states/docs/hooks/use-data"}},l={},u=[{value:"The <code>useAsync</code> hook",id:"the-useasync-hook",level:2},{value:"The <code>useAsyncState</code> hook",id:"the-useasyncstate-hook",level:2},{value:"<code>string</code> config",id:"string-config",level:2},{value:"<code>Source</code> object",id:"source-object",level:2},{value:"<code>Producer</code> config",id:"producer-config",level:2},{value:"<code>object</code> config",id:"object-config",level:2},{value:"The whole producer config",id:"the-whole-producer-config",level:3},{value:"<code>key</code>",id:"key",level:3},{value:"<code>producer</code>",id:"producer",level:3},{value:"<code>source</code>",id:"source",level:3},{value:"<code>lazy</code>",id:"lazy",level:3},{value:"<code>autoRunArgs</code>",id:"autorunargs",level:3},{value:"<code>condition</code>",id:"condition",level:3},{value:"<code>lane</code>",id:"lane",level:3},{value:"<code>selector</code>",id:"selector",level:3},{value:"<code>areEqual</code>",id:"areequal",level:3},{value:"<code>concurrent</code>",id:"concurrent",level:3},{value:"<code>events</code>",id:"events",level:3},{value:"<code>subscribe</code>",id:"subscribe",level:4},{value:"<code>change</code>",id:"change",level:4},{value:"<code>useAsync</code> dependencies",id:"useasync-dependencies",level:2},{value:"<code>useAsync</code> result",id:"useasync-result",level:2},{value:"<code>source</code>",id:"source-1",level:3},{value:"<code>state</code>",id:"state",level:3},{value:"<code>Initial</code>",id:"initial",level:3},{value:"<code>isPending</code>",id:"ispending",level:3},{value:"<code>isSuccess</code>",id:"issuccess",level:3},{value:"<code>isError</code>",id:"iserror",level:3},{value:"<code>data</code>",id:"data",level:3},{value:"<code>error</code>",id:"error",level:3},{value:"<code>read</code>",id:"read",level:3},{value:"<code>onChange</code>",id:"onchange",level:3},{value:"<code>onSubscribe</code>",id:"onsubscribe",level:3},{value:"Other hooks",id:"other-hooks",level:2}],c={toc:u},d="wrapper";function p(e){let{components:t,...n}=e;return(0,r.kt)(d,(0,a.Z)({},c,n,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("h1",{id:"useasync"},(0,r.kt)("inlineCode",{parentName:"h1"},"useAsync")),(0,r.kt)("h2",{id:"the-useasync-hook"},"The ",(0,r.kt)("inlineCode",{parentName:"h2"},"useAsync")," hook"),(0,r.kt)("p",null,"This hook allows subscription and full control over a state, and represents\nthe API that you will be using with the most."),(0,r.kt)("p",null,"Its signature is:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-typescript"},"function useAsync<TData, TArgs, TError, TSelection = State<TData, TArgs, TError>>(\n  config: MixedConfig<TData, TArgs, TError, TSelection>,\n  deps: any[] = []\n): UseAsyncResult<TData, TArgs, TError> {\n  // [Not Native Code]\n}\n\n// or without types:\nfunction useAsync(config, deps) {\n  // [Not Native Code]\n}\n\n// used like this:\n\nconst result = useAsync(config, deps);\n")),(0,r.kt)("p",null,"It returns an object that contains many properties, we'll explore them in a\nmoment."),(0,r.kt)("h2",{id:"the-useasyncstate-hook"},"The ",(0,r.kt)("inlineCode",{parentName:"h2"},"useAsyncState")," hook"),(0,r.kt)("p",null,"Previously, the ",(0,r.kt)("inlineCode",{parentName:"p"},"useAsync")," hook was called ",(0,r.kt)("inlineCode",{parentName:"p"},"useAsyncState"),". It was renamed\nbecause it is shorter and they mean the same thing for the library."),(0,r.kt)("p",null,"Both hooks still exist for backward compatibility and they refer to the same\nthing."),(0,r.kt)("admonition",{type:"note"},(0,r.kt)("p",{parentName:"admonition"},"It is important to add all relevant dependencies the same way you add deps\nto any React hook such as ",(0,r.kt)("inlineCode",{parentName:"p"},"useEffect")," or ",(0,r.kt)("inlineCode",{parentName:"p"},"useMemo"),".")),(0,r.kt)("h2",{id:"string-config"},(0,r.kt)("inlineCode",{parentName:"h2"},"string")," config"),(0,r.kt)("p",null,"You can use ",(0,r.kt)("inlineCode",{parentName:"p"},"useAsync")," by providing the state name directly."),(0,r.kt)("p",null,"This won't grant you any typescript benefits because you are not passing\nan ",(0,r.kt)("inlineCode",{parentName:"p"},"initialValue")," or a ",(0,r.kt)("inlineCode",{parentName:"p"},"producer"),". But you still can annotate it."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-tsx"},'const result = useAsync<number>("counter");\nconst result = useAsync<Todos[]>("todos-list");\n')),(0,r.kt)("h2",{id:"source-object"},(0,r.kt)("inlineCode",{parentName:"h2"},"Source")," object"),(0,r.kt)("p",null,"The ",(0,r.kt)("inlineCode",{parentName:"p"},"Source")," objects are special objects understood by the library, and thus you\ncan pass it to all hooks."),(0,r.kt)("p",null,"Creating source was detailed in ",(0,r.kt)("a",{parentName:"p",href:"/docs/api/create-source"},"their section.")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-tsx"},"const result = useAsync(currentUser);\nconst result = useAsync(counterSource);\nconst result = useAsync(usersListSource);\nconst result = useAsync(userDetailsSource);\n")),(0,r.kt)("h2",{id:"producer-config"},(0,r.kt)("inlineCode",{parentName:"h2"},"Producer")," config"),(0,r.kt)("p",null,(0,r.kt)("inlineCode",{parentName:"p"},"useAsync")," accepts also the ",(0,r.kt)("inlineCode",{parentName:"p"},"Producer")," function directly."),(0,r.kt)("p",null,"Read about it ",(0,r.kt)("a",{parentName:"p",href:"/docs/api/producer-function"},"here"),"."),(0,r.kt)("p",null,"You can use it like this:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-typescript"},"const result = useAsync(myProducer);\nconst result = useAsync(function() {\n  // do something\n  // return state value or promise or thenable\n}, [...all closure variables used inside the function]);\nconst result = useAsync(async function({ args }) {\n  await stuff;\n  return await another_stuff;\n});\nconst result = useAsync(function* myProducer() {\n  // do something\n  yield stuff;\n  // return state value or promise or thenable\n  // or even\n  return yield stuff;\n  // or even\n  throw e;\n}, [...deps]);\n")),(0,r.kt)("h2",{id:"object-config"},(0,r.kt)("inlineCode",{parentName:"h2"},"object")," config"),(0,r.kt)("p",null,"The ",(0,r.kt)("inlineCode",{parentName:"p"},"useAsync")," accepts a configuration object with many properties:"),(0,r.kt)("h3",{id:"the-whole-producer-config"},"The whole producer config"),(0,r.kt)("p",null,(0,r.kt)("inlineCode",{parentName:"p"},"useAsync")," accepts all the properties used with ",(0,r.kt)("inlineCode",{parentName:"p"},"createSource"),", we won't\ntalk about them again here to keep this section small."),(0,r.kt)("p",null,"Read about them ",(0,r.kt)("a",{parentName:"p",href:"/docs/api/create-source#configuration"},"in their section.")),(0,r.kt)("p",null,"But here is the list:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"initialValue")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"runEffect")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"runEffectDurationMs")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"skipPendingDelayMs")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"keepPendingForMs")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"skipPendingStatus")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"cacheConfig")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"retryConfig")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"resetStateOnDispose")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"context")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"storeInContext")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"hideFromDevtools"))),(0,r.kt)("p",null,"In addition, the following properties are supported, and are all optional:"),(0,r.kt)("h3",{id:"key"},(0,r.kt)("inlineCode",{parentName:"h3"},"key")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-tsx"},"key: string;\n")),(0,r.kt)("p",null,"This is the same as providing a string configuration. It will be used to grab\nthe state to use."),(0,r.kt)("p",null,"If not defined, it is created using this key."),(0,r.kt)("h3",{id:"producer"},(0,r.kt)("inlineCode",{parentName:"h3"},"producer")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-tsx"},"producer: Producer;\n")),(0,r.kt)("p",null,"This is the same as providing a producer configuration. It will be used to\ncreate a state instance with this producer."),(0,r.kt)("p",null,"If the state instance already exists, its producer will be replaced by this one."),(0,r.kt)("h3",{id:"source"},(0,r.kt)("inlineCode",{parentName:"h3"},"source")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-tsx"},"source: Source;\n")),(0,r.kt)("p",null,"This is the same as providing a ",(0,r.kt)("inlineCode",{parentName:"p"},"source")," configuration. The used state is then\nthe provided source."),(0,r.kt)("h3",{id:"lazy"},(0,r.kt)("inlineCode",{parentName:"h3"},"lazy")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-tsx"},"lazy: boolean;\n")),(0,r.kt)("p",null,"If this property is set to ",(0,r.kt)("inlineCode",{parentName:"p"},"true"),", when the dependencies change,\nthe ",(0,r.kt)("inlineCode",{parentName:"p"},"producer")," will run if condition is ",(0,r.kt)("inlineCode",{parentName:"p"},"truthy"),"."),(0,r.kt)("admonition",{type:"caution"},(0,r.kt)("p",{parentName:"admonition"},"If several subscriptions are made to the same state and all of them set ",(0,r.kt)("inlineCode",{parentName:"p"},"lazy"),"\nto ",(0,r.kt)("inlineCode",{parentName:"p"},"false"),", then they may ",(0,r.kt)("inlineCode",{parentName:"p"},"abort")," each other.\nBut the latest run will remain."),(0,r.kt)("p",{parentName:"admonition"},"Pay close attention to this exact use case.")),(0,r.kt)("h3",{id:"autorunargs"},(0,r.kt)("inlineCode",{parentName:"h3"},"autoRunArgs")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-tsx"},"autoRunArgs: TArgs;\n")),(0,r.kt)("p",null,"When ",(0,r.kt)("inlineCode",{parentName:"p"},"lazy")," is ",(0,r.kt)("inlineCode",{parentName:"p"},"false")," and condition is either omitted or try thy, these args\nwill be used to run."),(0,r.kt)("h3",{id:"condition"},(0,r.kt)("inlineCode",{parentName:"h3"},"condition")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-tsx"},"condition:\n  | boolean\n  | ((\n    state: State<T, A, E>,\n    args: A,\n    payload: Record<string, unknown>\n  ) => boolean);\n")),(0,r.kt)("p",null,"This property is used only when ",(0,r.kt)("inlineCode",{parentName:"p"},"lazy")," is ",(0,r.kt)("inlineCode",{parentName:"p"},"falsy"),".\nIf the ",(0,r.kt)("inlineCode",{parentName:"p"},"condition")," is truthy, the ",(0,r.kt)("inlineCode",{parentName:"p"},"producer"),"\nassociated with the subscription will run."),(0,r.kt)("p",null,"It can also be a function that receives the actual state, args and payload."),(0,r.kt)("p",null,"This gives control over the auto run behavior depending on the state."),(0,r.kt)("h3",{id:"lane"},(0,r.kt)("inlineCode",{parentName:"h3"},"lane")),(0,r.kt)("p",null,"Lanes are a concept in the library that let's you group states with same producer:"),(0,r.kt)("p",null,"A lane is a totally separate state instance, with own pending state,\nand own payload and subscribers,  and with the same ",(0,r.kt)("inlineCode",{parentName:"p"},"config")," and ",(0,r.kt)("inlineCode",{parentName:"p"},"producer")," and ",(0,r.kt)("inlineCode",{parentName:"p"},"cache"),".\nIt is very similar to forks, but forking means a separated state instance\nnot sharing anything and don't belong to anything."),(0,r.kt)("p",null,"A lane may have multiple subscribers and its own lifecycle."),(0,r.kt)("p",null,"You can manipulate lanes from all the places in the library."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-typescript"},'import {useAsync} from "react-async-states";\n\n// subscribes to `city-casablanca` lane in the state defined in `weatherSource`\nuseAsync({\n  source: weatherSource,\n  payload: { lat, lng },\n  lane: "city-casablanca"\n});\n\n// subscribes to `user-details-me` lane in the state defined in `userDetails`\nuseAsync({\n  source: userDetails,\n  payload: { userId: "me" },\n  lane: "user-details-me"\n});\n\n// subscribes to `user-details-123` lane in the state defined in `userDetails`\nuseAsync({\n  source: userDetails,\n  payload: { userId: "123" },\n  lane: "user-details-123"\n});\n\n// subscribes to `references-company-types` lane in the state defined in `references`\nuseAsync({\n  source: references,\n  payload: { userId: "123" },\n  lane: "references-company-types"\n});\n')),(0,r.kt)("admonition",{type:"note"},(0,r.kt)("p",{parentName:"admonition"},"The previous example is flawed in the sense that most things need to be added to\nthe dependencies array. The example contains static values, but in real world,\nthey will often be some props.")),(0,r.kt)("h3",{id:"selector"},(0,r.kt)("inlineCode",{parentName:"h3"},"selector")),(0,r.kt)("p",null,"The selector that selects data from your state.\nIt is a function with the following in order parameters:"),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Parameter"),(0,r.kt)("th",{parentName:"tr",align:null},"Type"),(0,r.kt)("th",{parentName:"tr",align:null},"Description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"state")),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"State<T>")),(0,r.kt)("td",{parentName:"tr",align:null},"The current state")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"lastSuccess")),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"State<T>")),(0,r.kt)("td",{parentName:"tr",align:null},"The last registered state (may be equal to state if the current state is success)")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"cache")),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"Cache<T>")),(0,r.kt)("td",{parentName:"tr",align:null},"The cache associated to this state")))),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-typescript"},'// extend the given state\nimport {State, Status, useAsync} from "react-async-states";\n\n// this selector throws if the state is error so it is leveraged to the nearest\n// error boundary\nfunction errorBoundarySelector(state: State<T>): S {\n  // assuming you have an error boundary\n  if (state.status === "error") {\n    throw state.data;\n  }\n  return state;\n}\n\nfunction lazyDeveloperSelector(state: State<T>) {\n  return {\n    ...state,\n    isError: state.status === "error",\n    isPending: state.status === "pending",\n    isWeird: false,\n    ...\n  }\n}\n\nconst result = useAsync({\n  key,\n  selector: mySelector,\n})\n')),(0,r.kt)("admonition",{type:"note"},(0,r.kt)("p",{parentName:"admonition"},"The ",(0,r.kt)("inlineCode",{parentName:"p"},"selector")," affects only the ",(0,r.kt)("inlineCode",{parentName:"p"},"state")," property of the returned result.")),(0,r.kt)("h3",{id:"areequal"},(0,r.kt)("inlineCode",{parentName:"h3"},"areEqual")),(0,r.kt)("p",null,(0,r.kt)("inlineCode",{parentName:"p"},"areEqual")," function is used to determine whether the previous state value equals\nthe selected value from the new state."),(0,r.kt)("h3",{id:"concurrent"},(0,r.kt)("inlineCode",{parentName:"h3"},"concurrent")),(0,r.kt)("p",null,"Will cause the tree to suspend according to React concurrent features if the\nstatus is ",(0,r.kt)("inlineCode",{parentName:"p"},"pending"),"."),(0,r.kt)("h3",{id:"events"},(0,r.kt)("inlineCode",{parentName:"h3"},"events")),(0,r.kt)("p",null,"The ",(0,r.kt)("inlineCode",{parentName:"p"},"events")," property defines handlers that will be invoked."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-ts"},"export type useAsyncEvents<T> = {\n  change?: useAsyncEventFn<T> | useAsyncEventFn<T>[],\n  subscribe?: ((props: SubscribeEventProps<T>) => CleanupFn) | ((props: SubscribeEventProps<T>) => CleanupFn)[],\n}\n")),(0,r.kt)("p",null,"The supported events are:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"subscribe"),": invoked when a subscription to a state occurs."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"change"),": invoked whenever the state value changes. Always invoked, even if\n",(0,r.kt)("inlineCode",{parentName:"li"},"areEqual")," is truthy.")),(0,r.kt)("h4",{id:"subscribe"},(0,r.kt)("inlineCode",{parentName:"h4"},"subscribe")),(0,r.kt)("p",null,"This event handler is called once a subscription to a state occurs."),(0,r.kt)("p",null,"This should be mainly used to attach event listeners that may ",(0,r.kt)("inlineCode",{parentName:"p"},"run")," the producer\nor do another side effect."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"// this is how the library invokes the subscribe events.\nconst unsubscribe = subscribe(sourceObject);\n")),(0,r.kt)("p",null,"This functions returns its cleanup (if available.)"),(0,r.kt)("p",null,"Here is an example of how to use it to run your producer once your window gets\nfocused:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-typescript"},'const result = useAsync({\n  lazy: false,\n  autoRunArgs: [params],\n  key: "get-user-details",\n  events: {\n    subscribe: ({getState, source: {run, invalidateCache}}) => {\n      const state = getState();\n      function onFocus() {\n        if (shouldInvalidateCacheAndRun()) {\n          invalidateCache();\n          run();\n        }\n      }\n      window.addEventListener("focus", onFocus);\n      return () => window.removeEventListener("focus", onFocus);\n    },\n  }\n}, [params]);\n')),(0,r.kt)("h4",{id:"change"},(0,r.kt)("inlineCode",{parentName:"h4"},"change")),(0,r.kt)("p",null,"This event handler is called when the state changes."),(0,r.kt)("p",null,'Please note that these handlers are invoked after subscription to a state,\nso they will miss any state update when "',(0,r.kt)("inlineCode",{parentName:"p"},"not subscribed"),'".'),(0,r.kt)("p",null,"This should be mainly used to run side effects after ",(0,r.kt)("inlineCode",{parentName:"p"},"state")," changes."),(0,r.kt)("p",null,"Here are some examples of how to use it:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-typescript"},'const {state: {status, data}, lastSuccess, abort} = useAsync({\n    lazy: false,\n    payload: {matchParams: params},\n    key: demoAsyncStates.updateUser.key,\n    events: {\n      change: ({state, source}: {state: State, source: Source}) => {\n        if (state.status === "success") {\n          refreshList();\n          closeModal();\n        }\n      },\n    }\n  }, [params]);\n')),(0,r.kt)("h2",{id:"useasync-dependencies"},(0,r.kt)("inlineCode",{parentName:"h2"},"useAsync")," dependencies"),(0,r.kt)("p",null,(0,r.kt)("inlineCode",{parentName:"p"},"useAsync")," accepts a second parameter that corresponds to the array of its\ndependencies.\nThe default value is empty array rather that undefined."),(0,r.kt)("p",null,"When dependencies change, the following is done:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},"Lookup the state instance"),(0,r.kt)("li",{parentName:"ul"},"Invoke subscribe events if applied"),(0,r.kt)("li",{parentName:"ul"},"Auto run if applied")),(0,r.kt)("p",null,"The dependencies are the secure vault over closure variables that you make, so\nalways be sure to add them responsibly."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-typescript"},'import { useAsync } from "react-async-states";\n\n// this will change the producer everytime the params change, for example\nconst params = useParams;\nuseAsync(function getUserDetails(props) {\n  doSomethingWith(params)\n  return stateValue;\n}, [params]);\n\n// Or when using payload or args\nfunction callback() {}\nuseAsync({\n  payload: {params},\n  autoRunArgs: [callback],\n  producer(props) {\n    const {params} = props.payload;\n    callback();\n  },\n}, [\n  params,\n  callback,\n]);\n')),(0,r.kt)("admonition",{type:"warning"},(0,r.kt)("p",{parentName:"admonition"},"Be sure to add relevant component variables used in the subscription as\ndependencies or you will have unwanted behavior and hard to debug/spot bugs.")),(0,r.kt)("admonition",{type:"tip"},(0,r.kt)("p",{parentName:"admonition"},"The library was designed so that you will likely only need dependencies\nwhen the source/key configuration or",(0,r.kt)("inlineCode",{parentName:"p"},"autoRunArgs")," are variables.")),(0,r.kt)("h2",{id:"useasync-result"},(0,r.kt)("inlineCode",{parentName:"h2"},"useAsync")," result"),(0,r.kt)("h3",{id:"source-1"},(0,r.kt)("inlineCode",{parentName:"h3"},"source")),(0,r.kt)("p",null,"The source related to the state used by ",(0,r.kt)("inlineCode",{parentName:"p"},"useAsync")," is always returned."),(0,r.kt)("p",null,"Read more about its properties in ",(0,r.kt)("a",{parentName:"p",href:"/docs/api/create-source#the-source"},"its section.")),(0,r.kt)("h3",{id:"state"},(0,r.kt)("inlineCode",{parentName:"h3"},"state")),(0,r.kt)("p",null,"This is whatever the selector returns:"),(0,r.kt)("p",null,"If the selector is omitted, the whole ",(0,r.kt)("inlineCode",{parentName:"p"},"state: State<TData, TArgs, TError>")," is\nreturned."),(0,r.kt)("h3",{id:"initial"},(0,r.kt)("inlineCode",{parentName:"h3"},"Initial")),(0,r.kt)("p",null,"A boolean that's true if the current state is with ",(0,r.kt)("inlineCode",{parentName:"p"},"initial")," status."),(0,r.kt)("h3",{id:"ispending"},(0,r.kt)("inlineCode",{parentName:"h3"},"isPending")),(0,r.kt)("p",null,"A boolean that's true if the current state is with ",(0,r.kt)("inlineCode",{parentName:"p"},"pending")," status."),(0,r.kt)("h3",{id:"issuccess"},(0,r.kt)("inlineCode",{parentName:"h3"},"isSuccess")),(0,r.kt)("p",null,"A boolean that's true if the current state is with ",(0,r.kt)("inlineCode",{parentName:"p"},"success")," status."),(0,r.kt)("h3",{id:"iserror"},(0,r.kt)("inlineCode",{parentName:"h3"},"isError")),(0,r.kt)("p",null,"A boolean that's true if the current state is with ",(0,r.kt)("inlineCode",{parentName:"p"},"error")," status."),(0,r.kt)("h3",{id:"data"},(0,r.kt)("inlineCode",{parentName:"h3"},"data")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-tsx"},"data: TData | null;\n")),(0,r.kt)("p",null,"This property is always of type ",(0,r.kt)("inlineCode",{parentName:"p"},"TData")," if the status is ",(0,r.kt)("inlineCode",{parentName:"p"},"success"),". It may be\nnull if ",(0,r.kt)("inlineCode",{parentName:"p"},"status")," is:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"initial")," and no ",(0,r.kt)("inlineCode",{parentName:"li"},"initialValue")," was provided."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"pending")," and success was registered before."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"error")," and success was registered before.")),(0,r.kt)("h3",{id:"error"},(0,r.kt)("inlineCode",{parentName:"h3"},"error")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-tsx"},"error: TError | null;\n")),(0,r.kt)("p",null,"This property is of type ",(0,r.kt)("inlineCode",{parentName:"p"},"TError")," when ",(0,r.kt)("inlineCode",{parentName:"p"},"isError")," is true. It then contains the\nerror."),(0,r.kt)("h3",{id:"read"},(0,r.kt)("inlineCode",{parentName:"h3"},"read")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-typescript"},"read(suspend?: boolean = true, throwError?: boolean = true);\n")),(0,r.kt)("p",null,"This function enable the React concurrent feature: ",(0,r.kt)("inlineCode",{parentName:"p"},"Component suspension")," and\n",(0,r.kt)("inlineCode",{parentName:"p"},"Error boundary"),"."),(0,r.kt)("p",null,"So calling read requires you to have a ",(0,r.kt)("inlineCode",{parentName:"p"},"Suspense")," and/or ",(0,r.kt)("inlineCode",{parentName:"p"},"ErrorBoundary"),"\nup in your tree."),(0,r.kt)("p",null,"You can pass this function to a child component that will read the data and\nsuspend if pending."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-tsx"},'import { Suspense } from "react";\nimport { useAsync } from "react-async-states";\n\n\nfunction UserDetails({userId}) {\n  const { read } = useAsync({\n    lazy: false,\n    payload: {userId},\n    source: userDetailsPageSource,\n  }, [userId]);\n  \n  return (\n    <Suspense fallback={<Skeleton userId={userId} />}>\n      <ErrorBoundary>\n        <UserDetails read={read} />\n      </ErrorBoundary>\n    </Suspense>\n  );\n}\n\nfunction UserDetails({read}) {\n  // status will be success here\n  const {data} = read();\n  \n  return (\n    // build the UI based on the statuses you need\n  );\n}\n\n')),(0,r.kt)("h3",{id:"onchange"},(0,r.kt)("inlineCode",{parentName:"h3"},"onChange")),(0,r.kt)("p",null,"This injects ",(0,r.kt)("inlineCode",{parentName:"p"},"change")," ",(0,r.kt)("inlineCode",{parentName:"p"},"events"),", and can be called during render or\nimperatively anywhere. These events live just with the current subscription."),(0,r.kt)("h3",{id:"onsubscribe"},(0,r.kt)("inlineCode",{parentName:"h3"},"onSubscribe")),(0,r.kt)("p",null,"This injects subscribe ",(0,r.kt)("inlineCode",{parentName:"p"},"events"),", and can be called during render or\nimperatively anywhere. These events live just with the current subscription."),(0,r.kt)("h2",{id:"other-hooks"},"Other hooks"),(0,r.kt)("p",null,"For convenience, we've added the ",(0,r.kt)("inlineCode",{parentName:"p"},"useAsync.auto")," to help you add the\n",(0,r.kt)("inlineCode",{parentName:"p"},"lazy: false")," configuration property automatically."),(0,r.kt)("p",null,"It has the same signature as ",(0,r.kt)("inlineCode",{parentName:"p"},"ueAsync"),"."))}p.isMDXComponent=!0}}]);