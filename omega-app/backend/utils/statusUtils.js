/**
 * Utilities per la gestione degli stati nel backend
 * Importa la configurazione centralizzata
 */

const {
  getStatusLabel,
  parseTreatmentStatus,
  buildAllowedStatuses,
  areAllTreatmentsCompleted,
  maybeAutoTransitionToReady,
  getStatusOrder,
  BASE_STATUSES,
  TREATMENT_PHASES,
  createTreatmentStatus
} = require('../shared/statusConfig.js');

const { createStatusChangeNotification } = require('./notificationUtils');

/**
 * Middleware per applicare automaticamente la transizione a "Pronto per consegna"
 * Deve essere chiamato dopo ogni aggiornamento di stato
 */
async function applyAutoTransition(component, saveCallback) {
  const transition = maybeAutoTransitionToReady(component);
  
  if (transition.shouldTransition) {
    // Aggiorna lo stato e la cronologia
    component.status = transition.newStatus;
    
    if (!component.history) {
      component.history = [];
    }
    
    component.history.push(transition.historyEntry);
    
    // Salva il componente se è stata fornita una callback
    if (typeof saveCallback === 'function') {
      await saveCallback(component);
    }
    
    console.log(`Auto-transition applied: Component ${component._id} moved to status ${transition.newStatus}`);
    return true;
  }
  
  return false;
}

/**
 * Valida una transizione di stato
 */
function validateStatusTransition(fromStatus, toStatus, component) {
  const allowedStatuses = buildAllowedStatuses(component);
  
  if (!allowedStatuses.includes(toStatus)) {
    return {
      valid: false,
      error: `Stato ${toStatus} non consentito per questo componente`
    };
  }
  
  // Validazioni aggiuntive possono essere aggiunte qui
  // Ad esempio: verificare i permessi utente, prerequisiti, etc.
  
  return { valid: true };
}

/**
 * Popola gli allowedStatuses di un componente
 */
function populateAllowedStatuses(component) {
  component.allowedStatuses = buildAllowedStatuses(component);
  return component;
}

/**
 * Crea un entry per la cronologia
 */
function createHistoryEntry(fromStatus, toStatus, user = '', note = '', ddtInfo = null) {
  const entry = {
    from: fromStatus,
    to: toStatus,
    date: new Date(),
    user: user,
    note: note
  };
  
  // Aggiungi info DDT se fornite (per stati ARR e SPEDITO)
  if (ddtInfo && (toStatus.includes(':ARR') || toStatus === BASE_STATUSES.SPEDITO)) {
    entry.ddt = {
      number: ddtInfo.number || '',
      date: ddtInfo.date || new Date()
    };
  }
  
  return entry;
}

/**
 * Helper per determinare se uno stato richiede DDT
 */
function requiresDDT(status) {
  return status.includes(':ARR') || status === BASE_STATUSES.SPEDITO;
}

/**
 * Processa un cambio di stato completo con validazioni e auto-transizioni
 */
async function processStatusChange(component, newStatus, user = '', note = '', ddtInfo = null, saveCallback = null) {
  // Valida la transizione
  const validation = validateStatusTransition(component.status, newStatus, component);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  // Crea entry cronologia
  const historyEntry = createHistoryEntry(component.status, newStatus, user, note, ddtInfo);
  
  // Aggiorna il componente
  const oldStatus = component.status;
  component.status = newStatus;
  
  if (!component.history) {
    component.history = [];
  }
  component.history.push(historyEntry);
  
  // Ricalcola allowedStatuses
  populateAllowedStatuses(component);
  
  // Salva se è stata fornita una callback
  if (typeof saveCallback === 'function') {
    await saveCallback(component);
    // Applica auto-transizione solo se salviamo
    await applyAutoTransition(component, saveCallback);
  } else {
    // Se non salviamo, applica solo l'auto-transizione al componente in memoria
    const transition = maybeAutoTransitionToReady(component);
    if (transition.shouldTransition) {
      component.status = transition.newStatus;
      if (!component.history) {
        component.history = [];
      }
      component.history.push(transition.historyEntry);
      populateAllowedStatuses(component);
    }
  }

  // Create notifications for specific status changes
  try {
    await createStatusChangeNotification(component, oldStatus, component.status, user);
  } catch (notificationError) {
    // Log the error but don't fail the status change
    console.error('Failed to create status change notification:', notificationError);
  }
  
  return {
    success: true,
    oldStatus,
    newStatus: component.status, // Potrebbe essere cambiato dall'auto-transizione
    historyEntry,
    autoTransitioned: component.status !== newStatus
  };
}

/**
 * Inizializza gli stati di default se il database è vuoto
 */
function getDefaultWorkStatuses() {
  return [
    { code: '1', label: '1 - Nuovo', order: 1, active: true, profili: [], note: '' },
    { code: '2', label: '2 - Produzione Interna', order: 2, active: true, profili: [], note: '' },
    { code: '2-ext', label: '2 - Produzione Esterna', order: 3, active: true, profili: [], note: '' },
    { code: '3', label: '3 - Costruito', order: 4, active: true, profili: [], note: '' },
    { code: '5', label: '5 - Pronto per consegna', order: 98, active: true, profili: [], note: '' },
    { code: '6', label: '6 - Spedito', order: 99, active: true, profili: [], note: '' }
  ];
}

module.exports = {
  // Re-export dalla configurazione condivisa
  getStatusLabel,
  parseTreatmentStatus,
  buildAllowedStatuses,
  areAllTreatmentsCompleted,
  maybeAutoTransitionToReady,
  getStatusOrder,
  BASE_STATUSES,
  TREATMENT_PHASES,
  createTreatmentStatus,
  
  // Utilities specifiche del backend
  applyAutoTransition,
  validateStatusTransition,
  populateAllowedStatuses,
  createHistoryEntry,
  requiresDDT,
  processStatusChange,
  getDefaultWorkStatuses
};
