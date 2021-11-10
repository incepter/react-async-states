"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[23],{8815:function(e,t,n){n.r(t),n.d(t,{frontMatter:function(){return i},contentTitle:function(){return l},metadata:function(){return c},toc:function(){return u},default:function(){return d}});var r=n(7896),a=n(1461),s=(n(2784),n(876)),o=["components"],i={sidebar_position:5,sidebar_label:"useAsyncStateSelector"},l="useAsyncStateSelector",c={unversionedId:"api/use-async-state-selector",id:"api/use-async-state-selector",isDocsHomePage:!1,title:"useAsyncStateSelector",description:"Now that we know how to define and share asynchronous states (or states in general), what about selecting values",source:"@site/docs/api/use-async-state-selector.md",sourceDirName:"api",slug:"/api/use-async-state-selector",permalink:"/react-async-states/docs/api/use-async-state-selector",tags:[],version:"current",sidebarPosition:5,frontMatter:{sidebar_position:5,sidebar_label:"useAsyncStateSelector"},sidebar:"tutorialSidebar",previous:{title:"useAsyncState",permalink:"/react-async-states/docs/api/use-async-state"}},u=[],p={toc:u};function d(e){var t=e.components,n=(0,a.Z)(e,o);return(0,s.kt)("wrapper",(0,r.Z)({},p,n,{components:t,mdxType:"MDXLayout"}),(0,s.kt)("h1",{id:"useasyncstateselector"},(0,s.kt)("inlineCode",{parentName:"h1"},"useAsyncStateSelector")),(0,s.kt)("p",null,"Now that we know how to define and share asynchronous states (or states in general), what about selecting values\nfrom multiple states at once, and derive its data. Let's get back to ",(0,s.kt)("inlineCode",{parentName:"p"},"useAsyncStateSelector")," signature:"),(0,s.kt)("pre",null,(0,s.kt)("code",{parentName:"pre",className:"language-javascript"},"// keys: string or array (or function: not yet)\nfunction useAsyncStateSelector(keys, selector = identity, areEqual = shallowEqual, initialValue = undefined) {\n  // returns whathever the selector returns (or initialValue)\n}\n// where\nfunction shallowEqual(prev, next) {\n  return prev === next;\n}\nfunction identity(...args) {\n  if (!args || !args.length) {\n    return undefined;\n  }\n  return args.length === 1 ? args[0] : args;\n}\n")),(0,s.kt)("p",null,"Let's explore the arguments one by one and see what we can with them:"),(0,s.kt)("ul",null,(0,s.kt)("li",{parentName:"ul"},(0,s.kt)("inlineCode",{parentName:"li"},"keys"),": the keys you need to derive state from, can be either a string or a single async state, and array of keys\nor a function that will receive the keys being hoisted in the provider (should return a string or an array of strings)."),(0,s.kt)("li",{parentName:"ul"},(0,s.kt)("inlineCode",{parentName:"li"},"selector"),": will receive as many parameters (the async state state value) as the count of resulting keys."),(0,s.kt)("li",{parentName:"ul"},(0,s.kt)("inlineCode",{parentName:"li"},"areEqual"),": This function receives the previous and current selected value, then re-renders only if the previous and current value are not equal."),(0,s.kt)("li",{parentName:"ul"},(0,s.kt)("inlineCode",{parentName:"li"},"initialValue"),": The desired initial value if the selected value is falsy.")),(0,s.kt)("p",null,"Notes:"),(0,s.kt)("ul",null,(0,s.kt)("li",{parentName:"ul"},"The selector subscribes to all desired async states, and runs whenever they notify it by recalculating the selected value."),(0,s.kt)("li",{parentName:"ul"},"If one async state isn't found, its state value is ",(0,s.kt)("inlineCode",{parentName:"li"},"undefined"),"."),(0,s.kt)("li",{parentName:"ul"},"If not found, the selector waits for an async state (the same if an async state is removed).")),(0,s.kt)("p",null,"Examples: ",(0,s.kt)("strong",{parentName:"p"},"todo")," add selectors examples."))}d.isMDXComponent=!0},876:function(e,t,n){n.d(t,{Zo:function(){return u},kt:function(){return f}});var r=n(2784);function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function s(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?s(Object(n),!0).forEach((function(t){a(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):s(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function i(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},s=Object.keys(e);for(r=0;r<s.length;r++)n=s[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var s=Object.getOwnPropertySymbols(e);for(r=0;r<s.length;r++)n=s[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var l=r.createContext({}),c=function(e){var t=r.useContext(l),n=t;return e&&(n="function"==typeof e?e(t):o(o({},t),e)),n},u=function(e){var t=c(e.components);return r.createElement(l.Provider,{value:t},e.children)},p={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},d=r.forwardRef((function(e,t){var n=e.components,a=e.mdxType,s=e.originalType,l=e.parentName,u=i(e,["components","mdxType","originalType","parentName"]),d=c(n),f=a,y=d["".concat(l,".").concat(f)]||d[f]||p[f]||s;return n?r.createElement(y,o(o({ref:t},u),{},{components:n})):r.createElement(y,o({ref:t},u))}));function f(e,t){var n=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var s=n.length,o=new Array(s);o[0]=d;var i={};for(var l in t)hasOwnProperty.call(t,l)&&(i[l]=t[l]);i.originalType=e,i.mdxType="string"==typeof e?e:a,o[1]=i;for(var c=2;c<s;c++)o[c]=n[c];return r.createElement.apply(null,o)}return r.createElement.apply(null,n)}d.displayName="MDXCreateElement"}}]);