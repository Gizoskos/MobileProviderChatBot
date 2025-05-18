import Chat from "./chat";
import logo from './big-axolotl-face.svg';
import './App.css';


function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
      </header>
      <div>
        <Chat />
      </div>
    </div>
  );
}

export default App;
