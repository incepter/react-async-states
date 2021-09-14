/**
 * global chrome
 */
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <p>
          Hello
        </p>
      </header>
    </div>
  );
}

export default App;

window.chrome.devtools.panels.create("Async states", null, "index.html", null);
