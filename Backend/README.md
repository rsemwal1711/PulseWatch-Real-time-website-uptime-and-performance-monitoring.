# PulseWatch backend

## Run locally

Use Node.js 18 or newer. From the `Backend` directory, start the API:

```powershell
npm start
```

In a second terminal, start the frontend from the `Frontend` directory with `npm run dev`. Vite proxies `/api` requests to `http://127.0.0.1:3001`.

The API stores monitors and check history in `Backend/data/monitors.json`. A newly created monitor is checked immediately; subsequent checks run at its configured interval, and the UI refreshes status every five seconds.

The service binds to localhost by default. It only permits HTTP(S) targets with public DNS/IP addresses and revalidates redirects. Before exposing this service to a network, add authentication and request-abuse controls.
