import { useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, ArrowUpRight, CircleAlert, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, PageHeading, StatusBadge } from '../components/UI.jsx';
import { fetchIncidents } from '../api/monitors.jsx';

const tabs = ['All', 'Ongoing', 'Resolved'];

function formatDuration(milliseconds) {
  const minutes = Math.floor(milliseconds / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export default function Incidents() {
  const [active, setActive] = useState('All');
  const [search, setSearch] = useState('');
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const result = await fetchIncidents();
        if (mounted) {
          setIncidents(result);
          setError('');
        }
      } catch (requestError) {
        if (mounted) setError(requestError.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const ongoingCount = incidents.filter((incident) => incident.status === 'Ongoing').length;
  const rows = useMemo(() => incidents.filter((incident) =>
    (active === 'All' || incident.status === active) &&
    incident.website.toLowerCase().includes(search.toLowerCase())), [active, incidents, search]);
  return (
    <div className="page-stack">
      <PageHeading title="Incidents" description="Incidents are created from failed checks and resolved by the next successful check." actions={<span className="incident-summary"><CircleAlert size={14} />{ongoingCount} ongoing {ongoingCount === 1 ? 'incident' : 'incidents'}</span>} />
      {error && <div className="table-empty" role="alert">{error}</div>}
      <Card className="table-card">
        <div className="table-toolbar">
          <div className="tabs">{tabs.map((tab) => <button key={tab} onClick={() => setActive(tab)} className={active === tab ? 'tab-active' : ''}>{tab}<span>{tab === 'All' ? incidents.length : incidents.filter((incident) => incident.status === tab).length}</span></button>)}</div>
          <label className="table-search"><Search size={15} /><input placeholder="Search websites..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        </div>
        <div className="table-scroll"><table><thead><tr><th>Website <ArrowDownUp size={12} /></th><th>Status</th><th>Started at</th><th>Resolved at</th><th>Duration</th><th>Details</th></tr></thead>
          <tbody>{rows.map((incident) => <tr key={incident.id}><td><Link to={`/monitors/${incident.monitorId}`} className="incident-site">{incident.website}<small>{new URL(incident.url).host}</small></Link></td><td><StatusBadge status={incident.status} /></td><td>{new Date(incident.startedAt).toLocaleString()}</td><td>{incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : '—'}</td><td>{formatDuration(incident.durationMs)}</td><td className="incident-description">{incident.detail}<ArrowUpRight size={13} /></td></tr>)}
          {!rows.length && <tr><td colSpan="6"><div className="table-empty">{loading ? 'Loading incidents…' : 'No incidents found in the recorded checks.'}</div></td></tr>}</tbody>
        </table></div>
        <div className="table-footer"><span>Showing {rows.length} of {incidents.length} incidents</span><div><button disabled>Previous</button><button disabled>Next</button></div></div>
      </Card>
      <p className="page-footnote">Incident start and recovery times reflect when checks detected the change, not the exact time the website went down or recovered. Data is retained with each monitor.</p>
    </div>
  );
}
