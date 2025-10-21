const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const xlsx = require('xlsx');
const Commessa = require('../models/Commessa');
const Component = require('../models/Component');
const { requireAuth } = require('../middleware/auth');

// Configure multer for file uploads
const upload = multer({ dest: './upload' });

// GET /commesse - list all
router.get('/', requireAuth, async (req, res) => {
  try {
    const commesse = await Commessa.find({}).sort({ createdAt: -1 });
    res.json(commesse);
  } catch (err) {
    res.status(500).json({ error: 'error fetching commesse' });
  }
});

// GET /commesse/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'invalid id' });
    }
    
    const c = await Commessa.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'commessa not found' });
    res.json(c);
  } catch (err) {
    return res.status(400).json({ error: 'invalid id' });
  }
});

// POST /commesse - create
router.post('/', requireAuth, async (req, res) => {
  const { code, name, note, deliveryDate } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'code and name required' });
  
  const commessaData = { 
    code, 
    name, 
    notes: note || '' 
  };
  
  // Aggiungi deliveryDate se fornita
  if (deliveryDate) {
    commessaData.deliveryDate = new Date(deliveryDate);
  }
  
  try {
    const c = await Commessa.create(commessaData);
    res.status(201).json(c);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'code already exists' });
    res.status(500).json({ error: 'error creating commessa' });
  }
});

// PUT /commesse/:id - update
router.put('/:id', requireAuth, async (req, res) => {
  const { code, name, note, deliveryDate } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'code and name required' });
  
  const updateData = { 
    code, 
    name, 
    notes: note || '' 
  };
  
  // Gestisci deliveryDate: se è null o undefined, rimuovi il campo
  if (deliveryDate === null || deliveryDate === '') {
    updateData.deliveryDate = null;
  } else if (deliveryDate) {
    updateData.deliveryDate = new Date(deliveryDate);
  }
  
  try {
    const c = await Commessa.findByIdAndUpdate(
      req.params.id, 
      updateData,
      { new: true, runValidators: true }
    );
    if (!c) return res.status(404).json({ error: 'commessa not found' });
    res.json(c);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'code already exists' });
    res.status(500).json({ error: 'error updating commessa' });
  }
});

// DELETE /commesse/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const c = await Commessa.findByIdAndDelete(req.params.id);
    if (!c) return res.status(404).json({ error: 'commessa not found' });
    res.json({ message: 'commessa deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'error deleting commessa' });
  }
});

// POST /commesse/import-excel - import from Excel file
router.post('/import-excel', requireAuth, upload.single('excel'), async (req, res) => {
  console.log('--- INIZIO IMPORT-EXCEL ---');
  console.log('Ricevuta richiesta import-excel commesse');
  console.log('req.file:', req.file);
  console.log('req.body:', req.body);
  
  if (!req.file) {
    console.log('File mancante');
    return res.status(400).json({ error: 'File mancante' });
  }
  
  const { code, name, note, deliveryDate } = req.body;
  console.log('Dati form:', { code, name, note, deliveryDate });
  
  if (!code || !name) {
    console.log('Codice o nome commessa mancante');
    return res.status(400).json({ error: 'Codice e nome commessa obbligatori' });
  }
  
  try {
    // Leggi il file Excel
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    console.log('SheetName:', sheetName);
    
    // Leggi i dati come JSON
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    console.log('Righe lette da Excel:', data.length);
    
    // Validazione header: controlla che abbia la struttura corretta
    const expectedHeaders = ['comm.', 'Level', 'Crit.', 'Componente', 'Descrizione', 'Bom_Text', 'Qty_U', 'Utà', 'Qty_T', 'Utà', 'Trattamento'];
    const headerRow = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 })[0] || [];
    console.log('Header rilevato:', headerRow);
    
    let validHeader = false;
    if (headerRow.length === expectedHeaders.length && expectedHeaders.every((h, i) => headerRow[i] === h)) {
      validHeader = true;
    } else if (headerRow.length === expectedHeaders.length + 1 && expectedHeaders.every((h, i) => headerRow[i] === h) && headerRow[headerRow.length - 1] === 'Barcode') {
      validHeader = true;
    }
    
    console.log('ValidHeader:', validHeader);
    if (!validHeader) {
      console.log('Header Excel non valido o non in ordine:', headerRow);
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        error: 'Header Excel non valido o non in ordine', 
        expectedHeaders: [...expectedHeaders, '[Barcode opzionale]'], 
        actualHeaders: headerRow 
      });
    }
    
    // Indici dei campi obbligatori
    const idxComm = 0, idxLevel = 1, idxCrit = 2, idxComp = 3, idxDesc = 4, idxBom = 5, 
          idxQtyU = 6, idxUtaU = 7, idxQtyT = 8, idxUtaT = 9, idxTrattamento = 10,
          idxBarcode = headerRow.length === 12 ? 11 : null;
    
    // Validazione righe componenti PRIMA di creare la commessa
    const errors = [];
    let rowNum = 2;
    const rowsArr = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }).slice(1);
    
    for (const rowArr of rowsArr) {
      // Salta righe completamente vuote
      if (!rowArr || rowArr.length === 0 || rowArr.every(cell => cell === undefined || cell === null || cell === '')) {
        rowNum++;
        continue;
      }
      
      const missing = [];
      if (rowArr[idxLevel] === undefined || rowArr[idxLevel] === null || rowArr[idxLevel] === '') missing.push('Level');
      if (rowArr[idxCrit] === undefined || rowArr[idxCrit] === null || rowArr[idxCrit] === '') missing.push('Crit.');
      if (rowArr[idxComp] === undefined || rowArr[idxComp] === null || rowArr[idxComp] === '') missing.push('Componente');
      if (rowArr[idxDesc] === undefined || rowArr[idxDesc] === null || rowArr[idxDesc] === '') missing.push('Descrizione');
      if (rowArr[idxBom] === undefined || rowArr[idxBom] === null || rowArr[idxBom] === '') missing.push('Bom_Text');
      if (rowArr[idxQtyU] === undefined || rowArr[idxQtyU] === null || rowArr[idxQtyU] === '') missing.push('Qty_U');
      if (rowArr[idxUtaU] === undefined || rowArr[idxUtaU] === null || rowArr[idxUtaU] === '') missing.push('Utà (Qty_U)');
      if (rowArr[idxQtyT] === undefined || rowArr[idxQtyT] === null || rowArr[idxQtyT] === '') missing.push('Qty_T');
      if (rowArr[idxUtaT] === undefined || rowArr[idxUtaT] === null || rowArr[idxUtaT] === '') missing.push('Utà (Qty_T)');
      if (rowArr[idxTrattamento] === undefined || rowArr[idxTrattamento] === null || rowArr[idxTrattamento] === '') missing.push('Trattamento');
      if (rowArr[idxQtyU] !== undefined && rowArr[idxQtyU] !== null && rowArr[idxQtyU] !== '' && isNaN(Number(rowArr[idxQtyU]))) missing.push('Qty_U (non numerico)');
      if (rowArr[idxQtyT] !== undefined && rowArr[idxQtyT] !== null && rowArr[idxQtyT] !== '' && isNaN(Number(rowArr[idxQtyT]))) missing.push('Qty_T (non numerico)');
      
      if (missing.length > 0) {
        console.log('Riga', rowNum, 'errori:', missing, 'VALORI:', rowArr);
        errors.push({ row: rowNum, missing, values: rowArr });
      }
      rowNum++;
    }
    
    if (errors.length > 0) {
      console.log('Errori di validazione:', errors);
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Errori di validazione', details: errors });
    }
    
    // Controlla unicità e crea la commessa
    const exists = await Commessa.findOne({ code });
    if (exists) {
      console.log('Commessa già esistente con code:', code);
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Codice commessa già esistente' });
    }
    
    // CREA LA COMMESSA
    const commessaData = { 
      code: code.trim(), 
      name: name.trim(), 
      notes: note?.trim() || 'Imported from Excel' 
    };
    
    // Aggiungi deliveryDate se fornita
    if (deliveryDate) {
      commessaData.deliveryDate = new Date(deliveryDate);
    }
    
    const commessa = new Commessa(commessaData);
    await commessa.save();
    console.log('Commessa creata:', commessa._id);
    
    // Inserimento componenti
    const imported = [];
    rowNum = 2;
    
    for (const rowArr of rowsArr) {
      // Salta righe completamente vuote
      if (!rowArr || rowArr.length === 0 || rowArr.every(cell => cell === undefined || cell === null || cell === '')) {
        rowNum++;
        continue;
      }
      
      // Elabora il campo trattamento per estrarre i trattamenti individuali
      const trattamentoField = rowArr[idxTrattamento];
      let trattamenti = [];
      
      if (trattamentoField && typeof trattamentoField === 'string') {
        // Parse trattamenti separati da + o , o ;
        trattamenti = trattamentoField
          .split(/[+,;]/) // Split su +, virgola o punto e virgola
          .map(t => t.trim()) // Rimuove spazi bianchi
          .filter(t => t && t.length > 0) // Rimuove elementi vuoti
          .map(t => t.toLowerCase()); // Normalizza in lowercase
          
        console.log(`🔧 Parsed treatments for component "${rowArr[idxComp]}":`, {
          original: trattamentoField,
          parsed: trattamenti
        });
      }
      
      const componente = new Component({
        commessaId: commessa._id,
        commessaCode: code.trim(),
        commessaName: name.trim(),
        commessaNotes: note?.trim() || 'Imported from Excel',
        commessaCreatedAt: commessa.createdAt,
        componentNotes: rowArr[idxDesc] || '', // Descrizione dal campo "Descrizione" dell'Excel
        level: rowArr[idxLevel],
        crit: rowArr[idxCrit],
        bom_text: rowArr[idxBom],
        oda_text: '', // Non presente nell'Excel ma nel modello
        qty_u: Number(rowArr[idxQtyU]),
        uta_u: rowArr[idxUtaU],
        qty_t: Number(rowArr[idxQtyT]),
        uta_t: rowArr[idxUtaT],
        trattamenti: trattamenti,
        descrizioneComponente: rowArr[idxComp], // Nome del componente dalla colonna "Componente"
        barcode: idxBarcode !== null ? rowArr[idxBarcode] || undefined : undefined,
        status: '1', // '1' = Nuovo secondo la logica
        allowedStatuses: [], // Verrà calcolato automaticamente dal metodo
        verificato: false,
        cancellato: false
      });
      
      // Calcola gli stati consentiti
      componente.allowedStatuses = componente.buildAllowedStatuses();
      
      await componente.save();
      imported.push(componente);
      rowNum++;
    }
    
    // Pulisci il file caricato
    fs.unlinkSync(req.file.path);
    
    console.log('Importazione completata. Componenti importati:', imported.length);
    res.status(201).json({ 
      message: 'Commessa e componenti importati con successo', 
      commessa: commessa,
      imported: imported.length 
    });
    
  } catch (err) {
    console.error('Import error:', err);
    // Pulisci il file in caso di errore
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Errore durante importazione Excel', details: err.message });
  }
});

module.exports = router;
