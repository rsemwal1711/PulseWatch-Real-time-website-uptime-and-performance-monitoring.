import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Github, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { Button, Field, useToast } from '../components/UI.jsx';

function AuthField({ label, type, placeholder, icon: Icon, autoComplete }) {
  return (
    <Field label={label}>
      <span className="auth-input-icon"><Icon size={15} /></span>
      <input type={type} placeholder={placeholder} autoComplete={autoComplete} required />
    </Field>
  );
}

function PasswordField({ label, placeholder, autoComplete, onChange }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label}>
      <span className="auth-input-icon"><LockKeyhole size={15} /></span>
      <input type={visible ? 'text' : 'password'} placeholder={placeholder} autoComplete={autoComplete} minLength={8} required onChange={onChange} />
      <button type="button" className="input-trailing" onClick={() => setVisible((value) => !value)} aria-label={visible ? 'Hide password' : 'Show password'}>
        {visible ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </Field>
  );
}

function AuthForm({ mode }) {
  const toast = useToast();
  const [values, setValues] = useState({ password: '', confirm: '' });
  const signup = mode === 'signup';
  const submit = (event) => {
    event.preventDefault();
    if (signup && values.password !== values.confirm) {
      toast('Your passwords do not match.');
      return;
    }
    toast('Authentication is not connected in this preview.');
  };
  return (
    <form className="auth-form" onSubmit={submit}>
      {signup && <AuthField label="Full name" type="text" placeholder="John Doe" icon={UserRound} autoComplete="name" />}
      <AuthField label="Email address" type="email" placeholder="you@example.com" icon={Mail} autoComplete="email" />
      <PasswordField label="Password" placeholder="At least 8 characters" autoComplete={signup ? 'new-password' : 'current-password'} onChange={(event) => setValues({ ...values, password: event.target.value })} />
      {signup ? (
        <PasswordField label="Confirm password" placeholder="Re-enter your password" autoComplete="new-password" onChange={(event) => setValues({ ...values, confirm: event.target.value })} />
      ) : <div className="forgot-link"><Link to="/forgot-password">Forgot password?</Link></div>}
      <Button type="submit" className="auth-submit">{signup ? 'Create account' : 'Sign in'}<span aria-hidden="true">→</span></Button>
      <div className="auth-divider"><span />OR CONTINUE WITH<span /></div>
      <Button type="button" variant="secondary" className="github-button" onClick={() => toast('GitHub sign in is not configured in this preview.')}><Github size={16} />Continue with GitHub</Button>
      {signup && <p className="terms-copy">By creating an account, you agree to our <button type="button" onClick={() => toast('Terms of Service preview')}>Terms of Service</button> and <button type="button" onClick={() => toast('Privacy Policy preview')}>Privacy Policy</button>.</p>}
      <p className="auth-switch">{signup ? 'Already have an account?' : "Don't have an account?"} <Link to={signup ? '/login' : '/signup'}>{signup ? 'Sign in' : 'Create account'}</Link></p>
    </form>
  );
}

export function Login() {
  return (
    <div className="auth-panel">
      <div className="auth-top-link">New to PulseWatch? <Link to="/signup">Create account</Link></div>
      <div className="auth-content">
        <div className="auth-mobile-brand"><span className="brand-icon"><LockKeyhole size={15} /></span>PulseWatch</div>
        <span className="form-kicker">WELCOME BACK</span>
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Sign in to continue to your PulseWatch dashboard.</p>
        <AuthForm mode="login" />
      </div>
      <div className="auth-legal">© 2026 PulseWatch <span>·</span> Built for peace of mind</div>
    </div>
  );
}

export function Signup() {
  return (
    <div className="auth-panel">
      <div className="auth-top-link">Already a member? <Link to="/login">Sign in</Link></div>
      <div className="auth-content auth-content-signup">
        <div className="auth-mobile-brand"><span className="brand-icon"><LockKeyhole size={15} /></span>PulseWatch</div>
        <span className="form-kicker">GET STARTED</span>
        <h1>Create your account</h1>
        <p className="auth-subtitle">Start monitoring your websites and stay ahead of downtime.</p>
        <AuthForm mode="signup" />
      </div>
      <div className="auth-legal">© 2026 PulseWatch <span>·</span> Built for peace of mind</div>
    </div>
  );
}

export function ForgotPassword() {
  const toast = useToast();
  return (
    <div className="forgot-page">
      <Link to="/login" className="forgot-brand"><span className="brand-icon"><LockKeyhole size={16} /></span>PulseWatch</Link>
      <div className="forgot-card">
        <span className="forgot-emblem"><Mail size={20} /></span>
        <span className="form-kicker">ACCOUNT RECOVERY</span>
        <h1>Reset your password</h1>
        <p>Enter the email address associated with your account and we’ll send you a link to reset your password.</p>
        <form onSubmit={(event) => { event.preventDefault(); toast('Password reset is not connected in this preview.'); }}>
          <AuthField label="Email address" type="email" placeholder="you@example.com" icon={Mail} autoComplete="email" />
          <Button type="submit" className="auth-submit">Send reset link<span aria-hidden="true">→</span></Button>
        </form>
        <Link to="/login" className="back-login">← Back to sign in</Link>
      </div>
      <div className="auth-legal">© 2026 PulseWatch <span>·</span> Built for peace of mind</div>
    </div>
  );
}
