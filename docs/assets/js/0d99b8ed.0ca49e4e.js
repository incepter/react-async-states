"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[670],{4993:(e,t,n)=>{n.d(t,{Zo:()=>p,kt:()=>k});var a=n(2983);function i(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function l(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function r(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?l(Object(n),!0).forEach((function(t){i(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):l(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function o(e,t){if(null==e)return{};var n,a,i=function(e,t){if(null==e)return{};var n,a,i={},l=Object.keys(e);for(a=0;a<l.length;a++)n=l[a],t.indexOf(n)>=0||(i[n]=e[n]);return i}(e,t);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(e);for(a=0;a<l.length;a++)n=l[a],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(i[n]=e[n])}return i}var d=a.createContext({}),s=function(e){var t=a.useContext(d),n=t;return e&&(n="function"==typeof e?e(t):r(r({},t),e)),n},p=function(e){var t=s(e.components);return a.createElement(d.Provider,{value:t},e.children)},c="mdxType",u={inlineCode:"code",wrapper:function(e){var t=e.children;return a.createElement(a.Fragment,{},t)}},h=a.forwardRef((function(e,t){var n=e.components,i=e.mdxType,l=e.originalType,d=e.parentName,p=o(e,["components","mdxType","originalType","parentName"]),c=s(n),h=i,k=c["".concat(d,".").concat(h)]||c[h]||u[h]||l;return n?a.createElement(k,r(r({ref:t},p),{},{components:n})):a.createElement(k,r({ref:t},p))}));function k(e,t){var n=arguments,i=t&&t.mdxType;if("string"==typeof e||i){var l=n.length,r=new Array(l);r[0]=h;var o={};for(var d in t)hasOwnProperty.call(t,d)&&(o[d]=t[d]);o.originalType=e,o[c]="string"==typeof e?e:i,r[1]=o;for(var s=2;s<l;s++)r[s]=n[s];return a.createElement.apply(null,r)}return a.createElement.apply(null,n)}h.displayName="MDXCreateElement"},3533:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>d,contentTitle:()=>r,default:()=>u,frontMatter:()=>l,metadata:()=>o,toc:()=>s});var a=n(2206),i=(n(2983),n(4993));const l={sidebar_position:2,sidebar_label:"Create source"},r="createSource",o={unversionedId:"api/create-source",id:"api/create-source",title:"createSource",description:"createSource is a function that creates shared states.",source:"@site/docs/api/2-create-source.md",sourceDirName:"api",slug:"/api/create-source",permalink:"/react-async-states/docs/api/create-source",draft:!1,editUrl:"https://github.com/incepter/react-async-states/edit/main/packages/docs/docs/api/2-create-source.md",tags:[],version:"current",sidebarPosition:2,frontMatter:{sidebar_position:2,sidebar_label:"Create source"},sidebar:"tutorialSidebar",previous:{title:"The producer",permalink:"/react-async-states/docs/api/producer-function"},next:{title:"useAsync",permalink:"/react-async-states/docs/hooks/use-async-state"}},d={},s=[{value:"Signature",id:"signature",level:2},{value:"key",id:"key",level:3},{value:"producer",id:"producer",level:3},{value:"Configuration",id:"configuration",level:2},{value:"<code>initialValue</code>",id:"initialvalue",level:3},{value:"<code>runEffect</code>",id:"runeffect",level:3},{value:"<code>runEffectDurationMs</code>",id:"runeffectdurationms",level:3},{value:"<code>skipPendingDelayMs</code>",id:"skippendingdelayms",level:3},{value:"<code>keepPendingForMs</code>",id:"keeppendingforms",level:3},{value:"<code>skipPendingStatus</code>",id:"skippendingstatus",level:3},{value:"<code>cacheConfig</code>",id:"cacheconfig",level:3},{value:"<code>enabled</code>",id:"enabled",level:4},{value:"<code>timeout</code>",id:"timeout",level:4},{value:"<code>auto</code>",id:"auto",level:4},{value:"<code>hash</code>",id:"hash",level:4},{value:"<code>persist</code>",id:"persist",level:4},{value:"<code>load</code>",id:"load",level:4},{value:"<code>onCacheLoad</code>",id:"oncacheload",level:4},{value:"<code>retryConfig</code>",id:"retryconfig",level:3},{value:"<code>enabled</code>",id:"enabled-1",level:4},{value:"<code>maxAttempts</code>",id:"maxattempts",level:4},{value:"<code>backoff</code>",id:"backoff",level:4},{value:"<code>retry</code>",id:"retry",level:4},{value:"<code>resetStateOnDispose</code>",id:"resetstateondispose",level:3},{value:"<code>context</code>",id:"context",level:3},{value:"<code>storeInContext</code>",id:"storeincontext",level:3},{value:"<code>hideFromDevtools</code>",id:"hidefromdevtools",level:3},{value:"The <code>Source</code>",id:"the-source",level:2},{value:"<code>key</code>",id:"key-1",level:3},{value:"<code>uniqueId</code>",id:"uniqueid",level:3},{value:"<code>getState</code>",id:"getstate",level:3},{value:"<code>setState</code>",id:"setstate",level:3},{value:"<code>setData</code>",id:"setdata",level:3},{value:"<code>getVersion</code>",id:"getversion",level:3},{value:"<code>run</code>",id:"run",level:3},{value:"<code>runc</code>",id:"runc",level:3},{value:"<code>runp</code>",id:"runp",level:3},{value:"<code>replay</code>",id:"replay",level:3},{value:"<code>abort</code>",id:"abort",level:3},{value:"<code>replaceProducer</code>",id:"replaceproducer",level:3},{value:"<code>getConfig</code>",id:"getconfig",level:3},{value:"<code>patchConfig</code>",id:"patchconfig",level:3},{value:"<code>getPayload</code>",id:"getpayload",level:3},{value:"<code>mergePayload</code>",id:"mergepayload",level:3},{value:"<code>subscribe</code>",id:"subscribe",level:3},{value:"<code>invalidateCache</code>",id:"invalidatecache",level:3},{value:"<code>replaceCache</code>",id:"replacecache",level:3},{value:"<code>on</code>",id:"on",level:3},{value:"<code>dispose</code>",id:"dispose",level:3},{value:"<code>getLane</code>",id:"getlane",level:3},{value:"<code>hasLane</code>",id:"haslane",level:3},{value:"<code>removeLane</code>",id:"removelane",level:3},{value:"<code>getAllLanes</code>",id:"getalllanes",level:3}],p={toc:s},c="wrapper";function u(e){let{components:t,...n}=e;return(0,i.kt)(c,(0,a.Z)({},p,n,{components:t,mdxType:"MDXLayout"}),(0,i.kt)("h1",{id:"createsource"},"createSource"),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"createSource")," is a function that creates shared states.\nIt accepts three parameters:"),(0,i.kt)("table",null,(0,i.kt)("thead",{parentName:"table"},(0,i.kt)("tr",{parentName:"thead"},(0,i.kt)("th",{parentName:"tr",align:null},"Property"),(0,i.kt)("th",{parentName:"tr",align:null},"Type"),(0,i.kt)("th",{parentName:"tr",align:null},"Description"))),(0,i.kt)("tbody",{parentName:"table"},(0,i.kt)("tr",{parentName:"tbody"},(0,i.kt)("td",{parentName:"tr",align:null},(0,i.kt)("inlineCode",{parentName:"td"},"key")),(0,i.kt)("td",{parentName:"tr",align:null},(0,i.kt)("inlineCode",{parentName:"td"},"string")),(0,i.kt)("td",{parentName:"tr",align:null},"The unique identifier of the state")),(0,i.kt)("tr",{parentName:"tbody"},(0,i.kt)("td",{parentName:"tr",align:null},(0,i.kt)("inlineCode",{parentName:"td"},"producer")),(0,i.kt)("td",{parentName:"tr",align:null},(0,i.kt)("inlineCode",{parentName:"td"},"Producer<T, A, E>")),(0,i.kt)("td",{parentName:"tr",align:null},"Returns the state value of type ",(0,i.kt)("inlineCode",{parentName:"td"},"T"))),(0,i.kt)("tr",{parentName:"tbody"},(0,i.kt)("td",{parentName:"tr",align:null},(0,i.kt)("inlineCode",{parentName:"td"},"configuration")),(0,i.kt)("td",{parentName:"tr",align:null},(0,i.kt)("inlineCode",{parentName:"td"},"ProducerConfig<T, A, E>")),(0,i.kt)("td",{parentName:"tr",align:null},"The configuration of the state")))),(0,i.kt)("h2",{id:"signature"},"Signature"),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"createSource")," is defined and used as follows:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},'export function createSource<T, A extends unknown[] = [], E = Error>(\n  key: string,\n  producer?: Producer<T, A, E> | undefined | null,\n  config?: ProducerConfig<T, A, E>\n): Source<T, A, E>;\n\n\nlet counter = createSource("counter", null, { initialValue: 0 });\nlet userDetails = createSource("user-details", fetchUserDetailsProducer, {\n  runEffect: "debounce",\n  runEffectDurationMs: 300,\n  skipPendingDelayMs: 200,\n  // ... other config we\'ll see in a few\n});\n\n')),(0,i.kt)("h3",{id:"key"},"key"),(0,i.kt)("p",null,"The key is a plain string and unique identifier of the state."),(0,i.kt)("p",null,"Giving the same key to multiple times to createSource will return the same\nsource object."),(0,i.kt)("h3",{id:"producer"},"producer"),(0,i.kt)("p",null,"The producer was detailed in ",(0,i.kt)("a",{parentName:"p",href:"/docs/api/producer-function"},"the previous section"),"."),(0,i.kt)("h2",{id:"configuration"},"Configuration"),(0,i.kt)("p",null,"The whole configuration is optional."),(0,i.kt)("h3",{id:"initialvalue"},(0,i.kt)("inlineCode",{parentName:"h3"},"initialValue")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"// T = TData, A = TArgs, E = TError\ntype typeOfInitialValue = T | ((cache: Record<string, CachedState<T, A, E>> | null) => T)\n")),(0,i.kt)("p",null,"The initial value held by the state when status is ",(0,i.kt)("inlineCode",{parentName:"p"},"initial"),"."),(0,i.kt)("p",null,"It can be also a function that allows you to initialize the state from the cache.\nMore on cache later."),(0,i.kt)("h3",{id:"runeffect"},(0,i.kt)("inlineCode",{parentName:"h3"},"runEffect")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},'type RunEffect = "debounce" | "throttle";\n')),(0,i.kt)("p",null,"The effect to apply when running the producer.\nIt is either ",(0,i.kt)("inlineCode",{parentName:"p"},"debounce")," or ",(0,i.kt)("inlineCode",{parentName:"p"},"throttle"),"."),(0,i.kt)("admonition",{type:"note"},(0,i.kt)("p",{parentName:"admonition"},"The run effect isn't applied if ",(0,i.kt)("inlineCode",{parentName:"p"},"runEffectDurationMs")," isn't given or is ",(0,i.kt)("inlineCode",{parentName:"p"},"0"),".")),(0,i.kt)("h3",{id:"runeffectdurationms"},(0,i.kt)("inlineCode",{parentName:"h3"},"runEffectDurationMs")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"type runEffectDurationMs = number;\n")),(0,i.kt)("p",null,"The ",(0,i.kt)("inlineCode",{parentName:"p"},"runEffect")," duration in milliseconds."),(0,i.kt)("h3",{id:"skippendingdelayms"},(0,i.kt)("inlineCode",{parentName:"h3"},"skipPendingDelayMs")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"type skipPendingDelayMs = number;\n")),(0,i.kt)("p",null,"The delay in ",(0,i.kt)("inlineCode",{parentName:"p"},"ms")," under which the transition to ",(0,i.kt)("inlineCode",{parentName:"p"},"pending")," state is skipped.\nThis comes in handy when you the request may be very fast and you don't want\nto show a pending indicator if so."),(0,i.kt)("h3",{id:"keeppendingforms"},(0,i.kt)("inlineCode",{parentName:"h3"},"keepPendingForMs")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"type skipPendingDelayMs = number;\n")),(0,i.kt)("p",null,"This is the reserve of the previous property, if you enter the ",(0,i.kt)("inlineCode",{parentName:"p"},"pending")," state,\nit prevents any further updates until this delay is passed, to avoid showing the\npending indicator for few milliseconds for example."),(0,i.kt)("p",null,"It reads as: If you enter the pending state, stay in it at least for this value."),(0,i.kt)("h3",{id:"skippendingstatus"},(0,i.kt)("inlineCode",{parentName:"h3"},"skipPendingStatus")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"type skipPendingStatus = boolean;\n")),(0,i.kt)("p",null,"This will prevent your state to have a pending state at all."),(0,i.kt)("h3",{id:"cacheconfig"},(0,i.kt)("inlineCode",{parentName:"h3"},"cacheConfig")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"type CacheConfig<T, A extends unknown[], E> = {\n  enabled: boolean;\n  timeout?: ((currentState: State<T, A, E>) => number) | number;\n  hash?(\n    args: A | undefined,\n    payload: Record<string, unknown> | null | undefined\n  ): string;\n  auto?: boolean;\n  persist?(cache: Record<string, CachedState<T, A, E>>): void;\n  load?():\n    | Record<string, CachedState<T, A, E>>\n    | Promise<Record<string, CachedState<T, A, E>>>;\n  onCacheLoad?({ cache, setState }: OnCacheLoadProps<T, A, E>): void;\n}\n")),(0,i.kt)("p",null,"The library supports caching state values, but it is opt-in and not\nenabled by default."),(0,i.kt)("h4",{id:"enabled"},(0,i.kt)("inlineCode",{parentName:"h4"},"enabled")),(0,i.kt)("p",null,"Will enable cache for this state."),(0,i.kt)("h4",{id:"timeout"},(0,i.kt)("inlineCode",{parentName:"h4"},"timeout")),(0,i.kt)("p",null,"The duration under which the cached state is considered still valid."),(0,i.kt)("p",null,"If this value is omitted, first, the library will check if you have a\n",(0,i.kt)("inlineCode",{parentName:"p"},"cache-control")," header with a ",(0,i.kt)("inlineCode",{parentName:"p"},"max-age")," defined. If present it will be used.\nOr else, ",(0,i.kt)("inlineCode",{parentName:"p"},"Infinity")," is used."),(0,i.kt)("h4",{id:"auto"},(0,i.kt)("inlineCode",{parentName:"h4"},"auto")),(0,i.kt)("p",null,"Indicates that we should automatically re-run the producer to get a new value\nafter timeout is elapsed."),(0,i.kt)("admonition",{type:"note"},(0,i.kt)("ul",{parentName:"admonition"},(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"auto")," doesn't work with ",(0,i.kt)("inlineCode",{parentName:"li"},"Initity"),"."),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"auto")," will remove the cached state from cache."),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"auto")," will only run again if the removed cached state is the current state."))),(0,i.kt)("h4",{id:"hash"},(0,i.kt)("inlineCode",{parentName:"h4"},"hash")),(0,i.kt)("p",null,"Each cached state is identified by a ",(0,i.kt)("inlineCode",{parentName:"p"},"string")," hash that's computed by this\nfunction. If omitted, it is calculated automatically like this:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"export function defaultHash<A extends unknown[]>(\n    args: A | undefined,\n    payload: Record<string, unknown> | null | undefined\n): string {\n    return JSON.stringify({ args, payload });\n}\n")),(0,i.kt)("h4",{id:"persist"},(0,i.kt)("inlineCode",{parentName:"h4"},"persist")),(0,i.kt)("p",null,"Called everytime a new cache entry is added or removed. Its purpose is to allow\nyou to persist the cache then load it later. In local storage for example."),(0,i.kt)("h4",{id:"load"},(0,i.kt)("inlineCode",{parentName:"h4"},"load")),(0,i.kt)("p",null,"Loads the cache when the state is constructed"),(0,i.kt)("h4",{id:"oncacheload"},(0,i.kt)("inlineCode",{parentName:"h4"},"onCacheLoad")),(0,i.kt)("p",null,"A callback fired when the cache is loaded."),(0,i.kt)("h3",{id:"retryconfig"},(0,i.kt)("inlineCode",{parentName:"h3"},"retryConfig")),(0,i.kt)("p",null,"When running the producer and it fails, you can retry it."),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"type RetryConfig<T, A extends unknown[], E> = {\n  enabled: boolean;\n  maxAttempts?: number;\n  backoff?: number | ((attemptIndex: number, error: E) => number);\n  retry?: boolean | ((attemptIndex: number, error: E) => boolean);\n};\n")),(0,i.kt)("h4",{id:"enabled-1"},(0,i.kt)("inlineCode",{parentName:"h4"},"enabled")),(0,i.kt)("p",null,"Opt into retry, this is not enabled by default."),(0,i.kt)("h4",{id:"maxattempts"},(0,i.kt)("inlineCode",{parentName:"h4"},"maxAttempts")),(0,i.kt)("p",null,"Defines the max retries to perform per run."),(0,i.kt)("h4",{id:"backoff"},(0,i.kt)("inlineCode",{parentName:"h4"},"backoff")),(0,i.kt)("p",null,"The backoff between retries."),(0,i.kt)("h4",{id:"retry"},(0,i.kt)("inlineCode",{parentName:"h4"},"retry")),(0,i.kt)("p",null,"A boolean or a function that receives the current attempt count and the error\nand returns whether we should retry or not."),(0,i.kt)("h3",{id:"resetstateondispose"},(0,i.kt)("inlineCode",{parentName:"h3"},"resetStateOnDispose")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"type resetStateOnDispose = boolean;\n")),(0,i.kt)("p",null,"The ",(0,i.kt)("inlineCode",{parentName:"p"},"dispose")," event is when all subscribers unsubscribe from a state."),(0,i.kt)("p",null,"If this property is ",(0,i.kt)("inlineCode",{parentName:"p"},"true"),", the state will be altered to its initial value."),(0,i.kt)("h3",{id:"context"},(0,i.kt)("inlineCode",{parentName:"h3"},"context")),(0,i.kt)("p",null,"This is a plain object, it should be a valid ",(0,i.kt)("inlineCode",{parentName:"p"},"WeakMap")," key."),(0,i.kt)("p",null,"To perform isolation and allowing to have multiple states with the same key,\nin the server for example, the ",(0,i.kt)("inlineCode",{parentName:"p"},"context")," api comes in."),(0,i.kt)("p",null,"When provided, the state will be created and only visible to that ",(0,i.kt)("inlineCode",{parentName:"p"},"context"),"."),(0,i.kt)("h3",{id:"storeincontext"},(0,i.kt)("inlineCode",{parentName:"h3"},"storeInContext")),(0,i.kt)("p",null,"If this is provided and is ",(0,i.kt)("inlineCode",{parentName:"p"},"false"),", the state instance won't be stored in its\ncontext."),(0,i.kt)("h3",{id:"hidefromdevtools"},(0,i.kt)("inlineCode",{parentName:"h3"},"hideFromDevtools")),(0,i.kt)("p",null,"Defines whether to show this state in the devtools or not."),(0,i.kt)("h2",{id:"the-source"},"The ",(0,i.kt)("inlineCode",{parentName:"h2"},"Source")),(0,i.kt)("p",null,"The resulting object from ",(0,i.kt)("inlineCode",{parentName:"p"},"createSource")," has the following shape:"),(0,i.kt)("h3",{id:"key-1"},(0,i.kt)("inlineCode",{parentName:"h3"},"key")),(0,i.kt)("p",null,"The used key to create the state."),(0,i.kt)("h3",{id:"uniqueid"},(0,i.kt)("inlineCode",{parentName:"h3"},"uniqueId")),(0,i.kt)("p",null,"Each state has a unique id defining it. This is an auto incremented number."),(0,i.kt)("h3",{id:"getstate"},(0,i.kt)("inlineCode",{parentName:"h3"},"getState")),(0,i.kt)("p",null,"returns the current state."),(0,i.kt)("h3",{id:"setstate"},(0,i.kt)("inlineCode",{parentName:"h3"},"setState")),(0,i.kt)("p",null,"Will alter the state to the desired value with the given status.\nThe updater can be either a value or a function that will receive the current\nstate."),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"setState(\n  updater: StateFunctionUpdater<T, A, E> | T,\n  status?: Status,\n  callbacks?: ProducerCallbacks<T, A, E>\n): void;\n")),(0,i.kt)("admonition",{type:"note"},(0,i.kt)("p",{parentName:"admonition"},"When you provide a ",(0,i.kt)("inlineCode",{parentName:"p"},"function")," updater to ",(0,i.kt)("inlineCode",{parentName:"p"},"setState"),", it is given the current\nstate.")),(0,i.kt)("admonition",{type:"warning"},(0,i.kt)("p",{parentName:"admonition"},"Although ",(0,i.kt)("inlineCode",{parentName:"p"},"setState")," gives you the previous state object as a whole, it expects\nyou to return ",(0,i.kt)("inlineCode",{parentName:"p"},"only the value"),"."),(0,i.kt)("p",{parentName:"admonition"},"The second parameter allows you to pass the ",(0,i.kt)("inlineCode",{parentName:"p"},"status")," if needed."),(0,i.kt)("p",{parentName:"admonition"},(0,i.kt)("inlineCode",{parentName:"p"},"setState")," is used internally by the library and from the devtools to allow you\nto go to any desired state. It is kept for backward compatibility and historical\nreasons.")),(0,i.kt)("admonition",{type:"tip"},(0,i.kt)("p",{parentName:"admonition"},"If you only need the previous ",(0,i.kt)("inlineCode",{parentName:"p"},"successful data")," and you will be setting ti to a\n",(0,i.kt)("inlineCode",{parentName:"p"},"success")," state, use ",(0,i.kt)("inlineCode",{parentName:"p"},"useData")," and not ",(0,i.kt)("inlineCode",{parentName:"p"},"useState"),".")),(0,i.kt)("p",null,"The implication on the difference between ",(0,i.kt)("inlineCode",{parentName:"p"},"setState")," and ",(0,i.kt)("inlineCode",{parentName:"p"},"setData")," are:"),(0,i.kt)("ul",null,(0,i.kt)("li",{parentName:"ul"},"You need to check on the state status in ",(0,i.kt)("inlineCode",{parentName:"li"},"setState")," "),(0,i.kt)("li",{parentName:"ul"},"You need to take the ",(0,i.kt)("inlineCode",{parentName:"li"},"data")," property.")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},'let source = createSource("count", null, { initialValue: 0 }):\n\nsource.setState(prevState => (prevState.data ?? 0) + 1});\n\n')),(0,i.kt)("h3",{id:"setdata"},(0,i.kt)("inlineCode",{parentName:"h3"},"setData")),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"setData")," will change the state to a ",(0,i.kt)("inlineCode",{parentName:"p"},"success")," state with the desired value."),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"setState(\n  updater: T | ((prevData: T | null) => T);\n): void;\n")),(0,i.kt)("admonition",{type:"note"},(0,i.kt)("p",{parentName:"admonition"},"When you provide a ",(0,i.kt)("inlineCode",{parentName:"p"},"function")," updater to ",(0,i.kt)("inlineCode",{parentName:"p"},"setData"),", it is given the latest\nsucceeded data, the initial data if status is initial and this value is provided,\nor else it is given ",(0,i.kt)("inlineCode",{parentName:"p"},"null"),".")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},'let source = createSource("count", null, { initialValue: 0 }):\n\nsource.setData(prev => prev! + 1);\n\n')),(0,i.kt)("h3",{id:"getversion"},(0,i.kt)("inlineCode",{parentName:"h3"},"getVersion")),(0,i.kt)("p",null,"The library implements an optimistic lock internally via a value that is\nauto-incremented each time the state changes."),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"getVersion(): number;\n")),(0,i.kt)("h3",{id:"run"},(0,i.kt)("inlineCode",{parentName:"h3"},"run")),(0,i.kt)("p",null,"Allows you to run the ",(0,i.kt)("inlineCode",{parentName:"p"},"producer")," with the given args."),(0,i.kt)("p",null,"It returns a function that will abort the related run."),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"run(...args: TArgs): AbortFn;\n")),(0,i.kt)("h3",{id:"runc"},(0,i.kt)("inlineCode",{parentName:"h3"},"runc")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"runc(\n  props: {\n    args?: TArgs,\n    onSuccess?(successState: SuccessState<TData, TArgs>): void;\n    onError?(errorState: ErrorState<TData, TArgs, TError>): void;\n  }\n): AbortFn;\n")),(0,i.kt)("p",null,"Will run the producer with the given ",(0,i.kt)("inlineCode",{parentName:"p"},"args")," and executed the given callbacks."),(0,i.kt)("p",null,"It returns a function that will abort the related run."),(0,i.kt)("h3",{id:"runp"},(0,i.kt)("inlineCode",{parentName:"h3"},"runp")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"runp(...args: A): Promise<State<TData, TArgs, TError>>;\n")),(0,i.kt)("p",null,"Similar to ",(0,i.kt)("inlineCode",{parentName:"p"},"run"),", but returns a Promise to resolve."),(0,i.kt)("p",null,"This promise resolves even if the producer throws, and gives you a state with\nerror status in this case."),(0,i.kt)("h3",{id:"replay"},(0,i.kt)("inlineCode",{parentName:"h3"},"replay")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"replay(): AbortFn;\n")),(0,i.kt)("p",null,"Will run again using the latest ",(0,i.kt)("inlineCode",{parentName:"p"},"args")," and ",(0,i.kt)("inlineCode",{parentName:"p"},"payload"),"."),(0,i.kt)("h3",{id:"abort"},(0,i.kt)("inlineCode",{parentName:"h3"},"abort")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"abort(reason?: any): void;\n")),(0,i.kt)("p",null,"Will call any registered abort callbacks from the latest run."),(0,i.kt)("p",null,"If a run is pending, it will be aborted and the previous state is restored."),(0,i.kt)("h3",{id:"replaceproducer"},(0,i.kt)("inlineCode",{parentName:"h3"},"replaceProducer")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"replaceProducer(newProducer: Producer<T, A, E> | null): void;\n")),(0,i.kt)("p",null,"Allows you to replace the producer of a state."),(0,i.kt)("h3",{id:"getconfig"},(0,i.kt)("inlineCode",{parentName:"h3"},"getConfig")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"getConfig(): ProducerConfig<T, A, E>;\n")),(0,i.kt)("p",null,"Returns the current config held by the state instance."),(0,i.kt)("h3",{id:"patchconfig"},(0,i.kt)("inlineCode",{parentName:"h3"},"patchConfig")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"patchConfig(partialConfig?: Partial<ProducerConfig<T, A, E>>): void;\n")),(0,i.kt)("p",null,"Allows you to partially add config to the defined state."),(0,i.kt)("h3",{id:"getpayload"},(0,i.kt)("inlineCode",{parentName:"h3"},"getPayload")),(0,i.kt)("p",null,"The payload is a mutable area inside the state that's accessible anytime,\nanywhere and by all subscribers."),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"getPayload(): Record<string, unknown>;\n")),(0,i.kt)("p",null,"Returns the payload object. If not defined, it will be initialized by an empty\nobject then returned."),(0,i.kt)("h3",{id:"mergepayload"},(0,i.kt)("inlineCode",{parentName:"h3"},"mergePayload")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"mergePayload(partialPayload?: Record<string, unknown>): void;\n")),(0,i.kt)("p",null,"Adds the given payload to the existing payload inside the instance."),(0,i.kt)("h3",{id:"subscribe"},(0,i.kt)("inlineCode",{parentName:"h3"},"subscribe")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"subscribe(cb: (s: State<T, A, E>) => void): UnsubscribeFn;\n")),(0,i.kt)("p",null,"Allows you to subscribe to state updates in this state."),(0,i.kt)("admonition",{type:"note"},(0,i.kt)("p",{parentName:"admonition"},"If you are using hooks, you won't need this.")),(0,i.kt)("h3",{id:"invalidatecache"},(0,i.kt)("inlineCode",{parentName:"h3"},"invalidateCache")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"invalidateCache(cacheKey?: string): void;\n")),(0,i.kt)("p",null,"Will invalidate an entry from the cache by its key."),(0,i.kt)("p",null,"It the cache key is omitted, the whole cache is removed."),(0,i.kt)("h3",{id:"replacecache"},(0,i.kt)("inlineCode",{parentName:"h3"},"replaceCache")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"replaceCache(cacheKey: string, cache: CachedState<T, A, E>): void;\n\ntype CachedState<T, A extends unknown[], E> = {\n  state: State<T, A, E>;\n  addedAt: number;\n  deadline: number;\n  // when auto refresh is enabled, we store its timeoutid in this\n  id?: ReturnType<typeof setTimeout>;\n};\n")),(0,i.kt)("p",null,"Replaces a single cache entry."),(0,i.kt)("h3",{id:"on"},(0,i.kt)("inlineCode",{parentName:"h3"},"on")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"on(\n  eventType: InstanceChangeEvent,\n  eventHandler: InstanceChangeEventHandlerType<T, A, E>\n): () => void;\non(\n  eventType: InstanceDisposeEvent,\n  eventHandler: InstanceDisposeEventHandlerType<T, A, E>\n): () => void;\non(\n  eventType: InstanceCacheChangeEvent,\n  eventHandler: InstanceCacheChangeEventHandlerType<T, A, E>\n): () => void;\n")),(0,i.kt)("p",null,"Allows you to register events for this state instance."),(0,i.kt)("p",null,"The supported events are:"),(0,i.kt)("ul",null,(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"change"),": When the state value changes, you receive the new state."),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"cache-change"),": When a cache entry changes, you receive the whole cache."),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"dispose"),": When disposing the instance occurs.")),(0,i.kt)("h3",{id:"dispose"},(0,i.kt)("inlineCode",{parentName:"h3"},"dispose")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"dispose(): boolean;\n")),(0,i.kt)("h3",{id:"getlane"},(0,i.kt)("inlineCode",{parentName:"h3"},"getLane")),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"lane"),"s are ",(0,i.kt)("inlineCode",{parentName:"p"},"Source")," objects attached to the same state instance. They share\nthe same ",(0,i.kt)("inlineCode",{parentName:"p"},"cache"),"."),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"getLane(laneKey?: string): Source<T, A, E>;\n")),(0,i.kt)("p",null,"If the request lane doesn't exist, it is created and returned."),(0,i.kt)("admonition",{type:"warning"},(0,i.kt)("p",{parentName:"admonition"},"The ",(0,i.kt)("inlineCode",{parentName:"p"},"lane")," source's key should be considered as unique too, because it will be\nattached to the same context and uses the same config."),(0,i.kt)("p",{parentName:"admonition"},"If an state with the same lane key already exists, it is returned.")),(0,i.kt)("h3",{id:"haslane"},(0,i.kt)("inlineCode",{parentName:"h3"},"hasLane")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"hasLane(laneKey: string): boolean;\n")),(0,i.kt)("p",null,"Returns true if the source has a lane with that key."),(0,i.kt)("h3",{id:"removelane"},(0,i.kt)("inlineCode",{parentName:"h3"},"removeLane")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"removeLane(laneKey?: string): boolean;\n")),(0,i.kt)("p",null,"Will detach the lane from its parent."),(0,i.kt)("h3",{id:"getalllanes"},(0,i.kt)("inlineCode",{parentName:"h3"},"getAllLanes")),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-tsx"},"getAllLanes(): Source<T, A, E>[];\n")),(0,i.kt)("p",null,"Will return all the lanes attached to the source."))}u.isMDXComponent=!0}}]);