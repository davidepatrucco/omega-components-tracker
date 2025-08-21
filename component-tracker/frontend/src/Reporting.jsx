import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Spin, DatePicker, Select, Space } from 'antd';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { api } from './api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

// Colori per i grafici
const COLORS = ['#1677ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];

function Reporting() {
  const [loading, setLoading] = useState(true);
  const [components, setComponents] = useState([]);
  const [commesse, setCommesse] = useState([]);
  const [stati, setStati] = useState([]);
  const [dateRange, setDateRange] = useState(null); // Inizialmente null per mostrare tutti i dati
  const [selectedCommessa, setSelectedCommessa] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, commRes, statiRes] = await Promise.all([
        api.get('/components'),
        api.get('/commesse'),
        api.get('/getstati')
      ]);
      setComponents(compRes.data);
      setCommesse(commRes.data);
      setStati(statiRes.data);
      
      // Debug: verifica i dati caricati
      console.log('🔍 DEBUG - Componenti caricati:', compRes.data.length);
      console.log('🔍 DEBUG - Stati disponibili:', statiRes.data);
      console.log('🔍 DEBUG - Distribuzione stati nei componenti:', 
        [...new Set(compRes.data.map(c => c.status))].map(status => ({
          status,
          count: compRes.data.filter(c => c.status === status).length
        }))
      );
      console.log('🔍 DEBUG - Tipi di trattamento:', 
        [...new Set(compRes.data.map(c => c.treatmentType).filter(Boolean))]
      );
    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
    }
    setLoading(false);
  };

  // Filtra componenti per date range e commessa selezionata (MODIFICATO: più permissivo)
  const filteredComponents = components.filter(c => {
    // Non filtrare i componenti cancellati se non specificato
    if (selectedCommessa !== 'all' && c.commessaId !== selectedCommessa) return false;
    
    // Filtro date solo se specificato
    if (dateRange && dateRange[0] && dateRange[1]) {
      const componentDate = dayjs(c.lastUpdated || c.createdAt);
      return componentDate.isAfter(dateRange[0].startOf('day')) && componentDate.isBefore(dateRange[1].endOf('day'));
    }
    return true;
  });

  console.log('🔍 DEBUG - Componenti filtrati:', filteredComponents.length, 'di', components.length);

  // 1. Distribuzione componenti per stato (CORRETTA)
  const statusDistribution = () => {
    // Raggruppa per status effettivo dei componenti
    const statusCounts = {};
    filteredComponents.forEach(c => {
      const status = c.status || 'Non definito';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    // Converti in array per il grafico
    const result = Object.entries(statusCounts).map(([status, count]) => {
      // Trova lo stato corrispondente per avere il label completo
      const statoInfo = stati.find(s => s.code === status || s.label === status);
      const displayName = statoInfo ? statoInfo.label : status;
      
      return {
        name: displayName,
        value: count,
        percentage: filteredComponents.length ? ((count / filteredComponents.length) * 100).toFixed(1) : 0
      };
    });
    
    console.log('🔍 DEBUG - Status Distribution:', result);
    return result;
  };

  const statusData = statusDistribution();

  // 2. Componenti per tipo di trattamento (CORRETTA)
  const treatmentData = () => {
    const treatmentCounts = {};
    filteredComponents.forEach(c => {
      const treatment = c.treatmentType || 'Non specificato';
      treatmentCounts[treatment] = (treatmentCounts[treatment] || 0) + 1;
    });
    
    const result = Object.entries(treatmentCounts).map(([name, count]) => ({
      name,
      count
    }));
    
    console.log('🔍 DEBUG - Treatment Data:', result);
    return result;
  };

  const treatmentTypes = treatmentData();

  // 3. Avanzamento commesse (percentuale completamento basata su codici stato) - CORRETTA
  const commessaProgress = commesse.map(comm => {
    const commComponents = components.filter(c => c.commessaId === comm._id); // Usa tutti i componenti, non filtrati
    if (commComponents.length === 0) return null;
    
    // Calcola avanzamento basato sui codici numerici degli stati
    const totalProgress = commComponents.reduce((acc, comp) => {
      const stato = stati.find(s => s.label === comp.status || s.code === comp.status);
      const code = stato ? parseInt(stato.code) : 0;
      return acc + (isNaN(code) ? 0 : code);
    }, 0);
    
    // Trova il codice massimo negli stati disponibili
    const maxCode = Math.max(...stati.map(s => parseInt(s.code) || 0));
    const maxPossible = commComponents.length * maxCode;
    const percentage = maxPossible ? (totalProgress / maxPossible * 100) : 0;
    
    return {
      name: `${comm.code} - ${comm.name}`,
      completamento: Math.round(percentage),
      componenti: commComponents.length
    };
  }).filter(Boolean);

  console.log('🔍 DEBUG - Commessa Progress:', commessaProgress);

  // 4. Attività giornaliera (basata su lastUpdated)
  const last30Days = [];
  for (let i = 29; i >= 0; i--) {
    const date = dayjs().subtract(i, 'days');
    const dayComponents = components.filter(c => {
      const compDate = dayjs(c.lastUpdated);
      return compDate.isSame(date, 'day');
    });
    
    last30Days.push({
      date: date.format('DD/MM'),
      aggiornamenti: dayComponents.length,
      nuoviComponenti: components.filter(c => {
        const createDate = dayjs(c.createdAt);
        return createDate.isSame(date, 'day');
      }).length
    });
  }

  // 5. Componenti per criticità (CORRETTA)
  const criticalityData = () => {
    const critCounts = {};
    filteredComponents.forEach(c => {
      const crit = c.crit || 'Non specificato';
      critCounts[crit] = (critCounts[crit] || 0) + 1;
    });
    
    const result = Object.entries(critCounts).map(([crit, count]) => ({
      name: crit === 'Non specificato' ? crit : `Crit. ${crit}`,
      count
    }));
    
    console.log('🔍 DEBUG - Criticality Data:', result);
    return result.filter(item => item.count > 0);
  };

  const critData = criticalityData();

  // 6. Tempo medio per stato (basato su history) - CORRETTA
  const avgTimePerStatus = () => {
    const stateTimeData = [];
    
    stati.forEach(stato => {
      let totalDays = 0;
      let transitionCount = 0;
      
      // Per ogni componente che ha una history
      filteredComponents.forEach(comp => {
        if (!comp.history || comp.history.length === 0) return;
        
        // Trova tutte le transizioni verso questo stato
        comp.history.forEach((entry, index) => {
          if (entry.to === stato.label || entry.to === stato.code) {
            // Calcola il tempo dalla transizione precedente o dalla creazione
            const entryDate = dayjs(entry.date);
            let startDate;
            
            if (index > 0) {
              // C'è una transizione precedente
              startDate = dayjs(comp.history[index - 1].date);
            } else {
              // Prima transizione, usa la data di creazione
              startDate = dayjs(comp.createdAt);
            }
            
            const diffDays = entryDate.diff(startDate, 'day', true);
            if (diffDays >= 0 && diffDays < 365) { // Sanity check: non più di 1 anno
              totalDays += diffDays;
              transitionCount++;
            }
          }
        });
        
        // Se il componente è attualmente in questo stato, calcola da quando
        if (comp.status === stato.label || comp.status === stato.code) {
          const now = dayjs();
          let stateStartDate;
          
          // Trova quando è entrato in questo stato
          const lastTransition = comp.history.find(h => h.to === stato.label || h.to === stato.code);
          if (lastTransition) {
            stateStartDate = dayjs(lastTransition.date);
          } else {
            // Se non c'è history per questo stato, potrebbe essere lo stato iniziale
            stateStartDate = dayjs(comp.createdAt);
          }
          
          const diffDays = now.diff(stateStartDate, 'day', true);
          if (diffDays >= 0 && diffDays < 365) {
            totalDays += diffDays;
            transitionCount++;
          }
        }
      });
      
      if (transitionCount > 0) {
        stateTimeData.push({
          name: stato.label.replace(/^\d+\s*-\s*/, ''), // Rimuove il numero davanti
          giorni: parseFloat((totalDays / transitionCount).toFixed(1)),
          transizioni: transitionCount
        });
      }
    });
    
    console.log('🔍 DEBUG - Average Time Per Status:', stateTimeData);
    return stateTimeData.filter(item => item.giorni > 0);
  };

  const avgTimeData = avgTimePerStatus();

  return (
    <div>
      <Title level={2}>📊 Reporting & Analytics</Title>
      
      {/* Controlli filtri */}
      <Card size="small" style={{ marginBottom: 24 }}>
        <Space wrap>
          <span>Periodo:</span>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="DD/MM/YYYY"
            placeholder={['Data inizio', 'Data fine']}
          />
          <span>Commessa:</span>
          <Select
            value={selectedCommessa}
            onChange={setSelectedCommessa}
            style={{ minWidth: 200 }}
            placeholder="Tutte le commesse"
          >
            <Select.Option value="all">🎯 Tutte le commesse</Select.Option>
            {commesse.map(comm => (
              <Select.Option key={comm._id} value={comm._id}>
                {comm.code} - {comm.name}
              </Select.Option>
            ))}
          </Select>
        </Space>
      </Card>
      
      <Spin spinning={loading}>
        <Row gutter={[24, 24]}>
          {/* Distribuzione Stati */}
          <Col xs={24} lg={12}>
            <Card title="📊 Distribuzione Componenti per Stato" size="small">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, 'Componenti']} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          {/* Tipi di Trattamento */}
          <Col xs={24} lg={12}>
            <Card title="🔧 Componenti per Tipo di Trattamento" size="small">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={treatmentTypes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1677ff" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          {/* Avanzamento Commesse */}
          <Col xs={24}>
            <Card title="🏗️ Avanzamento Commesse (% Completamento)" size="small">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={commessaProgress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value, name) => [`${value}%`, 'Completamento']} />
                  <Bar dataKey="completamento" fill="#52c41a">
                    {commessaProgress.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.completamento > 75 ? '#52c41a' : entry.completamento > 50 ? '#faad14' : '#f5222d'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          {/* Attività Giornaliera */}
          <Col xs={24} lg={12}>
            <Card title="📅 Attività Ultimi 30 Giorni" size="small">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={last30Days}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="aggiornamenti" stackId="1" stroke="#1677ff" fill="#1677ff" name="Aggiornamenti" />
                  <Area type="monotone" dataKey="nuoviComponenti" stackId="1" stroke="#52c41a" fill="#52c41a" name="Nuovi Componenti" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          {/* Criticità */}
          <Col xs={24} lg={12}>
            <Card title="⚠️ Distribuzione per Criticità" size="small">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={critData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#faad14" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          {/* Tempo Medio per Stato */}
          {avgTimeData.length > 0 && (
            <Col xs={24}>
              <Card title="⏱️ Tempo Medio di Permanenza per Stato (giorni)" size="small">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={avgTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value, name, props) => [
                      `${value} giorni`, 
                      `Tempo medio (${props.payload.transizioni} transizioni)`
                    ]} />
                    <Bar dataKey="giorni" fill="#722ed1" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          )}
        </Row>
      </Spin>
    </div>
  );
}

export default Reporting;
