/**
 * Utilities per la gestione degli stati nel frontend
 * Importa la configurazione centralizzata
 */

import { 
  getStatusLabel as getLabel,
  parseTreatmentStatus,
  buildAllowedStatuses,
  getSuggestedNextStatuses,
  getStatusOrder,
  BASE_STATUSES,
  TREATMENT_PHASES
} from '../config/statusConfig.js';

// Re-export delle funzioni principali per il frontend
export {
  getLabel as getStatusLabel,
  parseTreatmentStatus,
  buildAllowedStatuses,
  getSuggestedNextStatuses,
  getStatusOrder,
  BASE_STATUSES,
  TREATMENT_PHASES
};

/**
 * Ottiene il colore appropriato per uno stato (per UI)
 * Palette aggiornata (2026-02-21): colori distintivi per migliore visibilità
 */
export function getStatusColor(status) {
  const parsed = parseTreatmentStatus(status);
  
  // Colori per stati base - Palette distintiva e armonica
  const baseColors = {
    '1': '#7c8088',        // Nuovo - grigio-blu scuro
    '2': '#1890ff',        // Produzione Interna - blu brillante
    '2-ext': '#722ed1',    // Produzione Esterna - viola reale
    '3': '#52c41a',        // Costruito - verde fresco
    '5': '#faad14',        // Pronto consegna - arancione/gold
    '6': '#f5222d'         // Spedito - rosso acceso
  };
  
  if (baseColors[status]) {
    return baseColors[status];
  }
  
  // Colori per stati di trattamento - Palette distintiva
  if (parsed) {
    const treatmentColors = {
      [TREATMENT_PHASES.PREP]: '#ffc069',  // Preparazione - arancione chiaro
      [TREATMENT_PHASES.IN]: '#eb2f96',    // In trattamento - rosa/magenta
      [TREATMENT_PHASES.ARR]: '#13c2c2'    // Arrivato - ciano/turchese
    };
    return treatmentColors[parsed.phase] || '#d9d9d9';
  }
  
  return '#d9d9d9'; // default grigio
}

/**
 * Ottiene l'icona appropriata per uno stato
 */
export function getStatusIcon(status) {
  const parsed = parseTreatmentStatus(status);
  
  // Icone per stati base  
  const baseIcons = {
    '1': 'PlusOutlined',
    '2': 'ToolOutlined', 
    '2-ext': 'ApiOutlined',
    '3': 'CheckCircleOutlined',
    '5': 'GiftOutlined',
    '6': 'RocketOutlined'
  };
  
  if (baseIcons[status]) {
    return baseIcons[status];
  }
  
  // Icone per stati di trattamento
  if (parsed) {
    const treatmentIcons = {
      [TREATMENT_PHASES.PREP]: 'ClockCircleOutlined',
      [TREATMENT_PHASES.IN]: 'SyncOutlined', 
      [TREATMENT_PHASES.ARR]: 'CheckOutlined'
    };
    return treatmentIcons[parsed.phase] || 'SettingOutlined';
  }
  
  return 'QuestionOutlined'; // default
}

/**
 * Formatta uno stato per la visualizzazione con colore e icona
 */
export function formatStatusDisplay(status) {
  return {
    label: getLabel(status),
    color: getStatusColor(status),
    icon: getStatusIcon(status),
    order: getStatusOrder(status),
    parsed: parseTreatmentStatus(status)
  };
}

/**
 * Raggruppa gli stati per categoria (per dropdown organizzate)
 */
export function groupStatusesForDisplay(statuses) {
  const base = [];
  const treatments = {};
  
  statuses.forEach(status => {
    const parsed = parseTreatmentStatus(status);
    if (parsed) {
      if (!treatments[parsed.treatmentName]) {
        treatments[parsed.treatmentName] = [];
      }
      treatments[parsed.treatmentName].push(formatStatusDisplay(status));
    } else {
      base.push(formatStatusDisplay(status));
    }
  });
  
  // Ordina gli stati base
  base.sort((a, b) => a.order - b.order);
  
  // Ordina gli stati di trattamento per ogni trattamento
  Object.keys(treatments).forEach(treatmentName => {
    treatments[treatmentName].sort((a, b) => a.order - b.order);
  });
  
  return { base, treatments };
}

/**
 * Genera i filtri per la tabella (dinamicamente da statusConfig)
 * Usato in Lavorazioni.jsx e DettaglioCommessa.jsx per evitare hardcoding
 */
export function generateTableStatusFilters() {
  const baseStatuses = [
    { value: '1', label: getLabel('1') },
    { value: '2', label: getLabel('2') },
    { value: '2-ext', label: getLabel('2-ext') },
    { value: '3', label: getLabel('3') },
    { value: 'PREP', label: `4a - ${TREATMENT_LABELS.PREP}` },
    { value: 'IN', label: `4b - ${TREATMENT_LABELS.IN}` },
    { value: 'ARR', label: `4c - ${TREATMENT_LABELS.ARR}` },
    { value: '5', label: getLabel('5') },
    { value: '6', label: getLabel('6') }
  ];
  
  // Converte al formato Ant Design { text, value }
  return baseStatuses.map(({ value, label }) => ({
    text: label,
    value: value
  }));
}
