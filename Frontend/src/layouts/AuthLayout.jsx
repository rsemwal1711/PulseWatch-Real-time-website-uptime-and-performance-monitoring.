import { Outlet } from 'react-router-dom';
import { Brand } from '../components/UI.jsx';

export default function AuthLayout() {
  return (
    <main className="auth-page">
      <aside className="auth-art">
        <div className="auth-art-shade" />
        <Brand />
        <div className="auth-quote">
          <span className="quote-mark">“</span>
          <p>Monitor smarter. Sleep better.</p>
          <span>— PulseWatch</span>
        </div>
      </aside>
      <section className="auth-main"><Outlet /></section>
    </main>
  );
}
