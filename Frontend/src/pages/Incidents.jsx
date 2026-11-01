import { useMemo, useState } from 'react';
import { ArrowDownUp, ArrowUpRight, CircleAlert, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, PageHeading, StatusBadge } from '../components/UI.jsx';
import { incidents } from '../data/mockData.js';

const tabs = ['All', 'Ongoing', 'Resolved'];

export default function Incidents() {
  const [active, setActive] = useState('All');
  const [search, setSearch] = useState('');
  const rows = useMemo(() => incidents.filter((incident) => (active === 'All' || incident.status === active) && incident.website.toLowerCase().includes(search.toLowerCase())), [active, search]);
  return (
    <div className="page-stack">
      <PageHeading title="Incidents" description="Review service disruptions and their resolution." actions={<span className="incident-summary"><CircleAlert size={14} />1 ongoing incident</span>} />
      <Card className="table-card">
        <div className="table-toolbar">
          <div className="tabs">{tabs.map((tab) => <button key={tab} onClick={() => setActive(tab)} className={active === tab ? 'tab-active' : ''}>{tab}<span>{tab === 'All' ? incidents.length : incidents.filter((incident) => incident.status === tab).length}</span></button>)}</div>
          <label className="table-search"><Search size={15} /><input placeholder="Search websites..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        </div>
        <div className="table-scroll"><table><thead><tr><th>Website <ArrowDownUp size={12} /></th><th>Status</th><th>Started at</th><th>Resolved at</th><th>Duration</th><th>Details</th></tr></thead>
          <tbody>{rows.map((incident) => <tr key={incident.id}><td><Link to={`/monitors/${incident.website.replaceAll('.', '-')}`} className="incident-site">{incident.website}<small>{incident.id}</small></Link></td><td><StatusBadge status={incident.status} /></td><td>{incident.started}</td><td>{incident.resolved}</td><td>{incident.duration}</td><td className="incident-description">{incident.detail}<ArrowUpRight size={13} /></td></tr>)}
          {!rows.length && <tr><td colSpan="6"><div className="table-empty">No incidents found.</div></td></tr>}</tbody>
        </table></div>
        <div className="table-footer"><span>Showing {rows.length} of {incidents.length} incidents</span><div><button disabled>Previous</button><button disabled>Next</button></div></div>
      </Card>
      <p className="page-footnote">Incident history is static sample data for this preview.</p>
    </div>
  );
}
