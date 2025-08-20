## API - Specifiche principali

Questa specifica copre le API di autenticazione e gli endpoint principali previsti per il PoC.

### Autenticazione

POST /auth/login
- Request JSON: { "username": "...", "password": "..." }
- Response: 200
  - Body: { "accessToken": "<jwt>", "user": { "username": "...", "profilo": "..." } }
  - Cookie (Set-Cookie): refreshToken (httpOnly)

POST /auth/refresh
- Usa il cookie httpOnly `refreshToken` per ottenere un nuovo access token.
- Response: 200 { "accessToken": "<jwt>" }

POST /auth/logout
- Invalida il refresh token (rotazione/blacklist). Cancella cookie.
- Response: 204 No Content

POST /auth/register
- (opzionale/protetto) crea un nuovo utente.
- Request: { username, password, email, profilo }

### Contratto Token
- Access token: JWT breve (es. 15m), usato in Authorization: Bearer <token>
- Refresh token: JWT o random string a lunga scadenza (7d) inviato in cookie httpOnly, Secure, SameSite=Lax

### Errori comuni
- 400 Bad Request: payload mancante/invalid
- 401 Unauthorized: credenziali errate o token scaduto
- 403 Forbidden: risorse protette per profilo

Note: questo documento è un sommario per il PoC; dettagli (claim JWT, rotazione refresh tokens e revoca) sono implementati in codice.
