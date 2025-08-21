to fix:

0) l'header ed il menu devono essere sticky e on top a tutto (anche la spalla con il menu a sx). L'icona ed il titolo Omega devono essere nell'header e non nella spalla. L'header deve essere 100 width, quindi la spalla deve stare sotto l'header. Il menu hamburger deve essere nella spalla sopra il menu e consentire di collassare la spalla

1) Failed to load resource: the server responded with a status of 404 (Not Found) -- http://localhost:5173/favicon.ico

2) Nel menu la icon bar deve segnalare se ci sono notifiche non lette. Serve quindi una pagina che chiamiamo "notifiche" che starà sul menu di sinistra, e dovrà mostrare l'elenco delle notifiche per l'utente, in relazione alla API /getNotifiche cui si passa l'utenza. 

3) centra le icone dentro la colonna "azioni" nella pagina delle commesse

4) Sia nella pagina di gestione commesse, che nella pagina delle Lavorazioni, by default filtra solo per le commesse per le quali esiste almeno una componente ancora non spedito, passando al backend il flag "solochiuse"
 Sull pagina di GEstione Commesse, Aggiungi però un checkbox, tipo in alto a destra sulla stessa riga di Crea commessa e Upload nuova commessa, che dice "Mostra anche commesse chiuse". Se è checcato, in questo caso, deve passare a back-end l'informazione di Estrarre anche le commesse chiuse.
 Sulla pagina di lavorazioni, nei filtri , fa..

5) WIP aggiorniamo gli indicatori della pagina lavorazione

- in lavorazione il numero di tutti i componenti esistenti al sistema per i quali lo stato non è spedito
- da spedire: la somma dei componenti che sono in stato pronti per la consegna 
- verificato il numero dei componenti non spediti per il quale il flag verificato è false. esprimilo anche come percentuale o con barrato rispetto al totale dei componenti non spediti 
- spediti oggi il numero dei componenti che sono in stato spedito con data odierna 
- commesse aperte, il numero delle commesse non componenti commesse per il quale esiste almeno un componente che non è in stato spedito
- In trattamento, il numero dei componenti che sono in uno degli stati in trattamento.

il mio consiglio è di creare una api /getStats che ricalcola su backend e restituisce questi valori al fronted, che li mostra e basta

6) WIP Effettuiamo una gestione più fine legata ai trattamenti. Quando creo una commessa facendo Upload da Excel, il campo Trattamenti è una stringa-->OK. Molto bene. 

Ho bisogno però di fare un parse di quella stringa per andare a identificare se ci sono dei più (+) e isolare i segmenti della stringa separati dai più. Quella diventerà la mia lista dei trattamenti da applicare e sarà visualizzata come tag. 

esempio: nichelatura + marcatura + affettatura
3 lavorazioni e 3 tag visualizzati: nichelatura, marcatura, affettatura

Invece, l'inserimento manuale di un componente tramite il tasto più, quindi sulla colonna Trattamenti, è anch'esso da gestire come tag.

7) QIP Nella pagina lavorazioni ora inseriamo una sezione con delle card corrispondenti alle lavorazioni in corso ovvero i componenti che sono ancora in stato non spedito. Per ogni card deve essere espresso innanzitutto in un formato ordinato pulito il codice e il nome della commessa e poi deve essere espresso il codice componente visualizzato il codice barre se ci sono trattamenti e lo stato attuale del componente

9) implementa ora la pagina di dettaglio commessa, raggiungibile cliccando sull'icona "dettaglio commessa" nella pagina delle commesse. Questa pagina dovrà mostrare tutte le informazioni relative alla commessa selezionata.


ispirati alla precedente versione della pagina delle commesse, ma adattala al nuovo data model e alle nuove API


import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Typography, 
  Button, 
  Table, 
  Form, 
  Input, 
  Select, 
  Modal, 
  Popconfirm, 
  Space, 
  Tag, 
  message as antdMessage,
  Tooltip,
  Spin,
  Collapse,
  Tree
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SaveOutlined, 
  CloseOutlined, 
  HistoryOutlined, 
  FileTextOutlined, 
  UploadOutlined, 
  DownloadOutlined, 
  LinkOutlined,
  FileOutlined,
  FolderOpenOutlined,
  DownOutlined,
  UpOutlined,
  HomeOutlined,
  FolderOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileZipOutlined,
  FileExclamationOutlined,
  NodeExpandOutlined,
  FileDoneOutlined,
  AppstoreOutlined,
  FolderAddOutlined,
  InboxOutlined,
  DollarOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import BarcodeWithText from './BarcodeWithText';
import StatoModal from './StatoModal';
import { api } from './api';

const DettaglioCommessa = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [commessa, setCommessa] = useState(null);
  const [components, setComponents] = useState([]);
  const [docList, setDocList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docLoading, setDocLoading] = useState(true);
  const [form] = Form.useForm();
  const [editingKey, setEditingKey] = useState('');
  const [statusList, setStatusList] = useState([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [expandedComponents, setExpandedComponents] = useState(new Set());
  const [expandedVersions, setExpandedVersions] = useState(new Set());
  const [adding, setAdding] = useState(false);
  const [statusModal, setStatusModal] = useState({ open: false, record: null, newStatus: '', note: '' });
  const [barcodeModal, setBarcodeModal] = useState({ open: false, value: '' });
  const [dropModal, setDropModal] = useState({ open: false, file: null, tipo: '', description: '', componentId: null });
  const [dragOverTipo, setDragOverTipo] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [dropPreview, setDropPreview] = useState(null);
  const [dragOverComponent, setDragOverComponent] = useState(null);
  const [uploadDestination, setUploadDestination] = useState('commessa');
  const [treeDragOver, setTreeDragOver] = useState(null);
  const [docNavigation, setDocNavigation] = useState({
    currentPath: ['home'],
    currentView: 'home',
    selectedComponent: null
  });
  
  const tableRef = useRef(null);

  const columnsDef = [
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    { title: 'Descrizione', dataIndex: 'description', key: 'description' },
    { title: 'Livello', dataIndex: 'level', key: 'level' },
    { title: 'Criticità', dataIndex: 'crit', key: 'crit' },
    { title: 'Tipo trattamento', dataIndex: 'treatmentType', key: 'treatmentType' },
    { title: 'Fase', dataIndex: 'phase', key: 'phase' },
    { title: 'Stato', dataIndex: 'status', key: 'status' },
    { title: 'Note', dataIndex: 'notes', key: 'notes' },
    { title: 'File', dataIndex: 'files', key: 'files' },
    { title: 'Azioni', dataIndex: 'actions', key: 'actions' }
  ];

  useEffect(() => {
    console.log('� DettaglioCommessa loading for ID:', id);
    console.log('🔄 DettaglioCommessa loading for ID:', id);
    
    // 🔒 VERIFICA TOKEN PRIMA DI FARE API CALLS
    // Previene le chiamate durante refresh prima che l'auth sia verificata
    const token = localStorage.getItem('authToken');
    const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
    
    if (!token || !isLoggedIn) {
      console.log('⚠️ DettaglioCommessa: No token/auth found, delaying API calls...');
      // Ritenta tra 100ms se non c'è token (durante refresh)
      const retryTimer = setTimeout(() => {
        const newToken = localStorage.getItem('authToken');
        const newIsLoggedIn = localStorage.getItem('loggedIn') === 'true';
        if (newToken && newIsLoggedIn) {
          console.log('✅ Token found on retry, proceeding with API calls');
          fetchData();
          fetchDocuments();
          fetchStatusList();
        } else {
          console.log('❌ Still no token, user will need to login');
        }
      }, 100);
      
      return () => clearTimeout(retryTimer);
    }
    
    // Token presente, procedi normalmente
    console.log('✅ Token found, proceeding with API calls');
    fetchData();
    fetchDocuments();
    fetchStatusList();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching commessa data...');
      
      const response = await api.get(`/api/commesse/${id}`);
      setCommessa(response.data);
      
      const componentsResponse = await api.get('/components');
      const commessaComponents = componentsResponse.data.filter(c => c.commessaId === id);
      
      // Per ogni componente, recupera i suoi documenti
      const componentsWithDocs = await Promise.all(
        commessaComponents.map(async (component) => {
          try {
            const docsResponse = await api.get(`/documenti?componentId=${component._id}`);
            return {
              ...component,
              files: docsResponse.data || []
            };
          } catch (error) {
            console.error(`Error fetching docs for component ${component._id}:`, error);
            return {
              ...component,
              files: []
            };
          }
        })
      );
      
      setComponents(componentsWithDocs);
      console.log('✅ Data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setDocLoading(true);
      const response = await api.get(`/documenti/${id}`);
      setDocList(response.data);
    } catch (error) {
      console.error('❌ Error loading documents:', error);
    } finally {
      setDocLoading(false);
    }
  };

  const fetchStatusList = async () => {
    try {
      const response = await api.get('/getstati');
      setStatusList(response.data);
    } catch (error) {
      console.error('❌ Error loading status list:', error);
    }
  };

  const getDocIcon = (tipo, nome) => {
    const extension = nome?.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return <FilePdfOutlined style={{ color: '#d32f2f' }} />;
      case 'doc': case 'docx': return <FileWordOutlined style={{ color: '#1976d2' }} />;
      case 'xls': case 'xlsx': return <FileExcelOutlined style={{ color: '#388e3c' }} />;
      case 'jpg': case 'jpeg': case 'png': case 'gif': return <FileImageOutlined style={{ color: '#f57c00' }} />;
      case 'zip': case 'rar': return <FileZipOutlined style={{ color: '#7b1fa2' }} />;
      default: return <FileOutlined style={{ color: '#666' }} />;
    }
  };

  const handleDropUpload = async (file, tipo, componentId = null) => {
    console.log('handleDropUpload called with:', file, tipo, componentId);
    console.log('ComponentId type:', typeof componentId, 'Value:', componentId);
    
    // Se non c'è tipo e non c'è componentId, è un documento generale della commessa
    if (!tipo && !componentId) {
      tipo = 'documento'; // Tipo predefinito per documenti generali
    }
    
    // Se ancora non c'è tipo, apri il modal (solo per componenti)
    if (!tipo) {
      setDropModal({ open: true, file, tipo: '', description: '', componentId });
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', tipo);
    formData.append('commessaId', id);
    formData.append('descrizione', dropModal.description || '');
    
    // Se è specificato un componentId, aggiungi anche quello
    if (componentId) {
      formData.append('componentId', componentId);
    }
    
    console.log('Sending request to /documenti with formData:', {
      fileName: file.name,
      tipo,
      commessaId: id,
      componentId,
      descrizione: dropModal.description || ''
    });
    
    try {
      // Usa l'API axios con interceptor per gestire automaticamente i token
      const response = await api.post('/documenti', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.status === 200 || response.status === 201);
      
      if (response.status === 200 || response.status === 201) {
        antdMessage.success('File caricato con successo');
        if (componentId) {
          // Ricarica i dati per aggiornare i documenti del componente
          fetchData();
        } else {
          fetchDocuments();
        }
        setDropModal({ open: false, file: null, tipo: '', description: '', componentId: null });
      } else {
        console.error('Error response:', response.data);
        antdMessage.error(`Errore durante il caricamento: ${response.status}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      antdMessage.error('Errore durante il caricamento: ' + error.message);
    }
  };

  const handleModalUpload = () => {
    console.log('handleModalUpload called');
    console.log('dropModal state:', dropModal);
    
    if (!dropModal.tipo) {
      antdMessage.error('Seleziona una tipologia');
      return;
    }
    handleDropUpload(dropModal.file, dropModal.tipo, dropModal.componentId);
  };

  const handleDownload = (docId) => {
    window.open(`/api/documenti/${docId}/download`, '_blank');
  };

  const handleDeleteDoc = async (docId) => {
    console.log('handleDeleteDoc called with docId:', docId);
    console.log('DocId type:', typeof docId);
    console.log('DocId length:', docId?.length);
    
    try {
      console.log('Sending DELETE request to:', `/documenti/${docId}`);
      
      // Usa l'API axios con interceptor
      const response = await api.delete(`/documenti/${docId}`);
      
      console.log('Delete response status:', response.status);
      
      if (response.status === 200) {
        antdMessage.success('Documento eliminato');
        fetchDocuments();
        // Ricarica anche i dati per aggiornare i componenti
        fetchData();
      } else {
        console.error('Delete error response:', response.data);
        antdMessage.error(`Errore durante l'eliminazione: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      antdMessage.error('Errore durante l\'eliminazione');
    }
  };

  const handleFileUpload = async (componentId, files) => {
    try {
      // Carica ogni file separatamente usando l'endpoint /documenti con API axios
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tipo', 'componente');
        formData.append('commessaId', id);
        formData.append('componentId', componentId);
        formData.append('descrizione', `File caricato per componente`);

        const response = await api.post('/documenti', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        if (response.status !== 200 && response.status !== 201) {
          console.error('Error response:', response.data);
          antdMessage.error(`Errore durante il caricamento di ${file.name}`);
          return;
        }
      }

      antdMessage.success('File caricati con successo');
      fetchData(); // Ricarica i dati per mostrare i nuovi documenti
    } catch (error) {
      console.error('Error uploading files:', error);
      antdMessage.error('Errore durante il caricamento');
    }
  };

  const handleDeleteFile = async (componentId, filename) => {
    try {
      // Usa l'API axios con interceptor
      const response = await api.delete(`/components/${componentId}/files/${filename}`);
      
      if (response.status === 200) {
        antdMessage.success('File eliminato');
        fetchData();
      } else {
        antdMessage.error('Errore durante l\'eliminazione');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      antdMessage.error('Errore durante l\'eliminazione');
    }
  };

  const isEditing = (record) => (record._id || record.key) === editingKey;
  
  const edit = (record) => {
    form.setFieldsValue({ ...record });
    setEditingKey(record._id || record.key);
  };

  const cancel = () => {
    setEditingKey('');
    if (adding) {
      setAdding(false);
      setComponents(prev => prev.filter(r => r.key !== 'new'));
    }
  };

  const save = async (key) => {
    try {
      const row = await form.validateFields();
      const newData = [...components];
      const index = newData.findIndex((item) => key === item.key);
      
      if (index > -1) {
        if (adding) {
          // Prepara i dati per il nuovo componente con valori di default
          const componentData = {
            ...row,
            commessaId: id,
            parentOrderCode: commessa?.code || '',
            parentOrderName: commessa?.name || '',
            status: '0 - creato', // Stato di default
            treatmentType: row.treatmentType || 'no', // Default se non specificato
            // Aggiungi note di creazione alla history
            statusChangeNote: 'Componente creato',
            statusChangedBy: 'Sistema'
          };
          
          console.log('🔍 DEBUG - Component data being sent:', componentData);
          
          // Usa l'API axios con interceptor
          const response = await api.post('/components', componentData);
          
          if (response.status === 200 || response.status === 201) {
            antdMessage.success('Componente aggiunto');
            fetchData();
            setAdding(false);
          } else {
            antdMessage.error('Errore durante l\'aggiunta');
          }
        } else {
          // Usa l'API axios con interceptor
          const response = await api.put(`/components/${newData[index]._id}`, row);
          
          if (response.status === 200) {
            antdMessage.success('Componente aggiornato');
            fetchData();
          } else {
            antdMessage.error('Errore durante l\'aggiornamento');
          }
        }
      }
      
      setEditingKey('');
    } catch (errInfo) {
      console.log('Validate Failed:', errInfo);
    }
  };

  const handleDelete = async (key) => {
    try {
      // Usa l'API axios con interceptor
      const response = await api.delete(`/components/${key}`);
      
      if (response.status === 200) {
        antdMessage.success('Componente eliminato');
        fetchData();
      } else {
        antdMessage.error('Errore durante l\'eliminazione');
      }
    } catch (error) {
      console.error('Error deleting component:', error);
      antdMessage.error('Errore durante l\'eliminazione');
    }
  };

  const handleStatusModalOk = async (note) => {
    try {
      // Usa l'API axios con interceptor
      const response = await api.put(`/components/${statusModal.record._id}`, { 
        status: statusModal.newStatus,
        note: note
      });
      
      if (response.status === 200) {
        antdMessage.success('Stato aggiornato');
        fetchData();
        setStatusModal({ open: false, record: null, newStatus: '', note: '' });
      } else {
        antdMessage.error('Errore durante l\'aggiornamento');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      antdMessage.error('Errore durante l\'aggiornamento');
    }
  };

  const toggleRowExpansion = (key) => {
    setExpandedRowKeys(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  // Componente UploadArea per il caricamento documenti
  const UploadArea = ({ tipo, onDrop, message, submessage, compact }) => {
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
      e.preventDefault();
      setDragOver(true);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      setDragOver(false);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setDragOver(false);
      const files = e.dataTransfer.files;
      if (files.length > 0 && onDrop) {
        onDrop(files[0], tipo);
      }
    };

    const handleClick = () => {
      fileInputRef.current?.click();
    };

    const handleFileSelect = (e) => {
      const file = e.target.files[0];
      if (file && onDrop) {
        onDrop(file, tipo);
      }
    };

    return (
      <div 
        style={{ 
          border: `2px dashed ${dragOver ? '#1890ff' : '#d9d9d9'}`, 
          borderRadius: 8,
          padding: compact ? 16 : 24,
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: dragOver ? '#f0f8ff' : '#fafafa',
          transition: 'all 0.3s ease'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <UploadOutlined style={{ fontSize: compact ? 20 : 24, color: '#1890ff', marginBottom: 8 }} />
        <div style={{ fontSize: compact ? 12 : 14, fontWeight: 500, marginBottom: 4 }}>
          {message || "Carica documento"}
        </div>
        <div style={{ fontSize: compact ? 10 : 12, color: '#666' }}>
          {submessage || "Trascina qui o clicca per selezionare"}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
        />
      </div>
    );
  };

  // Componente DocumentTree che gestisce la navigazione ad albero
  const DocumentTree = ({ commessa, components, docList, docLoading, handleDropUpload, handleDownload, handleDeleteDoc, handleFileUpload, dragOverTipo, setDragOverTipo, getDocIcon, treeDragOver, setTreeDragOver }) => {
    // Raggruppa i documenti per tipo
    const docsByType = {};
    if (Array.isArray(docList)) {
      docList.forEach(doc => {
        if (!docsByType[doc.tipo]) {
          docsByType[doc.tipo] = [];
        }
        docsByType[doc.tipo].push(doc);
      });
    }

    const getTypeIcon = (tipo) => {
      switch (tipo.toLowerCase()) {
        case 'preventivo': return <FileTextOutlined style={{ color: '#1890ff' }} />;
        case 'fattura': return <DollarOutlined style={{ color: '#52c41a' }} />;
        case 'disegno': return <FileImageOutlined style={{ color: '#faad14' }} />;
        case 'contratto': return <FileProtectOutlined style={{ color: '#722ed1' }} />;
        case 'specifiche': return <FileSearchOutlined style={{ color: '#13c2c2' }} />;
        default: return <FileOutlined style={{ color: '#8c8c8c' }} />;
      }
    };

    const treeData = [
      // Nodo principale "Commessa"
      {
        title: (
          <div 
            style={{ 
              fontWeight: 'bold', 
              fontSize: 14,
              padding: '8px 12px',
              borderRadius: 6,
              backgroundColor: treeDragOver === 'commessa' ? '#e6f7ff' : 'transparent',
              border: treeDragOver === 'commessa' ? '3px dashed #1890ff' : '3px dashed transparent',
              transition: 'all 0.3s ease',
              position: 'relative',
              minHeight: '40px',
              display: 'flex',
              alignItems: 'center'
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setTreeDragOver('commessa');
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setTreeDragOver(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setTreeDragOver(null);
              const files = e.dataTransfer.files;
              if (files.length > 0) {
                handleDropUpload(files[0], null, null);
              }
            }}
          >
            <FolderOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Documenti generali della Commessa
            {treeDragOver === 'commessa' && (
              <span style={{ 
                marginLeft: 12, 
                fontSize: 12, 
                color: '#1890ff',
                fontWeight: 'bold',
                background: '#fff',
                padding: '2px 6px',
                borderRadius: 4,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                📁 Rilascia qui per documenti generali sulla commessa
              </span>
            )}
          </div>
        ),
        key: 'commessa-root',
        children: Object.keys(docsByType).length > 0 ? 
          Object.keys(docsByType).map(tipo => ({
            title: (
              <span style={{ fontWeight: 500 }}>
                {getTypeIcon(tipo)}
                <span style={{ marginLeft: 8, textTransform: 'capitalize' }}>{tipo}</span>
                <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>({docsByType[tipo].length})</span>
              </span>
            ),
            key: `commessa-${tipo}`,
            children: docsByType[tipo].map(doc => ({
              title: (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {getDocIcon(doc.tipo, doc.nome)}
                    <div style={{ marginLeft: 8 }}>
                      <div style={{ fontWeight: 400 }}>{doc.nome}</div>
                      <div style={{ fontSize: 11, color: '#999' }}>
                        v{doc.versione} • {new Date(doc.uploadDate).toLocaleDateString()}
                        {doc.size && ` • ${(doc.size / 1024).toFixed(1)} KB`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button 
                      size="small" 
                      type="text" 
                      icon={<DownloadOutlined />} 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(doc._id);
                      }}
                    />
                    <Button 
                      size="small" 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />} 
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Delete button clicked');
                        console.log('Full doc object:', doc);
                        console.log('doc._id value:', doc._id);
                        console.log('doc._id type:', typeof doc._id);
                        console.log('doc._id constructor:', doc._id?.constructor?.name);
                        handleDeleteDoc(doc._id);
                      }}
                    />
                  </div>
                </div>
              ),
              key: `commessa-doc-${doc._id}`,
              isLeaf: true
            }))
          })) : [{
            title: (
              <span style={{ color: '#999', fontStyle: 'italic' }}>
                <InboxOutlined style={{ marginRight: 8 }} />
                Nessun documento presente - trascina qui per aggiungere
              </span>
            ),
            key: 'commessa-empty',
            isLeaf: true
          }]
      },
      // Nodo principale "Componenti"
      {
        title: (
          <div 
            style={{ 
              fontWeight: 'bold', 
              fontSize: 14,
              padding: '8px 12px',
              borderRadius: 6,
              backgroundColor: 'transparent',
              border: '3px dashed transparent',
              transition: 'all 0.3s ease',
              position: 'relative',
              minHeight: '40px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <NodeExpandOutlined style={{ marginRight: 8, color: '#52c41a' }} />
            Documenti specifici per Componente
          </div>
        ),
        key: 'componenti-root',
        children: components && components.length > 0 ? 
          components.map(component => {
            const componentFiles = component.files || [];
            const componentId = component._id;
            return {
              title: (
                <div 
                  style={{ 
                    fontWeight: 500,
                    padding: '8px 12px',
                    borderRadius: 6,
                    backgroundColor: treeDragOver === componentId ? '#f6ffed' : 'transparent',
                    border: treeDragOver === componentId ? '3px dashed #52c41a' : '3px dashed transparent',
                    transition: 'all 0.3s ease',
                    minHeight: '40px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setTreeDragOver(componentId);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setTreeDragOver(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setTreeDragOver(null);
                    const files = e.dataTransfer.files;
                    if (files.length > 0 && componentId) {
                      handleDropUpload(files[0], 'componente', componentId);
                    }
                  }}
                >
                  <AppstoreOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                  <span style={{ marginLeft: 8 }}>{component.name}</span>
                  <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>
                    ({componentFiles.length})
                  </span>
                  {treeDragOver === componentId && (
                    <span style={{ 
                      marginLeft: 12, 
                      fontSize: 12, 
                      color: '#52c41a',
                      fontWeight: 'bold',
                      background: '#fff',
                      padding: '2px 6px',
                      borderRadius: 4,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      ⚙️ Rilascia qui per componente {component.name}
                    </span>
                  )}
                </div>
              ),
              key: `component-${component.name}`,
              children: componentFiles.length > 0 ? componentFiles.map(doc => ({
                title: (
                  <div 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      width: '100%',
                      padding: '4px 8px',
                      borderRadius: 4,
                      backgroundColor: treeDragOver === componentId ? '#f6ffed' : 'transparent',
                      transition: 'all 0.3s ease'
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setTreeDragOver(componentId);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      // Solo se stiamo uscendo dall'elemento, non andando verso un figlio
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setTreeDragOver(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setTreeDragOver(null);
                      const files = e.dataTransfer.files;
                      if (files.length > 0 && componentId) {
                        handleDropUpload(files[0], 'componente', componentId);
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {getDocIcon(doc.tipo, doc.nome)}
                      <div style={{ marginLeft: 8 }}>
                        <div style={{ fontWeight: 400 }}>{doc.nome}</div>
                        <div style={{ fontSize: 11, color: '#999' }}>
                          v{doc.versione || '1'} • {new Date(doc.uploadDate || doc.createdAt).toLocaleDateString()}
                          {doc.size && ` • ${(doc.size / 1024).toFixed(1)} KB`}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button 
                        size="small" 
                        type="text" 
                        icon={<DownloadOutlined />} 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(doc._id);
                        }}
                      />
                      <Button 
                        size="small" 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Delete button clicked (component doc)');
                          console.log('Full component doc object:', doc);
                          console.log('doc._id value:', doc._id);
                          console.log('doc._id type:', typeof doc._id);
                          console.log('doc._id constructor:', doc._id?.constructor?.name);
                          handleDeleteDoc(doc._id);
                        }}
                      />
                    </div>
                  </div>
                ),
                key: `component-doc-${doc._id}`,
                isLeaf: true
              })) : [{
                title: (
                  <div 
                    style={{ 
                      color: '#999', 
                      fontStyle: 'italic',
                      padding: '8px 12px',
                      borderRadius: 4,
                      backgroundColor: treeDragOver === componentId ? '#f6ffed' : 'transparent',
                      border: treeDragOver === componentId ? '2px dashed #52c41a' : '2px dashed transparent',
                      transition: 'all 0.3s ease'
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setTreeDragOver(componentId);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setTreeDragOver(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setTreeDragOver(null);
                      const files = e.dataTransfer.files;
                      if (files.length > 0 && componentId) {
                        handleDropUpload(files[0], 'componente', componentId);
                      }
                    }}
                  >
                    <InboxOutlined style={{ marginRight: 8 }} />
                    Nessun documento presente - trascina qui per aggiungere
                  </div>
                ),
                key: `component-empty-${componentId}`,
                isLeaf: true
              }]
            };
          }) : [{
            title: (
              <span style={{ color: '#999', fontStyle: 'italic' }}>
                <InboxOutlined style={{ marginRight: 8 }} />
                Nessun documento presente - trascina qui per aggiungere
              </span>
            ),
            key: 'componenti-empty',
            isLeaf: true
          }]
      }
    ];

    return (
      <div style={{ padding: 0 }}>
        {docLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : (
          <div>
            {/* Albero documenti */}
            <Card 
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FolderOpenOutlined />
                  <span>Documenti</span>
                </div>
              }
              style={{ borderRadius: 8 }}
            >
              <Tree
                treeData={treeData}
                defaultExpandAll
                showLine={{ showLeafIcon: false }}
                switcherIcon={<DownOutlined />}
                style={{ fontSize: 13 }}
              />
            </Card>
          </div>
        )}
      </div>
    );
  };

  const columns = columnsDef.map((col, index) => {
    if (col.dataIndex === 'name') {
      return {
        ...col,
        render: (text, record) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{text}</div>
            {record.barcode && (
              <div style={{ cursor: 'pointer' }} onClick={() => setBarcodeModal({ open: true, value: record.barcode })}>
                <BarcodeWithText value={record.barcode} width={1.2} height={20} fontSize={8} />
              </div>
            )}
          </div>
        ),
        onCell: (record) => ({
          record,
          inputType: 'text',
          dataIndex: col.dataIndex,
          title: col.title,
          editing: isEditing(record),
        }),
      };
    }

    if (col.dataIndex === 'status') {
      return {
        ...col,
        render: (text, record) => (
          <Tag color={text === 'completed' ? 'green' : text === 'in-progress' ? 'blue' : 'orange'}>
            {text}
          </Tag>
        ),
        onCell: (record) => ({
          record,
          inputType: 'select',
          dataIndex: col.dataIndex,
          title: col.title,
          editing: isEditing(record),
        }),
      };
    }

    if (col.dataIndex === 'files') {
      return {
        ...col,
        render: (text, record) => {
          const fileCount = record.files?.length || 0;
          return (
            <Tooltip title={fileCount > 0 ? `${fileCount} file allegati` : 'Nessun file allegato'}>
              <Button
                size="small"
                icon={<UploadOutlined />}
                type={fileCount > 0 ? "primary" : "default"}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.onchange = (e) => {
                    const files = Array.from(e.target.files);
                    if (files.length > 0) {
                      handleFileUpload(record._id, files);
                    }
                  };
                  input.click();
                }}
              >
                {fileCount > 0 ? `${fileCount} file` : 'Carica'}
              </Button>
            </Tooltip>
          );
        }
      };
    }

    if (col.dataIndex === 'actions') {
      return {
        ...col,
        render: (text, record) => {
          const editable = isEditing(record);
          return (
            <Space size={4}>
              {editable ? (
                <>
                  <Tooltip title="Salva">
                    <Button icon={<SaveOutlined />} type="primary" shape="circle" size="small" onClick={() => save(record._id)} />
                  </Tooltip>
                  <Tooltip title="Annulla">
                    <Button icon={<CloseOutlined />} shape="circle" size="small" onClick={cancel} />
                  </Tooltip>
                </>
              ) : (
                <>
                  <Tooltip title="Modifica">
                    <Button icon={<EditOutlined />} shape="circle" size="small" onClick={() => edit(record)} />
                  </Tooltip>
                  {record.history && record.history.length > 0 && (
                    <Tooltip title="Storico stato">
                      <Button 
                        icon={<HistoryOutlined />} 
                        shape="circle" 
                        size="small" 
                        type={expandedRowKeys.includes(record._id) ? "primary" : "default"}
                        onClick={() => toggleRowExpansion(record._id)}
                      />
                    </Tooltip>
                  )}
                  <Popconfirm title="Eliminare il componente?" onConfirm={() => handleDelete(record._id)} okText="Sì" cancelText="No">
                    <Tooltip title="Elimina">
                      <Button icon={<DeleteOutlined />} danger shape="circle" size="small" />
                    </Tooltip>
                  </Popconfirm>
                </>
              )}
            </Space>
          );
        }
      };
    }

    return {
      ...col,
      onCell: (record) => ({
        record,
        inputType: 'text',
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  const expandedRowRender = (record) => (
    <div style={{ background: '#f9f9f9', padding: 12, borderRadius: 8 }}>
      <Typography.Text strong>Storico cambi stato</Typography.Text>
      <Table
        size="small"
        pagination={false}
        columns={[
          { title: 'Da', dataIndex: 'from', key: 'from' },
          { title: 'A', dataIndex: 'to', key: 'to' },
          { title: 'Data', dataIndex: 'date', key: 'date', render: d => d ? new Date(d).toLocaleString() : '' },
          { title: 'Note', dataIndex: 'note', key: 'note' },
          { title: 'Utenza', dataIndex: 'user', key: 'user' },
        ]}
        dataSource={(record.history || []).map((h, i) => ({ ...h, key: i }))}
      />
    </div>
  );

  const EditableCell = ({ editing, dataIndex, title, inputType, record, children, ...restProps }) => {
    if (editing && dataIndex === 'status') {
      return (
        <td {...restProps}>
          <Form.Item name="status" style={{ margin: 0 }} rules={[{ required: true, message: 'Campo obbligatorio' }]} initialValue={record.status}>
            <Select
              style={{ minWidth: 120 }}
              onChange={newStatus => {
                // Se stiamo aggiungendo un nuovo componente, preimposta la nota
                const defaultNote = adding ? 'Componente creato' : '';
                setStatusModal({ open: true, record, newStatus, note: defaultNote });
                form.setFieldsValue({ ...form.getFieldsValue(), status: newStatus });
              }}
            >
              {statusList.map(st => (
                <Select.Option key={st.label} value={st.label}>{st.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </td>
      );
    }
    return (
      <td {...restProps}>
        {editing ? (
          <Form.Item
            name={dataIndex}
            style={{ margin: 0 }}
            initialValue={record[dataIndex]}
            rules={[{ required: dataIndex === 'name', message: `Campo obbligatorio` }]}
          >
            <Input type={inputType} />
          </Form.Item>
        ) : children}
      </td>
    );
  };

  const rowClassName = record => (highlightId && record._id === highlightId ? 'highlight-row' : '');

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        style={{ marginBottom: 16 }}
        onClick={() => navigate(-1)}
      >
        Indietro
      </Button>
      <Typography.Title level={2}>Dettaglio Commessa</Typography.Title>
      <Spin spinning={loading}>
        {commessa && (
          <div style={{ maxWidth: 600, marginBottom: 32 }}>
            <Card
              bodyStyle={{ background: '#f6f8fa', borderRadius: 12, padding: 20, border: '1px solid #e6e6e6' }}
              style={{ boxShadow: '0 2px 12px #0001', marginBottom: 0 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div><b>Codice commessa:</b> {commessa.code}</div>
                <div><b>Nome commessa:</b> {commessa.name}</div>
                <div><b>Note:</b> {commessa.note || '-'}</div>
              </div>
            </Card>
          </div>
        )}
        <Button type="primary" style={{ marginBottom: 16 }} onClick={() => {
          setAdding(true);
          setEditingKey('new');
          const emptyRow = { 
            key: 'new', 
            ...columnsDef.reduce((acc, c) => ({ ...acc, [c.dataIndex]: '' }), {})
          };
          setComponents(prev => [emptyRow, ...prev.filter(r => r.key !== 'new')]);
          form.setFieldsValue(emptyRow);
        }}>Nuovo componente</Button>
        <Form form={form} component={false}>
          <div ref={tableRef} style={{ overflowX: 'auto', width: '100%' }}>
            {typeof window !== 'undefined' && window.innerWidth < 700 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {components.map(comp => (
                  <div 
                    key={comp._id || comp.key} 
                    style={{ 
                      background: '#fff', 
                      borderRadius: 12, 
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)', 
                      padding: 16, 
                      border: '1px solid #f0f0f0',
                      ...(highlightId && comp._id === highlightId ? {
                        border: '2px solid #1677ff',
                        boxShadow: '0 4px 16px rgba(22,119,255,0.2)'
                      } : {})
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 }}>
                          {comp.name}
                        </div>
                        {comp.barcode && (
                          <div style={{ marginBottom: 4 }}>
                            <span style={{ cursor: 'pointer', display: 'inline-block' }} onClick={() => setBarcodeModal({ open: true, value: comp.barcode })}>
                              <BarcodeWithText value={comp.barcode} width={1.6} height={38} fontSize={13} />
                            </span>
                          </div>
                        )}
                        <div style={{ 
                          fontSize: 14, 
                          padding: '4px 8px', 
                          borderRadius: 6,
                          background: '#f5f7fa',
                          color: '#1677ff',
                          fontWeight: 'bold',
                          display: 'inline-block'
                        }}>
                          {comp.status}
                        </div>
                      </div>
                    </div>
                    {comp.description && (
                      <div style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
                        {comp.description}
                      </div>
                    )}
                    {comp.notes && (
                      <div style={{ fontSize: 14, color: '#888', fontStyle: 'italic', marginTop: 8 }}>
                        💬 {comp.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Table
                components={{ body: { cell: EditableCell } }}
                bordered
                dataSource={components}
                columns={columns}
                rowKey={record => record._id || record.key}
                pagination={false}
                rowClassName={rowClassName}
                size="small"
                expandable={{
                  expandedRowRender,
                  expandedRowKeys,
                  onExpandedRowsChange: setExpandedRowKeys,
                  rowExpandable: record => record.history && record.history.length > 0,
                  expandIcon: () => null,
                }}
                scroll={{ x: 900 }}
              />
            )}
          </div>
        </Form>
        <StatoModal
          open={statusModal.open}
          record={statusModal.record}
          newStatus={statusModal.newStatus}
          onCancel={() => setStatusModal({ open: false, record: null, newStatus: '', note: '' })}
          onOk={note => {
            setStatusModal(sm => ({ ...sm, note, open: false }));
            handleStatusModalOk(note);
          }}
        />
      </Spin>
      
      <DocumentTree 
        commessa={commessa}
        components={components}
        docList={docList}
        docLoading={docLoading}
        handleDropUpload={handleDropUpload}
        handleDownload={handleDownload}
        handleDeleteDoc={handleDeleteDoc}
        handleFileUpload={handleFileUpload}
        dragOverTipo={dragOverTipo}
        setDragOverTipo={setDragOverTipo}
        getDocIcon={getDocIcon}
        treeDragOver={treeDragOver}
        setTreeDragOver={setTreeDragOver}
      />

      <Modal
        open={barcodeModal.open}
        onCancel={() => setBarcodeModal({ open: false, value: '' })}
        footer={null}
        centered
        width={window.innerWidth < 700 ? '98vw' : 'auto'}
        styles={{
          body: {
            textAlign: 'center', 
            padding: '20px 10px',
            overflowX: 'auto',
            maxWidth: '100%'
          }
        }}
        style={{ borderRadius: 16, overflow: 'hidden' }}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Typography.Title level={4} style={{ marginBottom: 20 }}>Barcode</Typography.Title>
          <div style={{ 
            width: '100%', 
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 100,
            padding: '10px 0'
          }}>
            <BarcodeWithText 
              value={barcodeModal.value} 
              width={window.innerWidth < 700 ? 2.5 : 3.5} 
              height={window.innerWidth < 700 ? 80 : 100} 
              fontSize={window.innerWidth < 700 ? 16 : 18} 
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={dropModal.open}
        onCancel={() => setDropModal({ open: false, file: null, tipo: '', description: '', componentId: null })}
        title="Seleziona tipologia documento"
        footer={[
          <Button key="cancel" onClick={() => setDropModal({ open: false, file: null, tipo: '', description: '', componentId: null })}>
            Annulla
          </Button>,
          <Button key="upload" type="primary" onClick={handleModalUpload}>
            Carica
          </Button>
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <p>File selezionato: <strong>{dropModal.file?.name}</strong></p>
          <Form layout="vertical">
            <Form.Item label="Tipologia">
              <Select
                placeholder="Seleziona tipologia"
                value={dropModal.tipo}
                onChange={(value) => setDropModal(prev => ({ ...prev, tipo: value }))}
              >
                <Select.Option value="progetto">Progetto</Select.Option>
                <Select.Option value="documentazione">Documentazione</Select.Option>
                <Select.Option value="specifica">Specifica</Select.Option>
                <Select.Option value="manuale">Manuale</Select.Option>
                <Select.Option value="altro">Altro</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="Descrizione (opzionale)">
              <Input
                placeholder="Inserisci descrizione"
                value={dropModal.description}
                onChange={(e) => setDropModal(prev => ({ ...prev, description: e.target.value }))}
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </div>
  );
};

export default DettaglioCommessa;

