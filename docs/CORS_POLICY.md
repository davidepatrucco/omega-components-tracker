CORS Policy & examples

Scopo
- Definire una policy CORS coerente per frontend (Vite/Prod) e backend (Express/nginx).
- Supportare refresh token via cookie httpOnly quando frontend e backend possono essere in domini diversi.

Principi generali
- Allowed origins: strettamente le origini di frontend note (`https://app.example.com`, `https://staging.app.example.com`) o `http://localhost:5173` in dev.
- Allowed headers: `Content-Type`, `Authorization`, `X-Requested-With`, `Accept`, `Origin`, `Cookie`.
- Expose headers: `Content-Disposition` (per download), eventuali custom headers.
- Credentials: abilitare `Access-Control-Allow-Credentials: true` se si usa refresh token via cookie httpOnly.
- Methods: `GET, POST, PUT, DELETE, OPTIONS`.
- Preflight cache: `Access-Control-Max-Age` a 600s per ridurre preflight frequency.

Express (consigliato middleware cors)

Install:

```bash
npm i cors
```

Example (server.js):

```js
const express = require('express');
const cors = require('cors');

const app = express();
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_ORIGIN_DEV,
  process.env.FRONTEND_ORIGIN_STAGE,
  process.env.FRONTEND_ORIGIN_PROD
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cookie'],
  exposedHeaders: ['Content-Disposition']
}));

// ... your routes
```

Notes:
- `credentials: true` is required if you rely on refresh token in httpOnly cookie. The frontend must call fetch/axios with `withCredentials: true` for cookie to be sent.
- For Vite dev using proxy, you can avoid CORS by proxying requests to the backend (recommended for local dev).

Nginx reverse proxy example

```
# snippet: enable CORS for /api
location /api/ {
  if ($request_method = 'OPTIONS') {
    add_header 'Access-Control-Allow-Origin' "$http_origin";
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE';
    add_header 'Access-Control-Allow-Headers' 'Authorization,Content-Type,Accept,Origin,Cookie';
    add_header 'Access-Control-Allow-Credentials' 'true';
    add_header 'Access-Control-Max-Age' 600;
    add_header 'Content-Length' 0;
    add_header 'Content-Type' 'text/plain charset=UTF-8';
    return 204;
  }
  proxy_pass http://backend_upstream;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  add_header 'Access-Control-Allow-Origin' "$http_origin";
  add_header 'Access-Control-Allow-Credentials' 'true';
}
```

Security considerations
- Never set `Access-Control-Allow-Origin: *` when `credentials: true`.
- Limit allowed origins and rotate secret values if an origin changes.
- Validate `Origin` server-side (example above) rather than echoing untrusted values.

Dev vs Prod
- Dev: use Vite proxy to avoid CORS complexity locally.
- Prod: configure Nginx or the backend to return correct CORS headers and enable credentials only for trusted origins.

Append to `strategia_ci.md`
- Add env vars: `FRONTEND_ORIGIN_STAGE`, `FRONTEND_ORIGIN_PROD` to your GitHub Environments and use them in the server config.
