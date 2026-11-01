import { useState } from 'react';
import { Bell, CreditCard, LogOut, Save, Shield, UserRound } from 'lucide-react';
import { Button, Card, Field, PageHeading, Toggle, useToast } from '../components/UI.jsx';

const sections = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

export default function Settings() {
  const [active, setActive] = useState('profile');
  const toast = useToast();
  const [notifications, setNotifications] = useState({ email: true, incidents: true, recovery: true });
  const [errors, setErrors] = useState({});
  const savePassword = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = {};
    if (!form.get('current')?.trim()) next.current = 'Enter your current password.';
    if (!form.get('new') || String(form.get('new')).length < 8) next.new = 'Use at least 8 characters.';
    if (form.get('new') !== form.get('confirm')) next.confirm = 'Your passwords do not match.';
    setErrors(next);
    if (!Object.keys(next).length) toast('Password changes are not connected in this preview.');
  };
  return (
    <div className="page-stack">
      <PageHeading title="Settings" description="Manage your account and preferences." />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {sections.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? 'settings-tab settings-tab-active' : 'settings-tab'} onClick={() => setActive(id)}><Icon size={16} />{label}</button>)}
        </nav>
        <div className="settings-content">
          {active === 'profile' && <>
            <Card className="settings-card">
              <div className="settings-card-heading"><div><h2>Profile information</h2><p>Update your personal details and public profile.</p></div></div>
              <div className="avatar-edit"><span className="avatar avatar-large">JD</span><div><strong>Profile photo</strong><small>JPG, PNG or GIF. 2 MB max.</small></div><Button variant="secondary" className="upload-button" onClick={() => toast('Profile photo upload is not available in this preview.')}>Upload photo</Button></div>
              <form className="settings-form" onSubmit={(event) => { event.preventDefault(); toast('Profile saved for this preview only.'); }}>
                <Field label="Full name" name="name" defaultValue="John Doe" autoComplete="name" />
                <Field label="Email address" name="email" type="email" defaultValue="john@example.com" autoComplete="email" />
                <div className="settings-submit"><Button type="submit"><Save size={14} /> Save changes</Button></div>
              </form>
            </Card>
            <Card className="settings-card account-card"><div className="settings-card-heading"><div><h2>Account</h2><p>Manage your PulseWatch account.</p></div></div><div className="account-row"><div><strong>Workspace</strong><small>Starter plan · 8 of 10 monitors</small></div><span className="account-value">Created Oct 2026</span></div><div className="account-row"><div><strong>Sign out</strong><small>Sign out of this device.</small></div><Button variant="secondary" onClick={() => toast('Authentication is not connected in this preview.')}><LogOut size={14} /> Sign out</Button></div></Card>
          </>}
          {active === 'notifications' && <Card className="settings-card"><div className="settings-card-heading"><div><h2>Notification preferences</h2><p>Choose when and how PulseWatch notifies you.</p></div></div><div className="toggle-list">
            <Toggle label="Email notifications" description="Receive important updates about your workspace." checked={notifications.email} onChange={(checked) => setNotifications({ ...notifications, email: checked })} />
            <Toggle label="Incident alerts" description="Get notified when a monitor goes down." checked={notifications.incidents} onChange={(checked) => setNotifications({ ...notifications, incidents: checked })} />
            <Toggle label="Recovery alerts" description="Know when a monitor comes back online." checked={notifications.recovery} onChange={(checked) => setNotifications({ ...notifications, recovery: checked })} />
          </div><div className="settings-submit"><Button onClick={() => toast('Notification preferences saved for this preview only.')}><Save size={14} /> Save preferences</Button></div></Card>}
          {active === 'security' && <Card className="settings-card"><div className="settings-card-heading"><div><h2>Change password</h2><p>Choose a strong password to keep your account secure.</p></div></div><form className="security-form" onSubmit={savePassword} noValidate>
            <Field label="Current password" name="current" type="password" autoComplete="current-password" error={errors.current} />
            <Field label="New password" name="new" type="password" autoComplete="new-password" error={errors.new} hint="Use at least 8 characters." />
            <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" error={errors.confirm} />
            <div className="settings-submit"><Button type="submit"><Shield size={14} /> Update password</Button></div>
          </form></Card>}
          {active === 'billing' && <Card className="settings-card"><div className="settings-card-heading"><div><h2>Plan & billing</h2><p>Manage your plan and billing details.</p></div></div><div className="billing-plan"><span className="plan-tag">CURRENT PLAN</span><strong>Starter <small>Free</small></strong><p>Monitor up to 10 websites with 1-minute checks.</p><div className="billing-usage"><span>Monitors used</span><strong>8 of 10</strong><div className="plan-progress"><span /></div></div></div><div className="settings-submit"><Button variant="secondary" onClick={() => toast('Plan management is not available in this preview.')}>Manage plan <CreditCard size={14} /></Button></div></Card>}
        </div>
      </div>
      <p className="page-footnote">Settings are stored in the browser preview only and are not sent to a server.</p>
    </div>
  );
}
