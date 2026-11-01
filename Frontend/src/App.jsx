import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';
import { ForgotPassword, Login, Signup } from './pages/AuthPages.jsx';
import Analytics from './pages/Analytics.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Incidents from './pages/Incidents.jsx';
import MonitorDetails from './pages/MonitorDetails.jsx';
import Monitors, { NewMonitor } from './pages/Monitors.jsx';
import Settings from './pages/Settings.jsx';
import { MonitorProvider } from './api/monitors.jsx';

export default function App() {
  return (
    <MonitorProvider>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/monitors" element={<Monitors />} />
          <Route path="/monitors/new" element={<NewMonitor />} />
          <Route path="/monitors/:monitorId" element={<MonitorDetails />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </MonitorProvider>
  );
}
