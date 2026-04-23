import React, { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import ChatPage from './pages/ChatPage';

// Apply saved theme on mount (before render)
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ background: 'var(--bg)' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #128C7E, #25D366)' }}
          >
            <svg viewBox="0 0 48 48" fill="white" className="w-9 h-9">
              <path d="M24 4C12.95 4 4 12.95 4 24c0 3.57.93 6.91 2.55 9.8L4 44l10.47-2.52C17.2 43.11 20.52 44 24 44c11.05 0 20-8.95 20-20S35.05 4 24 4zm9.35 23.2c-.51-.25-3.02-1.49-3.49-1.66-.47-.17-.81-.25-1.15.25-.34.51-1.32 1.66-1.62 2-.3.34-.59.38-1.1.13-3.14-1.57-5.2-2.8-7.28-6.35-.55-.95.55-.88 1.57-2.92.17-.34.08-.63-.04-.88-.13-.25-1.15-2.77-1.57-3.79-.41-.99-.84-.85-1.15-.87-.3-.02-.64-.02-.98-.02-.34 0-.89.13-1.36.63-.47.51-1.78 1.74-1.78 4.25 0 2.51 1.82 4.93 2.07 5.27.25.34 3.58 5.47 8.68 7.67 5.1 2.2 5.1 1.47 6.02 1.38.92-.09 2.98-1.22 3.4-2.4.42-1.18.42-2.19.3-2.4-.13-.21-.47-.34-.98-.59z"/>
            </svg>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full typing-dot"
                  style={{ background: 'var(--teal)', animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>
            <p className="text-xs" style={{ color: 'var(--subtext)' }}>Loading…</p>
          </div>
        </div>
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={<PublicRoute><Login /></PublicRoute>}
            />
            <Route
              path="/"
              element={<ProtectedRoute><ChatPage /></ProtectedRoute>}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </SocketProvider>
    </AuthProvider>
  );
}
