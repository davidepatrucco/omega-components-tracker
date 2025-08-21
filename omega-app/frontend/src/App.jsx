import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import LoginPage from './pages/LoginPage';
import MainLayout from './MainLayout';
import Lavorazioni from './pages/Lavorazioni';
import Commesse from './pages/Commesse';
import DettaglioCommessa from './pages/DettaglioCommessa';
import Notifiche from './pages/Notifiche';

export default function App(){
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Lavorazioni />} />
            <Route path="commesse" element={<Commesse />} />
            <Route path="commesse/:id" element={<DettaglioCommessa />} />
            <Route path="notifiche" element={<Notifiche />} />
            <Route path="report" element={<div>Reporting (placeholder)</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
