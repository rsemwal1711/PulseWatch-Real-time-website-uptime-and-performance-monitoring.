import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Clock3, CloudOff, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button, Card, CardHeading, PageHeading } from '../components/UI.jsx';
import { uptimeSeries } from '../data/mockData.js';

const ranges = ['24h', '7d', '30d'];

export default function Analytics() {
  const [range, setRange] = useState('24h');
  const chartData = range === '24h' ? uptimeSeries : range === '7d' ? uptimeSeries.slice(0, 20).map((point, index) => ({ ...point, time: `Oct ${24 + index % 7}` })) : uptimeSeries.map((point, index) => ({ ...point, time: `Oct ${index + 1}` }));
  return (
    <div className="page-stack">
      <PageHeading title="Analytics" description="A closer look at your monitoring performance." actions={<div className="segmented-control range-control">{ranges.map((item) => <button key={item} className={range === item ? 'selected' : ''} onClick={() => setRange(item)}>{item}</button>)}</div>} />
      <div className="analytics-metrics">
        <AnalyticsMetric label="Uptime percentage" value="99.98%" trend="+0.04%" detail="compared to previous period" icon={TrendingUp} tone="tone-green" />
        <AnalyticsMetric label="Average response time" value="243 ms" trend="9% faster" detail="compared to previous period" icon={Clock3} tone="tone-violet" />
        <AnalyticsMetric label="Total downtime" value="32 min" trend="−12 min" detail="compared to previous period" icon={CloudOff} tone="tone-amber" />
      </div>
      <Card className="analytics-chart-card">
        <CardHeading title="Uptime percentage" detail={`Service availability over the last ${range === '24h' ? '24 hours' : range === '7d' ? '7 days' : '30 days'}`} action={<button className="text-button">All monitors <ArrowUpRight size={13} /></button>} />
        <div className="chart-legend"><span><i className="legend-green" />Availability</span><strong>99.98% <small>+0.04%</small></strong></div>
        <div className="chart-area chart-large"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}><defs><linearGradient id="analyticsUptime" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#31d58a" stopOpacity={0.2} /><stop offset="100%" stopColor="#31d58a" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#202321" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="time" tick={{ fill: '#686d69', fontSize: 10 }} tickLine={false} axisLine={false} interval={range === '30d' ? 4 : 3} /><YAxis domain={[99, 100]} tick={{ fill: '#686d69', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} /><Tooltip /><Area type="monotone" dataKey="uptime" stroke="#38d992" strokeWidth={2} fill="url(#analyticsUptime)" /></AreaChart></ResponsiveContainer></div>
      </Card>
      <Card className="analytics-chart-card">
        <CardHeading title="Response time" detail="Average check response across all monitors" action={<Button variant="secondary" className="export-button" onClick={() => window.print()}>Export report <ArrowUpRight size={13} /></Button>} />
        <div className="chart-legend"><span><i className="legend-violet" />Response time</span><strong>243 ms <small>average</small></strong></div>
        <div className="chart-area chart-medium"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="analyticsResponse" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a68bfa" stopOpacity={0.18} /><stop offset="100%" stopColor="#a68bfa" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#202321" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="time" tick={{ fill: '#686d69', fontSize: 10 }} tickLine={false} axisLine={false} interval={range === '30d' ? 4 : 3} /><YAxis tick={{ fill: '#686d69', fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip /><Area type="monotone" dataKey="response" stroke="#a68bfa" strokeWidth={2} fill="url(#analyticsResponse)" /></AreaChart></ResponsiveContainer></div>
      </Card>
      <div className="availability-note"><span className="status-dot" /> Availability is calculated from checks in the selected time range. <ArrowDownRight size={13} /></div>
    </div>
  );
}

function AnalyticsMetric({ label, value, trend, detail, icon: Icon, tone }) {
  return <Card className="analytics-metric"><span className={`metric-icon ${tone}`}><Icon size={16} /></span><span className="analytics-label">{label}</span><strong>{value}</strong><span className="analytics-trend">{trend} <small>{detail}</small></span></Card>;
}
