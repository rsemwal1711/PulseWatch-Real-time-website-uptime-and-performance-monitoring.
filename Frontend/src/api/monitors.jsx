import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const MonitorsContext = createContext(null);

class ApiError extends Error {
  constructor(message, fields = {}) {
    super(message);
    this.name = 'ApiError';
    this.fields = fields;
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new ApiError('Could not connect to PulseWatch. Is the backend running?');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.error || 'The request could not be completed.', body.fields);
  return body;
}

export function MonitorProvider({ children }) {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const body = await request('/monitors');
      setMonitors(body.monitors);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(true), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const createMonitor = useCallback(async (input) => {
    const { monitor } = await request('/monitors', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setMonitors((current) => [monitor, ...current]);
    return monitor;
  }, []);

  const updateMonitor = useCallback(async (id, input) => {
    const { monitor } = await request(`/monitors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    setMonitors((current) => current.map((item) => item.id === id ? monitor : item));
    return monitor;
  }, []);

  const deleteMonitor = useCallback(async (id) => {
    await request(`/monitors/${id}`, { method: 'DELETE' });
    setMonitors((current) => current.filter((monitor) => monitor.id !== id));
  }, []);

  const value = useMemo(() => ({
    monitors,
    loading,
    error,
    refresh,
    createMonitor,
    updateMonitor,
    deleteMonitor,
  }), [monitors, loading, error, refresh, createMonitor, updateMonitor, deleteMonitor]);

  return <MonitorsContext.Provider value={value}>{children}</MonitorsContext.Provider>;
}

export function useMonitors() {
  const context = useContext(MonitorsContext);
  if (!context) throw new Error('useMonitors must be used inside MonitorProvider.');
  return context;
}
