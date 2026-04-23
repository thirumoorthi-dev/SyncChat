// import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FormEvent, useState } from 'react';

/* Floating bubble animation positions — kept fully within the panel bounds */
const BUBBLES = [
  { w: 180, top: '10%',  left: '15%',  delay: '0s',   dur: '6s',   opacity: 0.5 },
  { w: 140, top: '55%',  left: '8%',   delay: '1.5s', dur: '8s',   opacity: 0.35 },
  { w: 100, top: '72%',  left: '50%',  delay: '3s',   dur: '7s',   opacity: 0.3 },
  { w: 120, top: '20%',  left: '60%',  delay: '0.8s', dur: '9s',   opacity: 0.4 },
  { w: 80,  top: '65%',  left: '72%',  delay: '2s',   dur: '6.5s', opacity: 0.25 },
];

interface FloatBubbleProps {
  w: number;
  top: string;
  left: string;
  delay: string;
  dur: string;
  opacity: number;
}

function FloatBubble({ w, top, left, delay, dur, opacity }: FloatBubbleProps) {
  return (
    <div
      className="absolute rounded-2xl pointer-events-none"
      style={{
        width: w,
        height: w * 0.55,
        top,
        left,
        opacity,
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
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPw, setShowPw] = useState<boolean>(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
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
    } catch (err: any) {
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
    <>
      <style>{`
        @keyframes floatBubble {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50%       { transform: translateY(-20px) rotate(2deg); }
        }
        .login-input {
          background: var(--input-bg);
          color: var(--text);
          border: 1.5px solid var(--border);
          width: 100%;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .login-input:focus {
          border-color: #25D366;
        }
        .login-input-pw {
          padding-right: 44px;
        }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'row',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* ── Left Panel – decorative ── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(145deg, #075E54 0%, #128C7E 50%, #25D366 100%)',
            minWidth: 0,
          }}
          className="left-panel"
        >
          {/* Hide on small screens via inline media query workaround — keep the panel but collapse */}
          <style>{`
            @media (max-width: 1023px) {
              .left-panel { display: none !important; }
            }
          `}</style>

          {BUBBLES.map((b, i) => <FloatBubble key={i} {...b} />)}

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 48px', maxWidth: 480 }}>
            {/* Logo circle */}
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              }}
            >
              <svg viewBox="0 0 48 48" fill="white" width="56" height="56">
                <path d="M24 4C12.95 4 4 12.95 4 24c0 3.57.93 6.91 2.55 9.8L4 44l10.47-2.52C17.2 43.11 20.52 44 24 44c11.05 0 20-8.95 20-20S35.05 4 24 4zm0 36c-3.17 0-6.14-.85-8.69-2.33l-.62-.37-6.21 1.49 1.52-5.99-.4-.64C8.03 30.05 7 27.13 7 24c0-9.39 7.61-17 17-17s17 7.61 17 17-7.61 17-17 17zm9.35-12.8c-.51-.25-3.02-1.49-3.49-1.66-.47-.17-.81-.25-1.15.25-.34.51-1.32 1.66-1.62 2-.3.34-.59.38-1.1.13-3.14-1.57-5.2-2.8-7.28-6.35-.55-.95.55-.88 1.57-2.92.17-.34.08-.63-.04-.88-.13-.25-1.15-2.77-1.57-3.79-.41-.99-.84-.85-1.15-.87-.3-.02-.64-.02-.98-.02-.34 0-.89.13-1.36.63-.47.51-1.78 1.74-1.78 4.25 0 2.51 1.82 4.93 2.07 5.27.25.34 3.58 5.47 8.68 7.67 5.1 2.2 5.1 1.47 6.02 1.38.92-.09 2.98-1.22 3.4-2.4.42-1.18.42-2.19.3-2.4-.13-.21-.47-.34-.98-.59z"/>
              </svg>
            </div>

            <h1 style={{ fontSize: 36, fontWeight: 700, color: '#fff', marginBottom: 12, letterSpacing: '-0.5px' }}>
              WhatsApp Clone
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 17, lineHeight: 1.6, marginBottom: 32 }}>
              Real-time messaging with groups, read receipts, typing indicators and more.
            </p>

            {/* Feature pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              {['💬 Real-time chat', '👥 Group chats', '✅ Read receipts', '⌨️ Typing indicators', '🌙 Dark mode'].map(f => (
                <span
                  key={f}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    padding: '6px 14px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.18)',
                    color: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {f}
                </span>
              ))}
            </div>

            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 40 }}>
              Built with React · Node.js · Socket.IO · PostgreSQL
            </p>
          </div>
        </div>

        {/* ── Right Panel – form ── */}
        <div
          style={{
            width: 420,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 32px',
            background: 'var(--modal-bg)',
            boxSizing: 'border-box',
          }}
          className="right-panel"
        >
          {/* On mobile, take full width */}
          <style>{`
            @media (max-width: 1023px) {
              .right-panel {
                width: 100% !important;
                min-height: 100vh;
              }
            }
          `}</style>

          <div style={{ width: '100%', maxWidth: 340 }}>
            {/* Heading */}
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>
                {isRegister ? 'Create account' : 'Welcome back'}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--subtext)', margin: 0 }}>
                {isRegister
                  ? 'Join today and start messaging instantly'
                  : 'Sign in to continue your conversations'}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  fontSize: 14,
                  borderRadius: 12,
                  padding: '12px 16px',
                  marginBottom: 20,
                  background: 'rgba(239,68,68,0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                <svg style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {isRegister && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--subtext)' }}>
                    Username
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="johndoe"
                    required={isRegister}
                  />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--subtext)' }}>
                  Email
                </label>
                <input
                  type="email"
                  className="login-input"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--subtext)' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="login-input login-input-pw"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--subtext)',
                      padding: 4,
                      display: 'flex',
                    }}
                  >
                    {showPw ? (
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                className="btn-primary"
                style={{
                  width: '100%',
                  borderRadius: 12,
                  padding: '14px 0',
                  fontSize: 14,
                  fontWeight: 600,
                  marginTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.8 : 1,
                  border: 'none',
                }}
              >
                {loading ? (
                  <>
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        border: '2px solid white',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                    Please wait…
                  </>
                ) : isRegister ? 'Create Account' : 'Sign In'}
              </button>

              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </form>

            {/* Switch mode */}
            <p style={{ textAlign: 'center', fontSize: 14, marginTop: 24, color: 'var(--subtext)' }}>
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                id="auth-switch-btn"
                onClick={switchMode}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: 'var(--teal)',
                  fontSize: 14,
                  padding: 0,
                  textDecoration: 'none',
                }}
                onMouseOver={e => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseOut={e => (e.currentTarget.style.textDecoration = 'none')}
              >
                {isRegister ? 'Sign In' : 'Register'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}