# Omega Mobile App – Specifiche e Considerazioni

## Obiettivo
Realizzare una **mobile app minimale** (iOS + Android) che permetta:
- Login con le stesse credenziali del backend Omega.
- Scansione di barcode **Code128**.
- Recupero dettaglio componente dal backend.
- Se lo stato del componente è `1`, `2` o `2-ext`, chiamare l’endpoint di cambio stato per portarlo a **“3 - Costruito”**, aggiungendo nota `barcode scannato via mobile <deviceId> - <data>`.
- Logout.

## Stack Tecnologico
- **Framework**: React Native con Expo (cross-platform, rapido setup).
- **Librerie**:
  - `expo-barcode-scanner` → scansione Code128.
  - `axios` → API calls.
  - `@react-navigation/native` → gestione navigazione.
  - `expo-secure-store` → storage sicuro del token.
  - `expo-application` → recupero deviceId.

## Flussi Principali
### Login
- `POST /auth/login` con {username, password}.
- Salvataggio `accessToken` in SecureStore.
- Navigazione a schermata di scansione.

### Scansione Barcode
- Apertura camera.
- Scan Code128.
- `GET /components?barcode=<code>`.
- Se stato ∈ {1, 2, 2-ext} → `POST /changestatus` con:
  ```json
  {
    "componentId": "...",
    "to": "3",
    "note": "barcode scannato via mobile <deviceId> - <ISOdate>"
  }

  Logout
	•	POST /auth/logout (se previsto).
	•	Rimozione token da SecureStore.

Architettura Applicativa
	•	UI Layer → React Native (screens Login, Scan, Settings).
	•	Service Layer → API client (axios) con interceptor per Authorization.
	•	Storage Layer → SecureStore per token, AsyncStorage opzionale per cache locale.

Sicurezza
	•	HTTPS obbligatorio per tutti gli ambienti.
	•	Token JWT salvato solo in SecureStore (mai in AsyncStorage).
	•	Logout → wipe token.
	•	DeviceId usato solo per audit (non PII sensibile).
	•	Gestione 401: riloggare o implementare refresh token (se backend supporta).
	•	Possibile attivare certificate pinning con librerie RN per prevenire MITM.

Ambienti
	•	Local/test → punta a backend locale (via LAN o ngrok).
	•	Staging → backend su dominio staging (es. staging.api.omega.intellitude.com).
	•	Produzione → backend su dominio production (api.omega.intellitude.com).

Gestione tramite variabili di ambiente Expo:
{
  "expo": {
    "extra": {
      "API_URL": {
        "local": "http://192.168.1.xxx:4000",
        "staging": "https://staging.api.omega.intellitude.com",
        "production": "https://api.omega.intellitude.com"
      }
    }
  }
}

Selezione ambiente via process.env.APP_ENV (local, staging, production).

Distribuzione
	•	Test locale: Expo Go.
	•	Staging: build con EAS (Expo Application Services) → distribuzione via TestFlight (iOS) e Internal Testing (Google Play).
	•	Produzione: release store.

Logging e Monitoraggio
	•	Log errori → Sentry (integrazione con React Native).
	•	Monitoraggio crash su TestFlight / Play Console.

Checklist
	•	Implementare login/logout.
	•	Implementare scanner Code128.
	•	Endpoint dettaglio componente.
	•	Endpoint cambio stato.
	•	Config multipli ambienti.
	•	Sicurezza: HTTPS, token in SecureStore.
	•	Distribuzione su TestFlight/Play Beta.
	•	Monitoring con Sentry.
