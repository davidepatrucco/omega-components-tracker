import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import LoginPage from './pages/LoginPage';
import MainLayout from './MainLayout';
import Lavorazioni from './pages/Lavorazioni';
import Commesse from './pages/Commesse';
import DettaglioCommessa from './pages/DettaglioCommessa';
import GestioneUtenti from './pages/GestioneUtenti';
import Notifiche from './pages/Notifiche';
import ViewFiles from './pages/ViewFiles';
import AnagraficaTrattamenti from './pages/AnagraficaTrattamenti';

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
            <Route path="utenti" element={<GestioneUtenti />} />
            <Route path="files" element={<ViewFiles />} />
            <Route path="anagrafiche/trattamenti" element={<AnagraficaTrattamenti />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
