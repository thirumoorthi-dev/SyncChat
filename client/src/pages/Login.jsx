import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* Floating bubble animation positions */
const BUBBLES = [
  { w: 180, top: '15%', left: '10%', delay: '0s',   dur: '6s',  opacity: 0.6 },
  { w: 140, top: '60%', left: '5%',  delay: '1.5s', dur: '8s',  opacity: 0.4 },
  { w: 100, top: '80%', left: '55%', delay: '3s',   dur: '7s',  opacity: 0.35 },
  { w: 120, top: '30%', left: '70%', delay: '0.8s', dur: '9s',  opacity: 0.5 },
  { w: 80,  top: '70%', left: '80%', delay: '2s',   dur: '6.5s',opacity: 0.3 },
];

function FloatBubble({ w, top, left, delay, dur, opacity }) {
  return (
    <div
      className="absolute rounded-2xl"
      style={{
        width: w, height: w * 0.55,
        top, left, opacity,
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255,255,255,0.2)',
        animation: `floatBubble ${dur} ease-in-out infinite`,
        animationDelay: delay,
      }}
    />
  );
}

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(form.username, form.email, form.password);
      } else {
        await login(form.email, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsRegister(r => !r);
    setError('');
    setForm({ username: '', email: '', password: '' });
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── Left Panel – decorative ── */}
      <div
        className="hidden lg:flex flex-col items-center justify-center flex-1 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #075E54 0%, #128C7E 50%, #25D366 100%)' }}
      >
        {/* Floating animated bubbles */}
        {BUBBLES.map((b, i) => <FloatBubble key={i} {...b} />)}

        <style>{`
          @keyframes floatBubble {
            0%, 100% { transform: translateY(0) rotate(-2deg); }
            50%       { transform: translateY(-20px) rotate(2deg); }
          }
        `}</style>

        {/* WhatsApp-style logo + tagline */}
        <div className="relative z-10 text-center px-12">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl"
            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(12px)' }}
          >
            <svg viewBox="0 0 48 48" fill="white" className="w-14 h-14">
              <path d="M24 4C12.95 4 4 12.95 4 24c0 3.57.93 6.91 2.55 9.8L4 44l10.47-2.52C17.2 43.11 20.52 44 24 44c11.05 0 20-8.95 20-20S35.05 4 24 4zm0 36c-3.17 0-6.14-.85-8.69-2.33l-.62-.37-6.21 1.49 1.52-5.99-.4-.64C8.03 30.05 7 27.13 7 24c0-9.39 7.61-17 17-17s17 7.61 17 17-7.61 17-17 17zm9.35-12.8c-.51-.25-3.02-1.49-3.49-1.66-.47-.17-.81-.25-1.15.25-.34.51-1.32 1.66-1.62 2-.3.34-.59.38-1.1.13-3.14-1.57-5.2-2.8-7.28-6.35-.55-.95.55-.88 1.57-2.92.17-.34.08-.63-.04-.88-.13-.25-1.15-2.77-1.57-3.79-.41-.99-.84-.85-1.15-.87-.3-.02-.64-.02-.98-.02-.34 0-.89.13-1.36.63-.47.51-1.78 1.74-1.78 4.25 0 2.51 1.82 4.93 2.07 5.27.25.34 3.58 5.47 8.68 7.67 5.1 2.2 5.1 1.47 6.02 1.38.92-.09 2.98-1.22 3.4-2.4.42-1.18.42-2.19.3-2.4-.13-.21-.47-.34-.98-.59z"/>
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">WhatsApp Clone</h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-sm">
            Real-time messaging with groups, read receipts, typing indicators and more.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {['💬 Real-time chat', '👥 Group chats', '✅ Read receipts', '⌨️ Typing indicators', '🌙 Dark mode'].map(f => (
              <span
                key={f}
                className="text-xs font-medium px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)' }}
              >
                {f}
              </span>
            ))}
          </div>

          {/* Tech stack */}
          <p className="text-white/50 text-xs mt-10">
            Built with React · Node.js · Socket.IO · PostgreSQL
          </p>
        </div>
      </div>

      {/* ── Right Panel – form ── */}
      <div
        className="flex flex-col items-center justify-center w-full lg:w-[420px] flex-shrink-0 px-8 py-12"
        style={{ background: 'var(--modal-bg)' }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex flex-col items-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg, #128C7E, #25D366)' }}
          >
            <svg viewBox="0 0 48 48" fill="white" className="w-9 h-9">
              <path d="M24 4C12.95 4 4 12.95 4 24c0 3.57.93 6.91 2.55 9.8L4 44l10.47-2.52C17.2 43.11 20.52 44 24 44c11.05 0 20-8.95 20-20S35.05 4 24 4zm9.35 23.2c-.51-.25-3.02-1.49-3.49-1.66-.47-.17-.81-.25-1.15.25-.34.51-1.32 1.66-1.62 2-.3.34-.59.38-1.1.13-3.14-1.57-5.2-2.8-7.28-6.35-.55-.95.55-.88 1.57-2.92.17-.34.08-.63-.04-.88-.13-.25-1.15-2.77-1.57-3.79-.41-.99-.84-.85-1.15-.87-.3-.02-.64-.02-.98-.02-.34 0-.89.13-1.36.63-.47.51-1.78 1.74-1.78 4.25 0 2.51 1.82 4.93 2.07 5.27.25.34 3.58 5.47 8.68 7.67 5.1 2.2 5.1 1.47 6.02 1.38.92-.09 2.98-1.22 3.4-2.4.42-1.18.42-2.19.3-2.4-.13-.21-.47-.34-.98-.59z"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>WhatsApp Clone</h1>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>
              {isRegister ? 'Create account' : 'Welcome back'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--subtext)' }}>
              {isRegister
                ? 'Join today and start messaging instantly'
                : 'Sign in to continue your conversations'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-2 text-sm rounded-xl px-4 py-3 mb-5"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--subtext)' }}>
                  Username
                </label>
                <input
                  type="text"
                  id="register-username"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="johndoe"
                  required={isRegister}
                  autoComplete="username"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{
                    background: 'var(--input-bg)',
                    color: 'var(--text)',
                    border: '1.5px solid var(--border)',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--teal)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--subtext)' }}>
                Email
              </label>
              <input
                type="email"
                id="login-email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="john@example.com"
                required
                autoComplete="email"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: 'var(--input-bg)',
                  color: 'var(--text)',
                  border: '1.5px solid var(--border)',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--teal)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--subtext)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  id="login-password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none transition-all"
                  style={{
                    background: 'var(--input-bg)',
                    color: 'var(--text)',
                    border: '1.5px solid var(--border)',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--teal)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: 'var(--subtext)' }}
                  tabIndex={-1}
                >
                  {showPw ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full rounded-xl py-3.5 text-sm font-semibold mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Please wait…
                </>
              ) : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Switch mode */}
          <p className="text-center text-sm mt-6" style={{ color: 'var(--subtext)' }}>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              id="auth-switch-btn"
              onClick={switchMode}
              className="font-semibold hover:underline transition-colors"
              style={{ color: 'var(--teal)' }}
            >
              {isRegister ? 'Sign In' : 'Register'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
