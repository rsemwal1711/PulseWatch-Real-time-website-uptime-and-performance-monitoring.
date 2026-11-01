import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDownUp, ArrowUpRight, Ellipsis, Plus, Search } from 'lucide-react';
import { Button, Card, Field, PageHeading, SelectField, StatusBadge, useToast } from '../components/UI.jsx';
import { useMonitors } from '../api/monitors.jsx';

export default function Monitors() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All statuses');
  const [openMenu, setOpenMenu] = useState(null);
  const { monitors, loading, error } = useMonitors();
  const toast = useToast();
  const visible = useMemo(() => monitors.filter((monitor) => {
    const matchesText = `${monitor.name} ${monitor.url}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = filter === 'All statuses' || monitor.status === filter;
    return matchesText && matchesStatus;
  }), [filter, query]);

  return (
    <div className="page-stack">
      <PageHeading title="Monitors" description="Manage and track the health of your websites." actions={<Link to="/monitors/new"><Button><Plus size={16} /> Add monitor</Button></Link>} />
      <Card className="table-card">
        {error && <div className="table-empty" role="alert">{error}</div>}
        <div className="table-toolbar">
          <div><strong>All monitors</strong><span className="table-count">{visible.length}</span></div>
          <div className="table-controls">
            <label className="table-search"><Search size={15} /><input placeholder="Search monitors..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <label className="filter-select"><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All statuses</option><option>Operational</option><option>Down</option><option>Degraded</option></select><ArrowDownUp size={13} /></label>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Website <ArrowDownUp size={12} /></th><th>Status</th><th>Response time</th><th>Uptime (30d)</th><th>Last checked</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {loading && monitors.length === 0 && <tr><td colSpan="6"><div className="table-empty">Loading monitors…</div></td></tr>}
              {visible.map((monitor) => (
                <tr key={monitor.id}>
                  <td><Link to={`/monitors/${monitor.id}`} className="table-website"><span className={`website-favicon ${monitor.status === 'Down' ? 'favicon-red' : ''}`}>{monitor.name.slice(0, 1)}</span><span>{monitor.name}<small>{monitor.url}</small></span></Link></td>
                  <td><StatusBadge status={monitor.status} /></td>
                  <td>{monitor.response !== null ? <>{monitor.response} <span className="muted">ms</span></> : <span className="muted">—</span>}</td>
                  <td className="uptime-value">{monitor.uptime}</td>
                  <td className="muted">{monitor.checked}</td>
                  <td className="row-menu-cell"><button className="icon-button row-menu-button" aria-label={`Actions for ${monitor.name}`} onClick={() => setOpenMenu(openMenu === monitor.id ? null : monitor.id)}><Ellipsis size={17} /></button>
                    {openMenu === monitor.id && <div className="row-menu"><Link to={`/monitors/${monitor.id}`}>View details <ArrowUpRight size={13} /></Link><Link to={`/monitors/${monitor.id}`}>Edit monitor <ArrowUpRight size={13} /></Link></div>}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && !loading && <tr><td colSpan="6"><div className="table-empty">No monitors match your search.</div></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="table-footer"><span>Showing {visible.length} of {monitors.length} monitors</span><div><button disabled>Previous</button><button disabled>Next</button></div></div>
      </Card>
      <p className="page-footnote">Checks run on your configured interval. Status updates refresh automatically.</p>
    </div>
  );
}

export function NewMonitor() {
  const navigate = useNavigate();
  const toast = useToast();
  const { createMonitor } = useMonitors();
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextErrors = {};
    if (!data.get('name')?.trim()) nextErrors.name = 'Enter a name for this monitor.';
    try { new URL(data.get('url')); } catch { nextErrors.url = 'Enter a valid website URL, including https://.'; }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    try {
      await createMonitor({
        name: data.get('name'),
        url: data.get('url'),
        method: data.get('method'),
        intervalSeconds: Number(data.get('interval')),
        timeoutSeconds: Number(data.get('timeout')),
        expectedStatuses: String(data.get('expected')).split(',').map((code) => Number(code.trim())),
      });
      toast('Monitor created and checked.');
      navigate('/monitors');
    } catch (error) {
      setErrors(error.fields || {});
      if (!error.fields || !Object.keys(error.fields).length) toast(error.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="page-stack page-narrow">
      <PageHeading title="Add a monitor" description="Set up a new endpoint to keep an eye on." />
      <form className="form-stack" onSubmit={submit}>
        <Card className="form-card">
          <div className="form-section-title"><span>01</span><div><h2>Monitor details</h2><p>Tell us which website to check.</p></div></div>
          <div className="form-fields">
            <Field label="Monitor name" name="name" placeholder="e.g. Main website" hint="A name to help you identify this monitor." error={errors.name} />
            <Field label="Website URL" name="url" type="url" placeholder="https://example.com" hint="Enter the full URL, including the protocol." error={errors.url} />
          </div>
        </Card>
        <Card className="form-card">
          <div className="form-section-title"><span>02</span><div><h2>Check configuration</h2><p>Choose how PulseWatch checks your endpoint.</p></div></div>
          <div className="form-fields form-fields-two">
            <SelectField label="HTTP method" name="method"><option>GET</option><option>HEAD</option><option>POST</option></SelectField>
            <SelectField label="Monitoring interval" name="interval"><option value="60">Every 1 minute</option><option value="300">Every 5 minutes</option><option value="600">Every 10 minutes</option></SelectField>
            <SelectField label="Request timeout" name="timeout"><option value="10">10 seconds</option><option value="5">5 seconds</option><option value="20">20 seconds</option></SelectField>
            <label className="field"><span className="field-label">Expected status codes</span><span className={`input-wrap ${errors.expectedStatuses ? 'input-error' : ''}`}><input name="expected" defaultValue="200" /></span>{errors.expectedStatuses ? <span className="field-error">{errors.expectedStatuses}</span> : <span className="field-hint">Separate multiple codes with commas.</span>}</label>
          </div>
        </Card>
        <div className="form-actions"><Button type="button" variant="secondary" onClick={() => navigate('/monitors')}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Checking website…' : <>Create monitor <ArrowUpRight size={15} /></>}</Button></div>
      </form>
      <p className="page-footnote">PulseWatch performs the first check immediately, then checks at your selected interval.</p>
    </div>
  );
}
