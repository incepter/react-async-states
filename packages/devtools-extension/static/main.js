// chrome.devtools.inspectedWindow.eval(
//   `window.postMessage({ source: 'async-states-devtools-inject-backend' }, '*');`,
//   function(response, evalError) {
//     console.log('sent inject-backend', response, evalError);
//     if (evalError) {
//       console.error(evalError);
//     }
//   },
// );
// console.log('creating pannel')
window.chrome.devtools.panels.create("Async states", null, "index.html", null);
