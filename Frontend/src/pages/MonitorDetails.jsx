import { Activity, ArrowLeft, Check, Clock3, Ellipsis, ExternalLink, Globe2, Pencil, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button, Card, CardHeading, Field, Modal, PageHeading, StatusBadge, useToast } from '../components/UI.jsx';
import { useMonitors } from '../api/monitors.jsx';

export default function MonitorDetails() {
  const { monitorId } = useParams();
  const toast = useToast();
  const { monitors, loading, error, updateMonitor } = useMonitors();
  const [editing, setEditing] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const monitor = monitors.find((item) => item.id === monitorId);
  if (!monitor) {
    return <div className="page-stack"><PageHeading title={loading ? 'Loading monitor…' : 'Monitor not found'} description={error || 'This monitor may have been removed.'} /><Link to="/monitors" className="back-link"><ArrowLeft size={14} /> Back to monitors</Link></div>;
  }
  const responseSeries = [...monitor.checks].reverse()
    .filter((check) => check.responseMs !== null)
    .map((check) => ({
      time: new Date(check.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      response: check.responseMs,
    }));
  const history = [...monitor.checks].reverse().slice(-30);
  const statusOf = (check) => check.error || !monitor.expectedStatuses.includes(check.statusCode)
    ? 'Down'
    : check.responseMs >= 1000 ? 'Degraded' : 'Operational';

  const saveChanges = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setEditErrors({});
    try {
      await updateMonitor(monitor.id, { name: data.get('name'), url: data.get('url') });
      setEditing(false);
      toast('Monitor changes saved.');
    } catch (saveError) {
      setEditErrors(saveError.fields || {});
      if (!saveError.fields || !Object.keys(saveError.fields).length) toast(saveError.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="page-stack">
      <Link to="/monitors" className="back-link"><ArrowLeft size={14} /> Back to monitors</Link>
      <PageHeading title={monitor.name} description={monitor.url} actions={<><Button variant="secondary" onClick={() => setEditing(true)}><Pencil size={14} /> Edit monitor</Button><button className="button button-secondary icon-only" aria-label="More monitor actions" onClick={() => toast('No additional actions in this preview.')}><Ellipsis size={17} /></button></>} />
      <div className="detail-meta"><StatusBadge status={monitor.status} /><span><Clock3 size={13} /> Checked {monitor.checked}</span><span><Activity size={13} /> Every {monitor.intervalSeconds / 60} {monitor.intervalSeconds === 60 ? 'minute' : 'minutes'}</span><a href={monitor.url} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Open website</a></div>
      <div className="metrics-grid detail-metrics">
        <MetricTile label="Uptime (30 days)" value={monitor.uptime} icon={ShieldCheck} tone="tone-green" delta="+0.02% from last month" />
        <MetricTile label="Latest response time" value={`${monitor.response ?? '—'}${monitor.response !== null ? ' ms' : ''}`} icon={Clock3} tone="tone-violet" delta="Most recent check" />
        <MetricTile label="Recent checks" value={String(monitor.checks.length)} icon={Check} tone="tone-neutral" delta="Latest results" />
        <MetricTile label="Expected status" value={monitor.expectedStatuses.join(', ')} icon={Globe2} tone="tone-green" delta={`${monitor.method} request · ${monitor.timeoutSeconds}s timeout`} />
      </div>
      <Card className="chart-card detail-response">
        <CardHeading title="Response time" detail="Recent live check results" action={<div className="segmented-control"><button className="selected">Live</button></div>} />
        <div className="chart-legend"><span><i className="legend-violet" />Response time</span><strong>{monitor.response ?? '—'} <small>ms latest</small></strong></div>
        <div className="chart-area chart-large"><ResponsiveContainer width="100%" height="100%"><AreaChart data={responseSeries} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="detailResponse" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a68bfa" stopOpacity={0.19} /><stop offset="100%" stopColor="#a68bfa" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#202321" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="time" tick={{ fill: '#686d69', fontSize: 10 }} tickLine={false} axisLine={false} interval={3} /><YAxis tick={{ fill: '#686d69', fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip /><Area type="monotone" dataKey="response" stroke="#a68bfa" strokeWidth={2} fill="url(#detailResponse)" /></AreaChart></ResponsiveContainer></div>
        <div className="uptime-strip-heading"><span>Uptime history</span><span>Past 30 days</span></div>
        <div className="uptime-strip" aria-label="Recent check history">{Array.from({ length: 30 }, (_, index) => { const check = history[index]; const status = check ? statusOf(check) : ''; return <span key={index} className={status === 'Down' ? 'strip-down' : status === 'Degraded' ? 'strip-warning' : ''} title={check ? `${new Date(check.checkedAt).toLocaleString()} · ${status}` : 'No check yet'} />; })}</div>
      </Card>
      <div className="detail-tables">
        <Card className="table-card">
          <CardHeading title="Recent check results" detail="Latest automated checks" />
          <div className="table-scroll"><table><thead><tr><th>Time</th><th>Region</th><th>Status</th><th>Response</th><th>Code</th></tr></thead><tbody>{monitor.checks.map((check) => <tr key={check.checkedAt}><td>{new Date(check.checkedAt).toLocaleString()}</td><td>Server</td><td><StatusBadge status={statusOf(check)} /></td><td>{check.responseMs === null ? '—' : `${check.responseMs} ms`}</td><td className="muted">{check.statusCode || check.error || '—'}</td></tr>)}{monitor.checks.length === 0 && <tr><td colSpan="5"><div className="table-empty">Waiting for the first check.</div></td></tr>}</tbody></table></div>
          <span className="table-view-more">Showing up to 50 recent checks; refreshed automatically.</span>
        </Card>
        <Card className="table-card incident-history">
          <CardHeading title="Check configuration" detail="Settings applied to this monitor" />
          <div className="incident-mini"><span className="incident-mini-dot" /><div><strong>{monitor.method} request</strong><p>Expected HTTP status: {monitor.expectedStatuses.join(', ')}</p><small>Every {monitor.intervalSeconds / 60} minutes · {monitor.timeoutSeconds}s timeout</small></div></div>
        </Card>
      </div>
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit monitor" description="The updated endpoint is checked immediately." footer={<><Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button><Button type="submit" form="edit-monitor-form" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button></>}>
        <form id="edit-monitor-form" className="modal-form" onSubmit={saveChanges}>
          <Field label="Monitor name" name="name" defaultValue={monitor.name} error={editErrors.name} />
          <Field label="Website URL" name="url" type="url" defaultValue={monitor.url} error={editErrors.url} />
        </form>
      </Modal>
    </div>
  );
}

function MetricTile({ label, value, icon: Icon, tone, delta }) {
  return <Card className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={16} /></span></div><div className="metric-value">{value}</div><div className="metric-note">{delta}</div></Card>;
}
