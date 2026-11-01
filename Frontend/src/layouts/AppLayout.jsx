import { useLayoutEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Activity, Bell, ChartNoAxesCombined, ChevronDown, CircleAlert, LayoutDashboard, LogOut, Menu, Monitor, Moon, PanelLeftClose, PanelLeftOpen, Search, Settings, Sun, X } from 'lucide-react';
import { Brand, IconButton, useToast } from '../components/UI.jsx';
import { useMonitors } from '../api/monitors.jsx';

function getStoredTheme() {
  try {
    return window.localStorage.getItem('pulsewatch-theme') === 'light' ? 'light' : 'dark';
  } catch (error) {
    console.warn('Unable to read the saved theme preference.', error);
    return 'dark';
  }
}

const navigation = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Monitors', to: '/monitors', icon: Monitor },
  { label: 'Incidents', to: '/incidents', icon: CircleAlert },
  { label: 'Analytics', to: '/analytics', icon: ChartNoAxesCombined },
  { label: 'Settings', to: '/settings', icon: Settings },
];

function Sidebar({ open, onClose, collapsed }) {
  const toast = useToast();
  const { monitors } = useMonitors();
  return (
    <>
      {open && <button className="drawer-scrim" aria-label="Close navigation" onClick={onClose} />}
      <aside id="primary-navigation" className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand"><Brand /><IconButton className="mobile-close" label="Close menu" onClick={onClose}><X size={18} /></IconButton></div>
        <span className="nav-caption">WORKSPACE</span>
        <nav className="side-nav">
          {navigation.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} title={collapsed ? label : undefined} onClick={onClose} className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}>
              <Icon size={17} strokeWidth={1.8} /><span className="nav-label">{label}</span>
              {label === 'Incidents' && <span className="nav-count">1</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="plan-card"><span className="plan-label">YOUR WORKSPACE</span><strong>Starter plan</strong><span>{monitors.length} of 10 monitors used</span><div className="plan-progress"><span style={{ width: `${Math.min(monitors.length / 10 * 100, 100)}%` }} /></div></div>
          <button className="profile-card" aria-label="Profile menu for John Doe" onClick={() => toast('Profile menu is available in this preview.')}>
            <span className="avatar">JD</span><span className="profile-copy"><strong>John Doe</strong><small>john@example.com</small></span><ChevronDown size={14} className="profile-chevron" />
          </button>
          <button className="logout-link" onClick={() => toast('Authentication is not connected in this preview.')}><LogOut size={15} /><span>Sign out</span></button>
        </div>
      </aside>
    </>
  );
}

function pageTitle(pathname) {
  if (pathname.startsWith('/monitors/new')) return 'Add monitor';
  if (pathname.startsWith('/monitors/')) return 'Monitor details';
  return navigation.find(({ to }) => pathname.startsWith(to))?.label || 'Dashboard';
}

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState(getStoredTheme);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const location = useLocation();
  const toast = useToast();
  const { error } = useMonitors();

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem('pulsewatch-theme', theme);
    } catch (error) {
      console.warn('Unable to save the theme preference.', error);
    }
  }, [theme]);

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} collapsed={sidebarCollapsed} />
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <IconButton label="Open navigation" className="menu-toggle" aria-controls="primary-navigation" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}><Menu size={19} /></IconButton>
            <IconButton label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="sidebar-toggle" aria-controls="primary-navigation" aria-expanded={!sidebarCollapsed} onClick={() => setSidebarCollapsed((value) => !value)}>
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </IconButton>
            <span className="breadcrumb">Workspace <span>/</span> {pageTitle(location.pathname)}</span>
          </div>
          <div className="topbar-actions">
            <label className="global-search"><Search size={15} /><input placeholder="Search anything..." aria-label="Search" onKeyDown={(event) => { if (event.key === 'Enter' && event.currentTarget.value) toast('Search is a preview-only control.'); }} /></label>
            <IconButton
              label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="theme-toggle"
              aria-pressed={theme === 'light'}
              onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </IconButton>
            <div className="notification-wrap">
              <IconButton label="Notifications" className="notification-button" onClick={() => setNotificationsOpen((value) => !value)}><Bell size={17} /><span className="notification-dot" /></IconButton>
              {notificationsOpen && <div className="notification-popover"><strong>Notifications</strong><p><span className="status-dot status-dot-down" /> store.example.com is down <small>5 min ago</small></p><p><span className="status-dot" /> api.example.com is back online <small>2 min ago</small></p></div>}
            </div>
            <button className="topbar-avatar" aria-label="Profile menu" onClick={() => toast('Signed in as John Doe · preview mode')}>JD</button>
          </div>
        </header>
        <main className="content"><Outlet /></main>
        <footer className="app-footer"><span><Activity size={13} /> {error ? 'Backend disconnected' : 'Live monitoring enabled'}</span><span>PulseWatch <i>·</i> Status refreshes every 5 seconds</span></footer>
      </div>
    </div>
  );
}
