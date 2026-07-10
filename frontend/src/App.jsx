import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
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
import AdminManager from './components/AdminManager';
import SettingsManager from './components/SettingsManager';
import LogoImage from './assets/logo.png';

// 1. Home Router Redirector
const HomeRedirect = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'super_admin':
    case 'admin':
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
  const [showPassword, setShowPassword] = useState(false);
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
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="glass-input px-4 py-2.5 pr-10 rounded-xl text-sm w-full"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition focus:outline-none flex items-center justify-center"
                title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M21 21l-18-18m18 18L3 3m18 18l-3-3m-9.75-9.75a3 3 0 003 3m5.176-5.176A10.478 10.478 0 0122.066 12c-1.292 4.337-5.31 7.5-10.066 7.5-1.258 0-2.468-.223-3.586-.63" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
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
  const [activeScan, setActiveScan] = useState(() => {
    const saved = localStorage.getItem('ecos_active_scan');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Error parsing saved active scan", e);
      return null;
    }
  });
  const [qcmStarted, setQcmStarted] = useState(false);
  const [startingQcm, setStartingQcm] = useState(false);

  // Reset local states and sync activeScan to localStorage when it changes
  React.useEffect(() => {
    setQcmStarted(false);
    setStartingQcm(false);
    if (activeScan) {
      localStorage.setItem('ecos_active_scan', JSON.stringify(activeScan));
    } else {
      localStorage.removeItem('ecos_active_scan');
    }
  }, [activeScan]);


  const handleStartQcm = async () => {
    setStartingQcm(true);
    try {
      await axios.post('/api/examiner/start-timer', {
        matricule: activeScan.student.matricule,
        station_id: activeScan.station.id
      });
      setQcmStarted(true);
    } catch (err) {
      console.warn("Backend start-timer offline, launching QCM locally.");
      setQcmStarted(true);
    } finally {
      setStartingQcm(false);
    }
  };

  if (activeScan) {
    if (activeScan.type === 'student_tablet') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-md mx-auto text-center gap-6 bg-[#030712]">
          <div className="glass-card p-8 rounded-3xl border border-cyan-500/20 w-full flex flex-col items-center gap-4 animate-scale-up">
            <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30">
              <span className="text-3xl text-cyan-400">💻</span>
            </div>
            
            <h2 className="text-xl font-bold text-cyan-400">
              {qcmStarted ? 'Lancement Activé' : 'Prêt pour le Lancement'}
            </h2>
            <p className="text-xs text-gray-400">
              {qcmStarted 
                ? "L'examen a été démarré et le chronomètre est actif sur l'écran du candidat." 
                : "L'étudiant a été identifié. Cliquez ci-dessous pour démarrer l'épreuve QCM."}
            </p>
            
            <div className="w-full bg-gray-900/60 p-4 rounded-2xl border border-gray-800 text-left flex flex-col gap-1">
              <span className="text-xs text-gray-500 font-bold uppercase">Candidat</span>
              <span className="text-sm font-semibold text-gray-200">{activeScan.student?.name} ({activeScan.student?.matricule})</span>
              
              <span className="text-xs text-gray-500 font-bold uppercase mt-3">Station Autonome</span>
              <span className="text-sm font-bold text-gray-200">{activeScan.station?.name}</span>
            </div>

            {qcmStarted ? (
              <button 
                onClick={() => setActiveScan(null)}
                className="w-full mt-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold rounded-xl text-sm transition duration-150"
              >
                Retour au Kiosque
              </button>
            ) : (
              <div className="flex gap-3 w-full mt-4">
                <button 
                  onClick={() => setActiveScan(null)}
                  className="flex-1 py-3 border border-gray-700 rounded-xl text-xs font-bold text-gray-400 hover:bg-white/5 transition"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleStartQcm}
                  disabled={startingQcm}
                  className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold rounded-xl text-xs shadow-lg transition"
                >
                  {startingQcm ? 'Lancement...' : '▶ Démarrer le QCM'}
                </button>
              </div>
            )}
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
        <HashRouter>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<LoginView />} />
            <Route path="/unauthorized" element={<UnauthorizedView />} />

            {/* Admin routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                  <AppShell>
                    <LiveDashboard />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/form-builder"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                  <AppShell>
                    <FormBuilder />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/examiners"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                  <AppShell>
                    <ExaminerManager />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                  <AppShell>
                    <StudentManager />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/history"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                  <AppShell>
                    <ExamHistory />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/administrators"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AppShell>
                    <AdminManager />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                  <AppShell>
                    <SettingsManager />
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
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
