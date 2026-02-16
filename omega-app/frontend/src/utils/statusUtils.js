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
 */
export function getStatusColor(status) {
  const parsed = parseTreatmentStatus(status);
  
  // Colori per stati base
  const baseColors = {
    '1': '#d9d9d9',        // Nuovo - grigio
    '2': '#1890ff',        // Produzione Interna - blu  
    '2-ext': '#722ed1',    // Produzione Esterna - viola
    '3': '#52c41a',        // Costruito - verde
    '5': '#13c2c2',        // Pronto consegna - ciano
    '6': '#389e0d'         // Spedito - verde scuro
  };
  
  if (baseColors[status]) {
    return baseColors[status];
  }
  
  // Colori per stati di trattamento
  if (parsed) {
    const treatmentColors = {
      [TREATMENT_PHASES.PREP]: '#faad14',  // Preparazione - arancione/gold
      [TREATMENT_PHASES.IN]: '#eb2f96',    // In trattamento - magenta
      [TREATMENT_PHASES.ARR]: '#fa541c'    // Arrivato - volcano/rosso-arancio
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
