import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Clock3, CloudOff, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button, Card, CardHeading, PageHeading } from '../components/UI.jsx';
import { fetchAnalytics } from '../api/monitors.jsx';

const ranges = ['24h', '7d', '30d'];

function formatDuration(milliseconds) {
  const minutes = Math.floor(milliseconds / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function formatTimestamp(timestamp, range) {
  const date = new Date(timestamp);
  return range === '24h'
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function Analytics() {
  const [range, setRange] = useState('24h');
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const result = await fetchAnalytics(range);
        if (active) {
          setAnalytics(result);
          setError('');
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [range]);

  const chartData = analytics?.points.map((point) => ({
    ...point,
    time: formatTimestamp(point.timestamp, range),
  })) || [];
  const uptime = analytics?.uptime === null || analytics?.uptime === undefined
    ? '—'
    : `${analytics.uptime.toFixed(2)}%`;
  const averageResponse = analytics?.averageResponseMs == null
    ? '—'
    : `${Math.round(analytics.averageResponseMs)} ms`;
  const downtime = analytics ? formatDuration(analytics.estimatedDowntimeMs) : '—';
  const rangeLabel = range === '24h' ? '24 hours' : range === '7d' ? '7 days' : '30 days';

  return (
    <div className="page-stack">
      <PageHeading
        title="Analytics"
        description="Metrics calculated from recorded monitor checks."
        actions={<div className="segmented-control range-control">{ranges.map((item) => <button key={item} className={range === item ? 'selected' : ''} onClick={() => setRange(item)}>{item}</button>)}</div>}
      />
      {error && <div className="table-empty" role="alert">{error}</div>}
      <div className="analytics-metrics">
        <AnalyticsMetric label="Uptime percentage" value={uptime} detail={`${analytics?.checksCount ?? 0} checks in ${rangeLabel}`} icon={TrendingUp} tone="tone-green" />
        <AnalyticsMetric label="Average response time" value={averageResponse} detail="Successful HTTP checks" icon={Clock3} tone="tone-violet" />
        <AnalyticsMetric label="Estimated downtime" value={downtime} detail="From detected down incidents" icon={CloudOff} tone="tone-amber" />
      </div>
      <Card className="analytics-chart-card">
        <CardHeading title="Uptime percentage" detail={`Availability by check bucket over the last ${rangeLabel}`} action={<span className="chart-period">{analytics ? `Updated ${new Date(analytics.generatedAt).toLocaleTimeString()}` : 'Loading'}</span>} />
        <div className="chart-legend"><span><i className="legend-green" />Availability</span><strong>{uptime} <small>{analytics?.checksCount ?? 0} checks</small></strong></div>
        <div className="chart-area chart-large">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
                <defs><linearGradient id="analyticsUptime" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#31d58a" stopOpacity={0.2} /><stop offset="100%" stopColor="#31d58a" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#202321" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#686d69', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fill: '#686d69', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value) => [`${value.toFixed(2)}%`, 'Uptime']} />
                <Area type="monotone" dataKey="uptime" stroke="#38d992" strokeWidth={2} fill="url(#analyticsUptime)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="table-empty">{analytics ? 'No checks were recorded in this time range.' : 'Loading check history…'}</div>}
        </div>
      </Card>
      <Card className="analytics-chart-card">
        <CardHeading title="Response time" detail="Average response time for successful checks in each bucket" action={<Button variant="secondary" className="export-button" onClick={() => window.print()}>Export report <ArrowUpRight size={13} /></Button>} />
        <div className="chart-legend"><span><i className="legend-violet" />Response time</span><strong>{averageResponse} <small>average</small></strong></div>
        <div className="chart-area chart-medium">
          {chartData.some((point) => point.averageResponseMs !== null) ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <defs><linearGradient id="analyticsResponse" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a68bfa" stopOpacity={0.18} /><stop offset="100%" stopColor="#a68bfa" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#202321" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#686d69', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#686d69', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => [`${Math.round(value)} ms`, 'Response time']} />
                <Area type="monotone" dataKey="averageResponseMs" stroke="#a68bfa" strokeWidth={2} fill="url(#analyticsResponse)" connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="table-empty">{analytics ? 'No successful response times in this time range.' : 'Loading check history…'}</div>}
        </div>
      </Card>
      <div className="availability-note"><span className="status-dot" /> Analytics refresh every five seconds. Downtime starts at the first failed check PulseWatch observed; older check history may be limited by retention. <ArrowDownRight size={13} /></div>
    </div>
  );
}

function AnalyticsMetric({ label, value, detail, icon: Icon, tone }) {
  return <Card className="analytics-metric"><span className={`metric-icon ${tone}`}><Icon size={16} /></span><span className="analytics-label">{label}</span><strong>{value}</strong><span className="analytics-trend"><small>{detail}</small></span></Card>;
}
