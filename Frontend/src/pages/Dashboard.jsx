import { ArrowUpRight, CircleAlert, Clock3, Globe2, Monitor, Plus, Server, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { Card, CardHeading, PageHeading, StatusBadge } from '../components/UI.jsx';
import { useMonitors } from '../api/monitors.jsx';

function Metric({ label, value, note, icon: Icon, tone }) {
  return (
    <Card className="metric-card">
      <div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={16} /></span></div>
      <div className="metric-value">{value}</div>
      <div className="metric-note">{note}</div>
    </Card>
  );
}

function ChartTooltip({ active, payload, label, unit = 'ms' }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><span>{label}</span><strong>{payload[0].value}{unit}</strong></div>;
}

function UptimeChart({ data, uptime }) {
  return (
    <Card className="chart-card">
      <CardHeading title="Uptime overview" detail="Availability across recent checks" action={<span className="chart-period">Recent</span>} />
      <div className="chart-legend"><span><i className="legend-green" />Uptime</span><strong>{uptime} <small>current</small></strong></div>
      <div className="chart-area">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 3, left: -25, bottom: 0 }}>
            <defs><linearGradient id="uptimeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#31d58a" stopOpacity={0.22} /><stop offset="96%" stopColor="#31d58a" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="#202321" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: '#686d69', fontSize: 10 }} tickLine={false} axisLine={false} interval={5} />
            <YAxis domain={[99, 100]} tick={{ fill: '#686d69', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
            <Tooltip content={<ChartTooltip unit="%" />} />
            <Area type="monotone" dataKey="uptime" stroke="#38d992" strokeWidth={2} fill="url(#uptimeFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function ResponseChart({ data, average }) {
  return (
    <Card className="chart-card response-chart">
      <CardHeading title="Response time" detail="Latest automated check results" action={<span className="chart-period">Recent</span>} />
      <div className="chart-legend"><span><i className="legend-violet" />Response time</span><strong>{average} <small>ms average</small></strong></div>
      <div className="chart-area">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 3, left: -20, bottom: 0 }}>
            <defs><linearGradient id="responseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a68bfa" stopOpacity={0.18} /><stop offset="100%" stopColor="#a68bfa" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="#202321" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: '#686d69', fontSize: 10 }} tickLine={false} axisLine={false} interval={5} />
            <YAxis tick={{ fill: '#686d69', fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="response" stroke="#a68bfa" strokeWidth={2} fill="url(#responseFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { monitors } = useMonitors();
  const downCount = monitors.filter((monitor) => monitor.status === 'Down').length;
  const operationalCount = monitors.filter((monitor) => monitor.status === 'Operational').length;
  const responses = monitors.map((monitor) => monitor.response).filter((value) => value !== null);
  const averageResponse = responses.length ? Math.round(responses.reduce((total, value) => total + value, 0) / responses.length) : null;
  const allChecks = monitors.flatMap((monitor) => monitor.checks.map((check) => ({ monitor, check })))
    .sort((left, right) => Date.parse(left.check.checkedAt) - Date.parse(right.check.checkedAt))
    .slice(-24);
  let successfulChecks = 0;
  const chartData = allChecks.map(({ monitor, check }, index) => {
    if (!check.error && monitor.expectedStatuses.includes(check.statusCode)) successfulChecks += 1;
    return {
      time: new Date(check.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      uptime: (successfulChecks / (index + 1)) * 100,
      response: check.responseMs,
    };
  });
  const aggregateUptime = allChecks.length ? `${((successfulChecks / allChecks.length) * 100).toFixed(2)}%` : '—';
  const recentChecks = monitors
    .filter((monitor) => monitor.checks.length)
    .map((monitor) => ({ monitor, check: monitor.checks[0] }))
    .sort((left, right) => Date.parse(right.check.checkedAt) - Date.parse(left.check.checkedAt))
    .slice(0, 4);
  const dateLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: '2-digit', year: 'numeric' }).format(new Date()).toUpperCase();
  const ago = (timestamp) => {
    const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(timestamp)) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`;
  };
  return (
    <div className="page-stack">
      <PageHeading eyebrow={dateLabel} title="Good morning, John" description="Here’s your monitoring overview." actions={<div className={`system-pill ${downCount ? 'system-issue' : ''}`}><span className="status-dot" />{downCount ? `${downCount} monitor needs attention` : 'All systems operational'}</div>} />
      <div className="metrics-grid">
        <Metric label="Total monitors" value={monitors.length} note="Configured endpoints" icon={Monitor} tone="tone-neutral" />
        <Metric label="Operational" value={operationalCount} note={`${monitors.length ? Math.round(operationalCount / monitors.length * 100) : 0}% of monitors`} icon={Globe2} tone="tone-green" />
        <Metric label="Websites down" value={downCount} note={downCount ? 'Needs your attention' : 'No failing monitors'} icon={CircleAlert} tone="tone-red" />
        <Metric label="Avg. response time" value={averageResponse === null ? '—' : `${averageResponse} ms`} note="Latest successful responses" icon={Clock3} tone="tone-violet" />
      </div>
      <div className="charts-grid"><UptimeChart data={chartData} uptime={aggregateUptime} /><ResponseChart data={chartData} average={averageResponse ?? '—'} /></div>
      <div className="dashboard-lower">
        <Card className="activity-card">
          <CardHeading title="Recent activity" detail="The latest from your monitors" action={<button className="text-button">View all <ArrowUpRight size={13} /></button>} />
          <div className="activity-list">
            {recentChecks.map(({ monitor, check }) => { const status = check.error || !monitor.expectedStatuses.includes(check.statusCode) ? 'Down' : check.responseMs >= 1000 ? 'Degraded' : 'Operational'; return <div className="activity-item" key={`${monitor.id}-${check.checkedAt}`}><span className={`activity-indicator ${status.toLowerCase()}`}><span /></span><span className="activity-message">{monitor.name} is {status.toLowerCase()}<small>{check.error || `HTTP ${check.statusCode} · ${check.responseMs} ms`}</small></span><time>{ago(check.checkedAt)}</time></div>; })}
            {!recentChecks.length && <div className="table-empty">Your live check activity will appear here.</div>}
          </div>
        </Card>
        <Card className="status-card">
          <CardHeading title="Website status" detail="Your monitored endpoints" action={<Link to="/monitors" className="text-button">All monitors <ArrowUpRight size={13} /></Link>} />
          <div className="website-list">
            {monitors.slice(0, 4).map((monitor) => <Link className="website-row" to={`/monitors/${monitor.id}`} key={monitor.id}><span className={`website-favicon ${monitor.status === 'Down' ? 'favicon-red' : ''}`}>{monitor.name.slice(0, 1)}</span><span className="website-name">{monitor.name}<small>{monitor.url}</small></span><StatusBadge status={monitor.status} /></Link>)}
            {!monitors.length && <div className="table-empty">Add your first website monitor.</div>}
          </div>
          <Link className="add-quick-link" to="/monitors/new"><Plus size={14} /> Add a monitor</Link>
        </Card>
      </div>
      <div className="dashboard-note"><Server size={13} /> Checks run on each monitor’s schedule <span>·</span> Status refreshes every 5 seconds <TrendingUp size={13} /></div>
    </div>
  );
}
