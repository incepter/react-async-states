"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[449],{4467:function(e,t,n){n.r(t),n.d(t,{frontMatter:function(){return l},contentTitle:function(){return s},metadata:function(){return u},toc:function(){return c},default:function(){return d}});var r=n(7896),a=n(1461),o=(n(2784),n(876)),i=["components"],l={sidebar_position:1,sidebar_label:"The producer function"},s="The producer function",u={unversionedId:"api/producer-function",id:"api/producer-function",isDocsHomePage:!1,title:"The producer function",description:"The producer function is the function that returns the state value, it may be:",source:"@site/docs/api/producer-function.md",sourceDirName:"api",slug:"/api/producer-function",permalink:"/react-async-states/docs/api/producer-function",tags:[],version:"current",sidebarPosition:1,frontMatter:{sidebar_position:1,sidebar_label:"The producer function"},sidebar:"tutorialSidebar",previous:{title:"Library status",permalink:"/react-async-states/docs/intro/library-status"},next:{title:"AsyncStateProvider",permalink:"/react-async-states/docs/api/provider"}},c=[],p={toc:c};function d(e){var t=e.components,n=(0,a.Z)(e,i);return(0,o.kt)("wrapper",(0,r.Z)({},p,n,{components:t,mdxType:"MDXLayout"}),(0,o.kt)("h1",{id:"the-producer-function"},"The producer function"),(0,o.kt)("p",null,"The producer function is the function that returns the state value, it may be:"),(0,o.kt)("ul",null,(0,o.kt)("li",{parentName:"ul"},"A regular function returning a value."),(0,o.kt)("li",{parentName:"ul"},"A pure function returning a value based on the previous value (aka reducer)."),(0,o.kt)("li",{parentName:"ul"},"A generator (must return the state value)."),(0,o.kt)("li",{parentName:"ul"},"An asynchronous function using ",(0,o.kt)("inlineCode",{parentName:"li"},"async/await"),"."),(0,o.kt)("li",{parentName:"ul"},"A regular function returning a ",(0,o.kt)("inlineCode",{parentName:"li"},"Promise")," object.")),(0,o.kt)("p",null,"The main goal and purpose is to run your function, it receives one argument like this:"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-javascript"},"// somewhere in the code, simplified:\nyourFunction({\n  lastSuccess,\n\n  args,\n  payload,\n\n  aborted,\n  onAbort,\n  abort\n});\n")),(0,o.kt)("table",null,(0,o.kt)("thead",{parentName:"table"},(0,o.kt)("tr",{parentName:"thead"},(0,o.kt)("th",{parentName:"tr",align:null},"Property"),(0,o.kt)("th",{parentName:"tr",align:null},"Description"))),(0,o.kt)("tbody",{parentName:"table"},(0,o.kt)("tr",{parentName:"tbody"},(0,o.kt)("td",{parentName:"tr",align:null},(0,o.kt)("inlineCode",{parentName:"td"},"payload")),(0,o.kt)("td",{parentName:"tr",align:null},"The merged payload from provider and all subscribers")),(0,o.kt)("tr",{parentName:"tbody"},(0,o.kt)("td",{parentName:"tr",align:null},(0,o.kt)("inlineCode",{parentName:"td"},"lastSuccess")),(0,o.kt)("td",{parentName:"tr",align:null},"The last success value that was registered")),(0,o.kt)("tr",{parentName:"tbody"},(0,o.kt)("td",{parentName:"tr",align:null},(0,o.kt)("inlineCode",{parentName:"td"},"args")),(0,o.kt)("td",{parentName:"tr",align:null},"Whatever arguments that the ",(0,o.kt)("inlineCode",{parentName:"td"},"run")," function received when it was invoked")),(0,o.kt)("tr",{parentName:"tbody"},(0,o.kt)("td",{parentName:"tr",align:null},(0,o.kt)("inlineCode",{parentName:"td"},"aborted")),(0,o.kt)("td",{parentName:"tr",align:null},"If the request have been cancelled (by dependency change, unmount or user action)")),(0,o.kt)("tr",{parentName:"tbody"},(0,o.kt)("td",{parentName:"tr",align:null},(0,o.kt)("inlineCode",{parentName:"td"},"abort")),(0,o.kt)("td",{parentName:"tr",align:null},"Imperatively abort the producer while processing it, this may be helpful only if you are working with generators")),(0,o.kt)("tr",{parentName:"tbody"},(0,o.kt)("td",{parentName:"tr",align:null},(0,o.kt)("inlineCode",{parentName:"td"},"onAbort")),(0,o.kt)("td",{parentName:"tr",align:null},"Registers a callback that will be fired when the abort is invoked (like aborting a fetch request if the user aborts or component unmounts)")))),(0,o.kt)("p",null,"We believe that these properties will solve all sort of possible use cases, in fact, your function will run while having\naccess to payload from the render, from either the provider and subscription, and can be merged imperatively anytime\nusing ",(0,o.kt)("inlineCode",{parentName:"p"},"mergePayload")," obtained from ",(0,o.kt)("inlineCode",{parentName:"p"},"useAsyncstate"),". And also, execution args if you run it manually (not automatic)."),(0,o.kt)("p",null,"So basically you have three entry-points to your function (provider + subscription + exec args)."),(0,o.kt)("p",null,"Your function will be notified with the cancellation by registering an ",(0,o.kt)("inlineCode",{parentName:"p"},"onAbort")," callback, you can exploit this to abort\nan ",(0,o.kt)("inlineCode",{parentName:"p"},"AbortController")," which will lead your fetches to be cancelled, or to clear a timeout, for example.\nThe ",(0,o.kt)("inlineCode",{parentName:"p"},"aborted")," property is a boolean that's truthy if this current run is aborted, you may want to use it before calling\na callback received from payload or execution arguments. If using a generator, only yielding is sufficient, since the\nlibrary internally checks on cancellation before stepping any further in the generator."),(0,o.kt)("p",null,"The following functions are all supported by the library:"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-javascript"},"// retrives current user, his permissions and allowed stores before resolving\nfunction* getCurrentUser(props) {\n  const controller = new AbortController();\n  const {signal} = controller;\n  props.onAbort(function abortFetch() {\n    controller.abort();\n  });\n\n  const userData = yield fetchCurrentUser({signal});\n  const [permissions, stores] = yield Promise.all([\n    fetchUserPermissions(userData.id, {signal}),\n    fetchUserStores(userData.id, {signal}),\n  ]);\n\n  return {\n    stores,\n    permissions,\n    user: userData,\n  };\n}\n\nasync function getCurrentUserPosts(props) {\n  // [...] abort logic\n  return await fetchUserPosts(props.payload.principal.id, {signal});\n}\n\nasync function getTransactionsList(props) {\n  // abort logic\n  return await fetchUserTransactions(props.payload.principal.id, {query: props.payload.queryString, signal});\n}\n\nfunction timeout(props) {\n  let timeoutId;\n  props.onAbort(function clear() {\n    clearTimeout(timeoutId);\n  });\n\n  return new Promise(function resolver(resolve) {\n    const callback = () => resolve(invokeIfPresent(props.payload.callback));\n    timeoutId = setTimeout(callback, props.payload.delay);\n  });\n}\n\nfunction reducer(props) {\n  const action = props.args[0];\n  switch(action.type) {\n    case type1: return {...props.lastSuccess.data, ...action.newData};\n    case type2: return {...action.data};\n    \n    // mixed sync and async reducers is possible\n    // case type3: return fetchSomething()\n  }\n}\n")),(0,o.kt)("p",null,"You can even omit the producer function, it was supported along the with the ",(0,o.kt)("inlineCode",{parentName:"p"},"replaceState")," API that we will see later.\nIf you attempt to run it, it will delegate to replaceState while passing the arguments."))}d.isMDXComponent=!0},876:function(e,t,n){n.d(t,{Zo:function(){return c},kt:function(){return m}});var r=n(2784);function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function o(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?o(Object(n),!0).forEach((function(t){a(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},o=Object.keys(e);for(r=0;r<o.length;r++)n=o[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(r=0;r<o.length;r++)n=o[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var s=r.createContext({}),u=function(e){var t=r.useContext(s),n=t;return e&&(n="function"==typeof e?e(t):i(i({},t),e)),n},c=function(e){var t=u(e.components);return r.createElement(s.Provider,{value:t},e.children)},p={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},d=r.forwardRef((function(e,t){var n=e.components,a=e.mdxType,o=e.originalType,s=e.parentName,c=l(e,["components","mdxType","originalType","parentName"]),d=u(n),m=a,f=d["".concat(s,".").concat(m)]||d[m]||p[m]||o;return n?r.createElement(f,i(i({ref:t},c),{},{components:n})):r.createElement(f,i({ref:t},c))}));function m(e,t){var n=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var o=n.length,i=new Array(o);i[0]=d;var l={};for(var s in t)hasOwnProperty.call(t,s)&&(l[s]=t[s]);l.originalType=e,l.mdxType="string"==typeof e?e:a,i[1]=l;for(var u=2;u<o;u++)i[u]=n[u];return r.createElement.apply(null,i)}return r.createElement.apply(null,n)}d.displayName="MDXCreateElement"}}]);