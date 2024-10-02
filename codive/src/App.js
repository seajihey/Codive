import React from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";

// page 요소
import Home from './pages/Home';
import Report from './pages/Report';
import Room from './pages/Room';

// component 요소
import Nav from './components/Nav';

import "./App.css";

function App() {
  const location = useLocation();

  return (
    <div className="App">
      {location.pathname !== '/' && <Nav />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/report" element={<Report />} />
        <Route path="/room" element={<Room />} />
      </Routes>
    </div>
  );
}

function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

export default AppWrapper;
