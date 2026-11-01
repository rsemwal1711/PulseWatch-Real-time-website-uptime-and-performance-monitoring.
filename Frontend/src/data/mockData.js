export const monitors = [
  { id: 'example-com', name: 'example.com', url: 'https://example.com', status: 'Operational', response: 142, uptime: '99.99%', checked: '2m ago' },
  { id: 'api-example-com', name: 'api.example.com', url: 'https://api.example.com', status: 'Operational', response: 187, uptime: '99.98%', checked: '2m ago' },
  { id: 'store-example-com', name: 'store.example.com', url: 'https://store.example.com', status: 'Down', response: null, uptime: '99.95%', checked: '5m ago' },
  { id: 'blog-example-com', name: 'blog.example.com', url: 'https://blog.example.com', status: 'Operational', response: 231, uptime: '99.97%', checked: '2m ago' },
  { id: 'status-example-com', name: 'status.example.com', url: 'https://status.example.com', status: 'Degraded', response: 624, uptime: '99.91%', checked: '1m ago' },
  { id: 'cdn-example-com', name: 'cdn.example.com', url: 'https://cdn.example.com', status: 'Operational', response: 96, uptime: '100%', checked: '3m ago' },
  { id: 'docs-example-com', name: 'docs.example.com', url: 'https://docs.example.com', status: 'Operational', response: 128, uptime: '99.99%', checked: '2m ago' },
  { id: 'app-example-com', name: 'app.example.com', url: 'https://app.example.com', status: 'Operational', response: 173, uptime: '99.98%', checked: '2m ago' },
];

export const incidents = [
  { id: 'INC-2048', website: 'store.example.com', status: 'Ongoing', started: 'Oct 31, 2026 · 10:42 AM', resolved: '—', duration: '18 min', detail: 'Connection timed out after 10 seconds.' },
  { id: 'INC-2047', website: 'api.example.com', status: 'Resolved', started: 'Oct 30, 2026 · 4:18 PM', resolved: 'Oct 30, 2026 · 4:31 PM', duration: '13 min', detail: 'Elevated response times above 500 ms.' },
  { id: 'INC-2046', website: 'blog.example.com', status: 'Resolved', started: 'Oct 29, 2026 · 9:06 AM', resolved: 'Oct 29, 2026 · 9:10 AM', duration: '4 min', detail: 'Received an unexpected HTTP 503 response.' },
  { id: 'INC-2045', website: 'example.com', status: 'Resolved', started: 'Oct 27, 2026 · 1:52 PM', resolved: 'Oct 27, 2026 · 2:03 PM', duration: '11 min', detail: 'DNS lookup failed in the US-East region.' },
];

const curve = [34, 41, 37, 52, 45, 59, 54, 68, 61, 72, 66, 83, 74, 79, 69, 87, 77, 91, 82, 96, 86, 92, 81, 99];
export const uptimeSeries = curve.map((value, index) => ({
  time: `${String(index).padStart(2, '0')}:00`,
  uptime: 99.5 + value / 200,
  response: 145 + value * 1.2 + (index % 4) * 18,
  checks: 180 + value,
}));

export const recentActivity = [
  { status: 'Operational', message: 'api.example.com is back online', time: '2m ago' },
  { status: 'Down', message: 'store.example.com is down', time: '5m ago' },
  { status: 'Operational', message: 'blog.example.com is healthy', time: '12m ago' },
  { status: 'Degraded', message: 'status.example.com is responding slowly', time: '18m ago' },
];
