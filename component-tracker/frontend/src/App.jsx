import React, { useState, useEffect } from 'react';
import 'antd/dist/reset.css';
import { Layout, Menu, Button, Input, AutoComplete, Spin } from 'antd';
import {
  AppstoreOutlined,
  SettingOutlined,
  BarChartOutlined,
  LogoutOutlined,
  BellOutlined,
  UserOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import MainPage from './MainPage';
import LoginPage from './LoginPage';
import Configurazioni from './Configurazioni';
import Reporting from './Reporting';
import Home from './Home';
import ListaCommesse from './ListaCommesse';
import DettaglioCommessa from './DettaglioCommessa';
import GestioneStati from './GestioneStati';
import GestioneUtenti from './GestioneUtenti';
import BarcodeScannerPage from './BarcodeScannerPage';
import ManualeUtente from './ManualeUtente';
import { api, initializeAuth } from './api';

const { Sider, Content, Header } = Layout;

function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 700;
  if (isMobile) {
    // Mostra breadcrumb solo su dettaglio commessa
    if (pathnames[0] === 'commesse' && pathnames[1]) {
      let commesse = [];
      try {
        commesse = JSON.parse(localStorage.getItem('commesse') || '[]');
      } catch {}
      const commessa = commesse.find(c => c._id === pathnames[1]);
      const label = commessa ? `${commessa.code} - ${commessa.name}` : pathnames[1];
      return (
        <div style={{ margin: '10px 0', fontSize: 15 }}>
          <span><Link to="/">Home</Link></span>
          <span> / <Link to="/commesse">Commesse</Link></span>
          <span> / {label}</span>
        </div>
      );
    }
    // Altrimenti non mostrare nulla su mobile
    return null;
  }
  // Gestione breadcrumb custom per dettaglio commessa
  if (pathnames[0] === 'commesse' && pathnames[1]) {
    // Trova la commessa corrente
    // Recupera la lista commesse dal localStorage (se disponibile) o mostra solo l'id
    let commesse = [];
    try {
      commesse = JSON.parse(localStorage.getItem('commesse') || '[]');
    } catch {}
    const commessa = commesse.find(c => c._id === pathnames[1]);
    const label = commessa ? `${commessa.code} - ${commessa.name}` : pathnames[1];
    return (
      <div style={{ margin: '16px 0' }}>
        <span><Link to="/">Home</Link></span>
        <span> / <Link to="/commesse">Commesse</Link></span>
        <span> / {label}</span>
      </div>
    );
  }
  // Gestione breadcrumb custom per /configurazioni/stati
  if (location.pathname === '/configurazioni/stati') {
    return (
      <div style={{ margin: '16px 0' }}>
        <span><Link to="/">Home</Link></span>
        <span> / <Link to="/configurazioni">Configurazioni</Link></span>
        <span> / <Link to="/configurazioni/stati">Gestione stati</Link></span>
      </div>
    );
  }
  return (
    <div style={{ margin: '16px 0' }}>
      <span><Link to="/">Home</Link></span>
      {pathnames.map((value, idx) => {
        const url = `/${pathnames.slice(0, idx + 1).join('/')}`;
        return (
          <span key={url}> / <Link to={url}>{decodeURIComponent(value)}</Link></span>
        );
      })}
    </div>
  );
}

function QuickSearch() {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [focus, setFocus] = useState(false);
  const navigate = useNavigate();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 700;

  // Funzione di ricerca locale e remota
  const handleSearch = async (val) => {
    setQuery(val);
    if (!val || val.length < 2) {
      setOptions([]);
      return;
    }
    // Cerca tra commesse in localStorage
    let commesse = [];
    try {
      commesse = JSON.parse(localStorage.getItem('commesse') || '[]');
    } catch {}
    const commessaResults = commesse.filter(c =>
      (c.name && c.name.toLowerCase().includes(val.toLowerCase())) ||
      (c.code && c.code.toLowerCase().includes(val.toLowerCase()))
    ).map(c => ({
      value: c._id,
      label: <span><b>Commessa:</b> {c.code} - {c.name}</span>,
      type: 'commessa',
      commessa: c
    }));
    // Cerca tra componenti (API)
    let componentResults = [];
    try {
      const res = await api.get('/components');
      componentResults = res.data.filter(comp =>
        comp.name && comp.name.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 10).map(comp => ({
        value: comp._id,
        label: <span><b>Componente:</b> {comp.name} <span style={{ color: '#888' }}>({comp.parentOrderCode})</span></span>,
        type: 'componente',
        componente: comp
      }));
    } catch {}
    // Unisci e limita a 10 risultati
    const allResults = [...commessaResults, ...componentResults].slice(0, 10);
    setOptions(allResults);
  };

  const handleSelect = (value, option) => {
    if (option.type === 'commessa') {
      navigate(`/commesse/${option.commessa._id}`);
    } else if (option.type === 'componente') {
      navigate(`/commesse/${option.componente.commessaId}?highlight=${option.componente._id}`);
    }
    setQuery('');
    setOptions([]);
  };

  return (
    <div
      style={{
        border: focus ? '2.5px solid #1677ff' : '2.5px solid #e0e0e0',
        borderRadius: 999,
        background: '#fff',
        padding: isMobile ? '0 4px' : 0,
        display: 'flex',
        alignItems: 'center',
        minHeight: isMobile ? 30 : 35,
        width: isMobile ? '98vw' : 320,
        maxWidth: isMobile ? 360 : undefined,
        margin: isMobile ? '0 0 0 0' : 2,
        transition: 'border-color 0.2s',
        boxSizing: 'border-box',
      }}
    >
      <AutoComplete
        value={query}
        options={options}
        style={{ width: '100%', background: 'transparent', border: 'none', boxShadow: 'none', borderRadius: 999, outline: 'none', fontSize: isMobile ? 15 : 16, minHeight: isMobile ? 28 : 35 }}
        onSelect={handleSelect}
        onSearch={handleSearch}
        onChange={setQuery}
        placeholder={isMobile ? 'Cerca...' : 'Cerca commessa o componente...'}
        allowClear
        filterOption={false}
        bordered={false}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        dropdownStyle={isMobile ? { fontSize: 15 } : {}}
      />
    </div>
  );
}

function App() {
  const [loggedIn, setLoggedIn] = useState(null); // null = checking, true = logged in, false = not logged in
  const [loading, setLoading] = useState(true); // loading state durante la verifica iniziale
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null); // Stato dell'utente
  const username = localStorage.getItem('username') || 'Utente';
  const navigate = useNavigate();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 900;

  // Funzione per verificare la validità del token al caricamento
  const checkAuthStatus = async () => {
    console.log('🔄 Checking auth status...');
    setLoading(true);
    
    // Inizializza sempre l'auth dal localStorage
    const hasToken = initializeAuth();
    const hasStoredLogin = localStorage.getItem('loggedIn') === 'true';
    
    console.log('📋 Auth check:', { hasToken, hasStoredLogin });
    
    if (!hasStoredLogin || !hasToken) {
      console.log('❌ No auth found - logging out');
      setLoggedIn(false);
      setLoading(false);
      return;
    }

    try {
      // Testa il token con una chiamata semplice
      console.log('🔍 Testing token validity...');
      const response = await api.get('/verify-token');
      console.log('✅ Token valid');
      setLoggedIn(true);
      if (response.data.user) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.log('❌ Token invalid:', error.response?.status);
      // L'interceptor ha già gestito il logout se necessario
      setLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
    
    // Verifica periodicamente il token ogni 5 minuti (solo se loggato)
    const tokenCheckInterval = setInterval(() => {
      const isStillLoggedIn = localStorage.getItem('loggedIn') === 'true';
      if (isStillLoggedIn && loggedIn) {
        // Facciamo una richiesta leggera per verificare il token
        api.get('/components').catch((error) => {
          console.log('Periodic token check failed:', error);
          // L'interceptor gestirà automaticamente il refresh o logout
        });
      }
    }, 5 * 60 * 1000); // 5 minuti

    // Gestisce il caso in cui l'utente torna alla finestra dopo un periodo
    const handleFocus = () => {
      const isStillLoggedIn = localStorage.getItem('loggedIn') === 'true';
      if (isStillLoggedIn && loggedIn) {
        checkAuthStatus();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(tokenCheckInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loggedIn]);

  const handleLogin = () => {
    console.log('🔑 Login successful');
    setLoggedIn(true);
    setLoading(false);
    console.log('✅ Login completed');
  };
  
  const handleLogout = async () => {
    console.log('🚪 Logging out...');
    try {
      await api.post('/logout').catch(() => {});
    } catch (error) {
      console.log('Logout backend call failed:', error);
    }
    
    // Pulisci tutto
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    localStorage.removeItem('profilo');
    
    setLoggedIn(false);
    console.log('✅ Logout completed');
  };

  // Mostra loading mentre controlliamo l'autenticazione
  if (loading || loggedIn === null) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f6f8fa'
      }}>
        {/* 🎨 SPINNER ELEGANTE DI ANTD */}
        <Spin size="large" />
      </div>
    );
  }

  if (!loggedIn) return <LoginPage onLogin={handleLogin} />;

  return (
    <Layout style={{ minHeight: '100vh', background: '#f6f8fa' }}>
      {/* Sidebar solo su desktop */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
        >
          <div style={{ height: 48, margin: 16, color: '#fff', fontWeight: 700, fontSize: 20, textAlign: 'center' }}>
            {!collapsed ? 'Omega' : 'Ω'}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[]}
            items={[
              { key: 'home', icon: <AppstoreOutlined />, label: <Link to="/">Home</Link> },
              { key: 'commesse', icon: <SettingOutlined />, label: <Link to="/commesse">Lista Commesse</Link> },
              { key: 'configurazioni', icon: <SettingOutlined />, label: <Link to="/configurazioni/utenti">Configurazioni</Link>,
                children: [
                  { key: 'utenti', label: <Link to="/configurazioni/utenti">Gestione utenti</Link> },
                  { key: 'stati', label: <Link to="/configurazioni/stati">Gestione stati</Link> },
                ]
              },
              { key: 'reporting', icon: <BarChartOutlined />, label: <Link to="/reporting">Reporting</Link> },
              { key: 'aiuto', icon: <QuestionCircleOutlined />, label: 'Aiuto',
                children: [
                  { key: 'manuale', icon: <FileTextOutlined />, label: <Link to="/manuale">Manuale Utente</Link> },
                  { 
                    key: 'ticket', 
                    icon: <ExclamationCircleOutlined />, 
                    label: <a href="https://bifa.atlassian.net/servicedesk/customer/portal/1" target="_blank" rel="noopener noreferrer">Open a ticket</a> 
                  },
                ]
              },
              { key: 'barcode', icon: <span role="img" aria-label="barcode">📷</span>, label: <Link to="/barcode">Lettura barcode</Link> },
            ]}
          />
        </Sider>
      )}
      <Layout>
        <Header style={{
          background: '#fff',
          padding: isMobile ? '0 8px' : '0 24px',
          minHeight: 40,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px #0001'
        }}>
          <Breadcrumbs />
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <QuickSearch />
            {!isMobile && <Button type="text" icon={<BellOutlined />} style={{ fontSize: 20 }} />}
            {!isMobile && (
              <span style={{ fontWeight: 500, color: '#222', display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserOutlined /> {username}
              </span>
            )}
            {!isMobile && <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} style={{ color: '#cf1322' }}>Logout</Button>}
          </div>
        </Header>
        <Content style={{ margin: 0, padding: isMobile ? 8 : 24, background: '#f6f8fa', minHeight: 360, overflowX: 'auto', paddingBottom: isMobile ? 64 : 24 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/commesse" element={<ListaCommesse />} />
            <Route path="/commesse/:id" element={<DettaglioCommessa />} />
            <Route path="/barcode" element={<BarcodeScannerPage />} />
            <Route path="/configurazioni" element={<Navigate to="/configurazioni/utenti" replace />} />
            <Route path="/configurazioni/stati" element={<GestioneStati />} />
            <Route path="/configurazioni/utenti" element={<GestioneUtenti />} />
            <Route path="/reporting" element={<Reporting />} />
            <Route path="/manuale" element={<ManualeUtente />} />
          </Routes>
        </Content>
        {/* Bottom navigation solo su mobile */}
        {isMobile && (
          <nav style={{
            position: 'fixed',
            left: 0,
            bottom: 0,
            width: '100vw',
            height: 64,
            background: 'rgba(255,255,255,0.85)',
            borderTop: '1.5px solid #eee',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            zIndex: 9999,
            boxShadow: '0 -2px 8px #0001',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            userSelect: 'none',
            touchAction: 'none',
            pointerEvents: 'auto',
          }}>
            <Button type="text" style={{ flex: 1, height: 64, fontSize: 16, padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none' }} onClick={() => navigate('/')}> 
              <AppstoreOutlined style={{ fontSize: 26, color: '#1677ff' }} />
              <span style={{ fontSize: 13, marginTop: 2 }}>Home</span>
            </Button>
            <Button type="text" style={{ flex: 1, height: 64, fontSize: 16, padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none' }} onClick={() => navigate('/barcode')}>
              <span role="img" aria-label="barcode" style={{ fontSize: 26, color: '#1677ff' }}>📷</span>
              <span style={{ fontSize: 13, marginTop: 2 }}>Scanner</span>
            </Button>
            <Button type="text" style={{ flex: 1, height: 64, fontSize: 16, padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none' }} onClick={() => navigate('/commesse')}>
              <SettingOutlined style={{ fontSize: 26, color: '#1677ff' }} />
              <span style={{ fontSize: 13, marginTop: 2 }}>Commesse</span>
            </Button>
            <Button type="text" style={{ flex: 1, height: 64, fontSize: 16, padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none' }} onClick={() => navigate('/reporting')}>
              <BarChartOutlined style={{ fontSize: 26, color: '#1677ff' }} />
              <span style={{ fontSize: 13, marginTop: 2 }}>Report</span>
            </Button>
          </nav>
        )}
      </Layout>
    </Layout>
  );
}

export default App;
