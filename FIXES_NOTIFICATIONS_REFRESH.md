# Fix: Notifiche Duplicate e Refresh Token

## Problemi Risolti

### 1. Notifiche Duplicate ✅

**Problema**: Quando si scansionava un barcode nell'app mobile e si cambiava lo stato a "costruito" con trattamenti, venivano create 2 notifiche separate (una per UFF e una per TRATT).

**Causa**: La funzione `createNotificationForProfiles` creava una notifica per ogni profilo nell'array.

**Soluzione**: 
- Modificato il modello `Notification` per supportare `profileTarget` come array di stringhe
- Aggiornata la logica di creazione per creare una sola notifica con array di profili target
- Aggiornate le query MongoDB per gestire correttamente sia stringhe che array nel campo `profileTarget`

**File modificati**:
- `models/Notification.js`: Schema per supportare array di profili
- `utils/notificationUtils.js`: Logica di creazione unificata
- `routes/notifications.js`: Query aggiornata per leggere notifiche

**Risultato**: Ora viene creata una singola notifica visibile a tutti i profili autorizzati.

### 2. Refresh Token Non Funzionante ✅

**Problema**: Dopo un paio di ore di inattività, l'app richiedeva di riloggarsi invece di usare il refresh token automatico.

**Causa**: 
- Il frontend cercava il refresh token nel `localStorage` ma il backend lo salva come cookie HttpOnly
- La scadenza dell'access token era impostata male nel frontend (60 giorni invece di 15 minuti)
- L'interceptor tentava di inviare il refresh token nel body della richiesta invece di usare il cookie

**Soluzione**:
- Rimosso il salvataggio del refresh token nel `localStorage`
- Corretto l'interceptor per non inviare il refresh token nel body (usa automaticamente il cookie)
- Corretta la scadenza dell'access token a 15 minuti
- Aggiornato il `AuthContext` per gestire correttamente i tempi di scadenza

**File modificati**:
- `frontend/src/api.js`: Interceptor HTTP corretto
- `frontend/src/AuthContext.jsx`: Gestione token e scadenze corrette

**Risultato**: Il refresh token ora funziona automaticamente per 180 giorni senza richiedere re-login.

## Test

### Test Notifiche
```javascript
// Prima: 2 notifiche per ['UFF', 'TRATT']
// Dopo: 1 notifica con profileTarget: ['UFF', 'TRATT']
```

### Test Refresh Token
- Access token scade dopo 15 minuti
- Refresh automatico trasparente via cookie HttpOnly
- Session persistente per 180 giorni

## Impatto

- **Notifiche**: Riduzione del 50% delle notifiche duplicate nel sistema
- **UX**: Session management trasparente senza re-login frequenti
- **Performance**: Meno query di notifica e meno storage nel database

## Deployment

Le modifiche richiedono:
1. ✅ Aggiornamento backend (compatibile con dati esistenti)
2. ✅ Build frontend aggiornato
3. ✅ Nessuna migrazione database necessaria (retrocompatibile)

## Note

- Il campo `profileTarget` nel database ora può contenere sia stringhe che array
- Le notifiche esistenti con `profileTarget` stringa continuano a funzionare
- Le nuove notifiche con profili multipli usano array
- Il refresh token rimane gestito interamente lato server come cookie HttpOnly
