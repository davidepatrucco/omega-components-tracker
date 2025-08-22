/**
 * Configurazione centralizzata degli stati del sistema Omega
 * Basata su specifications/instructions.md
 */

// Stati base del sistema
const BASE_STATUSES = {
  NUOVO: '1',
  PRODUZIONE_INTERNA: '2',
  PRODUZIONE_ESTERNA: '2-ext',
  COSTRUITO: '3',
  IN_TRATTAMENTO: '4',
  PRONTO_CONSEGNA: '5',
  SPEDITO: '6'
};

// Suffissi per i sotto-stati di trattamento
const TREATMENT_PHASES = {
  PREP: 'PREP',    // in preparazione
  IN: 'IN',        // in trattamento
  ARR: 'ARR'       // arrivato da trattamento
};

// Etichette per gli stati base
const STATUS_LABELS = {
  '1': '1 - Nuovo',
  '2': '2 - Produzione Interna',
  '2-ext': '2 - Produzione Esterna',
  '3': '3 - Costruito',
  '4': '4 - In trattamento',
  '5': '5 - Pronto per consegna',
  '6': '6 - Spedito'
};

// Template per etichette di trattamento
const TREATMENT_LABELS = {
  PREP: 'In preparazione',
  IN: 'In trattamento', 
  ARR: 'Arrivato da'
};

/**
 * Genera lo stato di trattamento nel formato 4:<NOME>:<FASE>
 */
function createTreatmentStatus(treatmentName, phase) {
  return `4:${treatmentName}:${phase}`;
}

/**
 * Parsa uno stato di trattamento per estrarre componenti
 */
function parseTreatmentStatus(status) {
  if (!status || !status.startsWith('4:')) {
    return null;
  }
  
  const parts = status.split(':');
  if (parts.length !== 3) {
    return null;
  }
  
  return {
    type: 'treatment',
    treatmentName: parts[1],
    phase: parts[2],
    isPrep: parts[2] === TREATMENT_PHASES.PREP,
    isIn: parts[2] === TREATMENT_PHASES.IN,
    isArr: parts[2] === TREATMENT_PHASES.ARR
  };
}

/**
 * Ottiene l'etichetta leggibile per uno stato
 */
function getStatusLabel(status) {
  // Stati base
  if (STATUS_LABELS[status]) {
    return STATUS_LABELS[status];
  }
  
  // Stati di trattamento
  const parsed = parseTreatmentStatus(status);
  if (parsed) {
    const phaseLabel = TREATMENT_LABELS[parsed.phase];
    return `4 - ${phaseLabel} ${parsed.treatmentName}`;
  }
  
  return status; // fallback
}

/**
 * Genera tutti gli stati consentiti per un componente
 * secondo le regole in instructions.md
 */
function buildAllowedStatuses(component) {
  const trattamenti = component.trattamenti || [];
  
  // Stati globali sempre disponibili
  const globalStatuses = [
    BASE_STATUSES.NUOVO,
    BASE_STATUSES.PRODUZIONE_INTERNA,
    BASE_STATUSES.PRODUZIONE_ESTERNA,
    BASE_STATUSES.COSTRUITO,
    BASE_STATUSES.PRONTO_CONSEGNA,
    BASE_STATUSES.SPEDITO
  ];
  
  // Stati di trattamento per ogni trattamento definito
  const treatmentStatuses = trattamenti.flatMap(trattamento => [
    createTreatmentStatus(trattamento, TREATMENT_PHASES.PREP),
    createTreatmentStatus(trattamento, TREATMENT_PHASES.IN),
    createTreatmentStatus(trattamento, TREATMENT_PHASES.ARR)
  ]);
  
  return [...globalStatuses, ...treatmentStatuses];
}

/**
 * Verifica se tutti i trattamenti sono in stato ARR
 */
function areAllTreatmentsCompleted(component) {
  const trattamenti = component.trattamenti || [];
  if (trattamenti.length === 0) return false;
  
  const history = component.history || [];
  
  return trattamenti.every(trattamento => {
    const arrStatus = createTreatmentStatus(trattamento, TREATMENT_PHASES.ARR);
    return history.some(entry => entry.to === arrStatus);
  });
}

/**
 * Applica la transizione automatica a "Pronto per consegna" se tutti i trattamenti sono ARR
 */
function maybeAutoTransitionToReady(component) {
  if (areAllTreatmentsCompleted(component) && component.status !== BASE_STATUSES.PRONTO_CONSEGNA) {
    return {
      shouldTransition: true,
      newStatus: BASE_STATUSES.PRONTO_CONSEGNA,
      historyEntry: {
        from: component.status,
        to: BASE_STATUSES.PRONTO_CONSEGNA,
        date: new Date(),
        note: 'Transizione automatica: tutti i trattamenti completati',
        user: 'system'
      }
    };
  }
  
  return { shouldTransition: false };
}

/**
 * Ottiene l'ordine di priorità per ordinare gli stati nelle UI
 */
function getStatusOrder(status) {
  // Ordine per stati base
  const baseOrder = {
    '1': 1,
    '2': 2,
    '2-ext': 3,
    '3': 4,
    '5': 98,
    '6': 99
  };
  
  if (baseOrder[status] !== undefined) {
    return baseOrder[status];
  }
  
  // Ordine per stati di trattamento (tra 4 e 5)
  const parsed = parseTreatmentStatus(status);
  if (parsed) {
    const phaseOrder = {
      [TREATMENT_PHASES.PREP]: 10,
      [TREATMENT_PHASES.IN]: 20,
      [TREATMENT_PHASES.ARR]: 30
    };
    
    // Base 50 + ordine fase + hash del nome trattamento per consistenza
    const nameHash = parsed.treatmentName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 10;
    return 50 + phaseOrder[parsed.phase] + nameHash;
  }
  
  return 999; // fallback per stati sconosciuti
}

/**
 * Filtra gli stati suggeriti per la UI (solo "prossimi passi logici")
 */
function getSuggestedNextStatuses(currentStatus, component) {
  const allAllowed = buildAllowedStatuses(component);
  const current = getStatusOrder(currentStatus);
  
  // Suggerisce solo stati con ordine maggiore del corrente
  return allAllowed
    .filter(status => getStatusOrder(status) > current)
    .sort((a, b) => getStatusOrder(a) - getStatusOrder(b))
    .slice(0, 5); // Massimo 5 suggerimenti
}

// Export all functions and constants
module.exports = {
  BASE_STATUSES,
  TREATMENT_PHASES,
  STATUS_LABELS,
  TREATMENT_LABELS,
  createTreatmentStatus,
  parseTreatmentStatus,
  getStatusLabel,
  buildAllowedStatuses,
  areAllTreatmentsCompleted,
  maybeAutoTransitionToReady,
  getStatusOrder,
  getSuggestedNextStatuses
};
