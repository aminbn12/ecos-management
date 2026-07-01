import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LiveDashboard from './components/LiveDashboard';
import FormBuilder from './components/FormBuilder';
import ScannerKiosk from './components/ScannerKiosk';
import EvaluationView from './components/EvaluationView';
import StudentProfile from './components/StudentProfile';
import TabletTaskView from './components/TabletTaskView';
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

// 2. Premium Login Screen
const LoginView = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#030712]">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-teal-500/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md glass-card p-8 rounded-3xl border border-gray-800 relative z-10 flex flex-col gap-6">
        {/* Crest Logo */}
        <div className="text-center flex flex-col items-center">
          <img src={LogoImage} alt="UM6SS Logo" className="h-16 w-auto object-contain bg-white/5 p-1.5 rounded-xl shadow-lg border border-gray-800" />
          <h2 className="text-xl font-extrabold text-gray-100 mt-4 tracking-tight">ECOS Dentaire UM6SS</h2>
          <p className="text-xs text-gray-400 mt-1">Faculté de Médecine Dentaire - Université Mohammed VI des Sciences de la Santé</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-300 font-semibold">Adresse Email Académique</label>
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
            <label className="text-xs text-gray-300 font-semibold">Mot de passe</label>
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
            <div className="p-3 bg-rose-950/40 border border-rose-500/25 rounded-xl text-xs text-rose-300 font-medium">
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold rounded-xl text-sm transition duration-150 mt-1"
          >
            {loading ? 'Connexion...' : 'Se Connecter'}
          </button>
        </form>

        {/* Quick simulator triggers */}
        <div className="border-t border-gray-800/80 pt-5 flex flex-col gap-3">
          <h4 className="text-xs text-gray-400 text-center font-bold uppercase tracking-wider">Simuler des Rôles (Démos)</h4>
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => handleQuickLogin('admin@um6ss.ma')}
              className="px-2 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-[10px] text-teal-400 font-bold rounded-xl transition duration-150"
            >
              👑 Admin
            </button>
            <button 
              onClick={() => handleQuickLogin('examiner@um6ss.ma')}
              className="px-2 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-[10px] text-cyan-400 font-bold rounded-xl transition duration-150"
            >
              📋 Examinateur
            </button>
            <button 
              onClick={() => handleQuickLogin('yassine.filali@student.um6ss.ma')}
              className="px-2 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-[10px] text-indigo-400 font-bold rounded-xl transition duration-150"
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
  <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
    <div className="glass-card p-8 rounded-3xl max-w-sm border border-red-500/10 text-center flex flex-col gap-4">
      <span className="text-4xl">🚫</span>
      <h2 className="text-lg font-bold text-red-400">Accès Refusé</h2>
      <p className="text-xs text-gray-400 leading-relaxed">
        Votre compte ne possède pas les habilitations nécessaires pour accéder à cette interface.
      </p>
      <Link to="/" className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs font-bold rounded-xl transition duration-150 border border-gray-850">
        Retour à l'accueil
      </Link>
    </div>
  </div>
);

// 4. Examiner Station Routing Wrapper
const ExaminerStationFlow = () => {
  const [activeScan, setActiveScan] = useState(null);

  if (activeScan) {
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
                <div className="flex flex-col">
                  {/* Internal Admin Navigation header */}
                  <div className="bg-cyan-950/20 border-b border-cyan-500/5 py-2.5 px-4 flex justify-center gap-6 text-xs font-bold uppercase">
                    <Link to="/admin/dashboard" className="text-cyan-400 hover:text-cyan-300">📈 Live Supervision</Link>
                    <Link to="/admin/form-builder" className="text-gray-400 hover:text-cyan-300">⚙️ Grilles Évaluation</Link>
                  </div>
                  <LiveDashboard />
                </div>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/form-builder" 
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <div className="flex flex-col">
                  <div className="bg-cyan-950/20 border-b border-cyan-500/5 py-2.5 px-4 flex justify-center gap-6 text-xs font-bold uppercase">
                    <Link to="/admin/dashboard" className="text-gray-400 hover:text-cyan-300">📈 Live Supervision</Link>
                    <Link to="/admin/form-builder" className="text-cyan-400 hover:text-cyan-300">⚙️ Grilles Évaluation</Link>
                  </div>
                  <FormBuilder />
                </div>
              </ProtectedRoute>
            } 
          />

          {/* Examiner routes */}
          <Route 
            path="/examiner/kiosk" 
            element={
              <ProtectedRoute allowedRoles={['admin_examiner', 'super_admin']}>
                <ExaminerStationFlow />
              </ProtectedRoute>
            } 
          />

          {/* Student routes */}
          <Route 
            path="/student/profile" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <div className="flex flex-col">
                  <div className="bg-indigo-950/20 border-b border-indigo-500/5 py-2.5 px-4 flex justify-center gap-6 text-xs font-bold uppercase">
                    <Link to="/student/profile" className="text-indigo-400 hover:text-indigo-300">🪪 Mon Code-Barres</Link>
                    <Link to="/student/tablet-task" className="text-gray-400 hover:text-indigo-300">📝 Examen Pratique</Link>
                  </div>
                  <StudentProfile />
                </div>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/tablet-task" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <div className="flex flex-col">
                  <div className="bg-indigo-950/20 border-b border-indigo-500/5 py-2.5 px-4 flex justify-center gap-6 text-xs font-bold uppercase">
                    <Link to="/student/profile" className="text-gray-400 hover:text-indigo-300">🪪 Mon Code-Barres</Link>
                    <Link to="/student/tablet-task" className="text-indigo-400 hover:text-indigo-300">📝 Examen Pratique</Link>
                  </div>
                  <TabletTaskView />
                </div>
              </ProtectedRoute>
            } 
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
