import React from 'react';
import './App.css';
import LoginPage from "./pages/login/Login";
import ProfileView from "./pages/login/ProfileView";

function App() {
  return (
    <div className="App">
      <LoginPage/>
      <hr />
      <ProfileView />
    </div>
  );
}

export default App;
