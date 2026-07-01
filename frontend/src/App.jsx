import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import LiveDashboard from './components/LiveDashboard';
import FormBuilder from './components/FormBuilder';
import ExaminerManager from './components/ExaminerManager';
import StudentManager from './components/StudentManager';
import ScannerKiosk from './components/ScannerKiosk';
import EvaluationView from './components/EvaluationView';
import StudentProfile from './components/StudentProfile';
import TabletTaskView from './components/TabletTaskView';
import ExamHistory from './components/ExamHistory';
import LogoImage from './assets/logo.png';

// 1. Home Router Redirector
const HomeRedirect = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'super_admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'admin_examiner':
      return <Navigate to="/examiner/kiosk" replace />;
    case 'student':
      return <Navigate to="/student/profile" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

// 2. Login Screen
const LoginView = () => {
  const { login, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    if (!result.success) {
      setError(result.message);
      setLoading(false);
    }
  };

  const handleQuickLogin = async (roleEmail) => {
    setError('');
    setLoading(true);
    const result = await login(roleEmail, 'password');
    if (!result.success) {
      setError(result.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full blur-[100px] pointer-events-none" style={{ background: 'var(--gradient-bg-1)' }}></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none" style={{ background: 'var(--gradient-bg-2)' }}></div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="theme-toggle absolute top-4 right-4 z-20"
        title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="w-full max-w-md glass-card p-8 rounded-3xl relative z-10 flex flex-col gap-6 animate-scale-up">
        {/* Crest Logo */}
        <div className="text-center flex flex-col items-center">
          <img
            src={LogoImage}
            alt="UM6SS Logo"
            className="h-16 w-auto object-contain p-1.5 rounded-xl shadow-lg"
            style={{
              background: theme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
              border: '1px solid var(--color-card-border)'
            }}
          />
          <h2 className="text-xl font-extrabold mt-4 tracking-tight t-text-heading">ECOS Dentaire UM6SS</h2>
          <p className="text-xs t-text-secondary mt-1">Faculté de Médecine Dentaire — Université Mohammed VI des Sciences de la Santé</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs t-text-secondary font-semibold">Adresse Email Académique</label>
            <input
              type="email"
              placeholder="votre.email@um6ss.ma"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="glass-input px-4 py-2.5 rounded-xl text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs t-text-secondary font-semibold">Mot de passe</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="glass-input px-4 py-2.5 rounded-xl text-sm"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl text-xs font-medium" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid transparent' }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold rounded-xl text-sm transition duration-150 mt-1 shadow-lg shadow-teal-500/20"
          >
            {loading ? 'Connexion...' : 'Se Connecter'}
          </button>
        </form>

        {/* Quick simulator triggers */}
        <div className="pt-5 flex flex-col gap-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <h4 className="text-xs t-text-muted text-center font-bold uppercase tracking-wider">Accès Rapide (Démo)</h4>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickLogin('admin@um6ss.ma')}
              className="glass-card px-2 py-2.5 text-[10px] font-bold rounded-xl transition duration-150 hover:border-teal-500/30"
              style={{ color: 'var(--color-accent)' }}
            >
              👑 Admin
            </button>
            <button
              onClick={() => handleQuickLogin('examiner@um6ss.ma')}
              className="glass-card px-2 py-2.5 text-[10px] font-bold rounded-xl transition duration-150 hover:border-cyan-500/30 text-cyan-500"
            >
              📋 Examinateur
            </button>
            <button
              onClick={() => handleQuickLogin('yassine.filali@student.um6ss.ma')}
              className="glass-card px-2 py-2.5 text-[10px] font-bold rounded-xl transition duration-150 hover:border-indigo-500/30 text-indigo-500"
            >
              🎓 Étudiant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 3. Unauthorized Screen
const UnauthorizedView = () => (
  <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
    <div className="glass-card p-8 rounded-3xl max-w-sm text-center flex flex-col gap-4 animate-scale-up">
      <span className="text-4xl">🚫</span>
      <h2 className="text-lg font-bold" style={{ color: 'var(--color-danger)' }}>Accès Refusé</h2>
      <p className="text-xs t-text-secondary leading-relaxed">
        Votre compte ne possède pas les habilitations nécessaires pour accéder à cette interface.
      </p>
      <Link to="/" className="w-full py-2 glass-card t-text-secondary text-xs font-bold rounded-xl transition duration-150 block text-center">
        Retour à l'accueil
      </Link>
    </div>
  </div>
);

// 4. Examiner Station Routing Wrapper
const ExaminerStationFlow = () => {
  const [activeScan, setActiveScan] = useState(null);

  if (activeScan) {
    if (activeScan.type === 'student_tablet') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-md mx-auto text-center gap-6 bg-[#030712]">
          <div className="glass-card p-8 rounded-3xl border border-cyan-500/20 w-full flex flex-col items-center gap-4 animate-scale-up">
            <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30">
              <span className="text-3xl text-cyan-400">💻</span>
            </div>
            
            <h2 className="text-xl font-bold text-cyan-400">Lancement Activé</h2>
            <p className="text-xs text-gray-400">
              L'examen a été lancé automatiquement sur la tablette de l'étudiant.
            </p>
            
            <div className="w-full bg-gray-900/60 p-4 rounded-2xl border border-gray-800 text-left flex flex-col gap-1">
              <span className="text-xs text-gray-500 font-bold uppercase">Candidat</span>
              <span className="text-sm font-semibold text-gray-200">{activeScan.student?.name} ({activeScan.student?.matricule})</span>
              
              <span className="text-xs text-gray-500 font-bold uppercase mt-3">Station Autonome</span>
              <span className="text-sm font-bold text-gray-200">{activeScan.station?.name}</span>
            </div>

            <button 
              onClick={() => setActiveScan(null)}
              className="w-full mt-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold rounded-xl text-sm transition duration-150"
            >
              Retour au Kiosque
            </button>
          </div>
        </div>
      );
    }

    return (
      <EvaluationView 
        scanData={activeScan} 
        onBackToKiosk={() => setActiveScan(null)} 
      />
    );
  }

  return (
    <ScannerKiosk 
      onScanSuccess={(data) => setActiveScan(data)} 
    />
  );
};

// Main App Router
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<LoginView />} />
            <Route path="/unauthorized" element={<UnauthorizedView />} />

            {/* Admin routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AppShell>
                    <LiveDashboard />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/form-builder"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AppShell>
                    <FormBuilder />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/examiners"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AppShell>
                    <ExaminerManager />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AppShell>
                    <StudentManager />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/history"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AppShell>
                    <ExamHistory />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Examiner routes */}
            <Route
              path="/examiner/kiosk"
              element={
                <ProtectedRoute allowedRoles={['admin_examiner', 'super_admin']}>
                  <AppShell>
                    <ExaminerStationFlow />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Student routes */}
            <Route
              path="/student/profile"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <AppShell>
                    <StudentProfile />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/tablet-task"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <AppShell>
                    <TabletTaskView />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
