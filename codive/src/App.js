import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import Nav from './components/Nav';

// page 요소
import Home from './pages/Home';
import Report from './pages/Report';
import Room from './pages/Room';

// component 요소

import "./App.css";

function App() {
  const [allowAICodeRecommendation, setAllowAICodeRecommendation] = useState(false);
  const location = useLocation();



  return (
    <div className="App">
      {location.pathname !== '/' && <Nav />}
      <Routes>
        <Route 
          path="/" 
          element={
            <Home 
              allowAICodeRecommendation={allowAICodeRecommendation} 
              setAllowAICodeRecommendation={setAllowAICodeRecommendation} 
            />
          } 
        />
        <Route path="/report" element={<Report />} />
        <Route path="/room" element={<Room allowAICodeRecommendation={allowAICodeRecommendation} />} />
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
