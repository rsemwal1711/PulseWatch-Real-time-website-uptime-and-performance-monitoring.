# PulseWatch backend

## Run locally

Use Node.js 18 or newer. From the `Backend` directory, start the API:

```powershell
npm start
```

In a second terminal, start the frontend from the `Frontend` directory with `npm run dev`. Vite proxies `/api` requests to `http://127.0.0.1:3001`.

The API stores monitors and check history in `Backend/data/monitors.json`. A newly created monitor is checked immediately; subsequent checks run at its configured interval, and the UI refreshes status every five seconds.

The Analytics and Incidents pages use the same recorded monitor checks as the dashboard. Analytics can summarize the last 24 hours, 7 days, or 30 days; incidents begin at the first failed check and resolve at the next successful check. These are check-detection times, not the exact start or end of an outage. Check history is capped at 5,000 entries per monitor, so longer analytics ranges may have incomplete history.

The service binds to localhost by default. It only permits HTTP(S) targets with public DNS/IP addresses and revalidates redirects. Before exposing this service to a network, add authentication and request-abuse controls.
