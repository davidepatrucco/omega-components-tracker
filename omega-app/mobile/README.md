# Omega Mobile App

Applicazione mobile minimale per la scansione di barcode e gestione componenti Omega.

## Caratteristiche

- **Login**: Utilizza le stesse credenziali del backend Omega
- **Scansione Barcode**: Supporto per Code128
- **Ricerca Componenti**: Recupero dettagli dal backend
- **Cambio Stato Automatico**: Da stati 1/2/2-ext a "3 - Costruito"
- **Cross-platform**: iOS e Android

## Tecnologie

- **React Native** con **Expo** per sviluppo cross-platform
- **@ant-design/react-native** per UI consistency con web app
- **expo-barcode-scanner** per scansione Code128
- **axios** per API calls
- **expo-secure-store** per storage sicuro del token
- **expo-application** per recupero device ID

## Setup e Installazione

### Prerequisiti

1. Node.js 18+
2. Expo CLI: `npm install -g @expo/cli`
3. Backend Omega in esecuzione

### Installazione

```bash
# Vai nella directory mobile
cd omega-app/mobile

# Installa le dipendenze
npm install

# Avvia l'app in modalità development
npm start

# Per testare su specifiche piattaforme
npm run android  # Android
npm run ios      # iOS
```

### Configurazione

L'app utilizza `http://localhost:4000` come endpoint di default per il backend.
Per ambiente di produzione, modificare il `baseURL` in `src/services/api.js`.

## Struttura App

```
src/
├── screens/
│   ├── LoginScreen.js          # Schermata di login
│   ├── ScannerScreen.js        # Schermata scanner barcode
│   └── ComponentDetailScreen.js # Dettaglio componente e azioni
├── services/
│   ├── api.js                  # Logica API e autenticazione
│   └── statusConfig.js         # Configurazione stati (da ../shared)
└── components/                 # Componenti riutilizzabili
```

## Flusso Principale

1. **Login**: Inserimento credenziali → Storage sicuro del token
2. **Scanner**: Apertura camera → Scansione Code128 → Ricerca componente
3. **Dettaglio**: Visualizzazione info → Cambio stato (se applicabile)
4. **Logout**: Pulizia token e ritorno al login

## API Utilizzate

- `POST /auth/login` - Autenticazione
- `POST /auth/logout` - Logout
- `GET /components?barcode=<code>` - Ricerca per barcode
- `POST /changestatus` - Cambio stato componente

## Note Tecniche

- **Centralizzazione**: Riutilizza configurazione stati da `../shared/statusConfig.js`
- **Sicurezza**: Token JWT memorizzati in Expo SecureStore
- **Device ID**: Utilizzato per note di tracciamento
- **Permessi**: Richiede accesso camera per barcode scanning
- **UI**: Design coerente con web app tramite Ant Design

## Test

L'app è stata progettata per funzionare con il backend esistente senza modifiche aggiuntive oltre al supporto per ricerca barcode.