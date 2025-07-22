import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import EscalaParcial from './EscalaParcial';
import MobileEscala from './MobileEscala';

function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/parcial" element={<EscalaParcial />} />
        <Route path="/mobile" element={<MobileEscala />} />
        <Route path="/mobile/:linkId" element={<MobileEscala />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default AppRouter; 