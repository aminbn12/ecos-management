import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import LogoImage from '../assets/logo.png';

const roleConfig = {
  super_admin: {
    label: 'Super Admin',
    links: [
      { to: '/admin/dashboard', label: 'Live Supervision', icon: '📈' },
      { to: '/admin/form-builder', label: 'Grilles Évaluation', icon: '📋' },
      { to: '/admin/students', label: 'Étudiants', icon: '🎓' },
      { to: '/admin/examiners', label: 'Examinateurs', icon: '👥' },
      { to: '/admin/history', label: 'Historique & Rapports', icon: '📜' },
      { to: '/admin/administrators', label: 'Administrateurs', icon: '🔑' },
      { to: '/admin/settings', label: 'Paramètres', icon: '⚙️' },
    ],
  },
  admin: {
    label: 'Administrateur',
    links: [
      { to: '/admin/dashboard', label: 'Live Supervision', icon: '📈' },
      { to: '/admin/form-builder', label: 'Grilles Évaluation', icon: '📋' },
      { to: '/admin/students', label: 'Étudiants', icon: '🎓' },
      { to: '/admin/examiners', label: 'Examinateurs', icon: '👥' },
      { to: '/admin/history', label: 'Historique & Rapports', icon: '📜' },
      { to: '/admin/settings', label: 'Paramètres', icon: '⚙️' },
    ],
  },
  admin_examiner: {
    label: 'Examinateur',
    links: [
      { to: '/examiner/kiosk', label: 'Kiosque de Scan', icon: '📋' },
    ],
  },
  student: {
    label: 'Étudiant',
    links: [
      { to: '/student/profile', label: 'Mon QR Code', icon: '🪪' },
      { to: '/student/tablet-task', label: 'Examen Pratique', icon: '📝' },
    ],
  },
};

const AppShell = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [examInProgress, setExamInProgress] = useState(() => {
    return localStorage.getItem('student_exam_in_progress') === 'true';
  });

  useEffect(() => {
    const handleStatus = (e) => {
      const inProgress = !!e.detail?.inProgress;
      setExamInProgress(inProgress);
      localStorage.setItem('student_exam_in_progress', inProgress ? 'true' : 'false');
    };
    window.addEventListener('student-status-changed', handleStatus);
    return () => window.removeEventListener('student-status-changed', handleStatus);
  }, []);

  const config = roleConfig[user?.role] || roleConfig.student;

  const closeSidebar = () => setSidebarOpen(false);
  const toggleCollapse = () => setSidebarCollapsed(prev => !prev);

  const sidebarWidth = sidebarCollapsed ? '64px' : '260px';

  return (
    <div className="min-h-screen flex flex-col">
      {/* ===== FIXED TOP NAVBAR ===== */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 md:px-4"
        style={{
          height: '56px',
          background: 'var(--color-nav-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--color-nav-border)',
        }}
      >
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center t-text-secondary lg:hidden"
            style={{ border: '1px solid var(--color-border)' }}
            aria-label="Menu"
          >
            <span className="text-lg">☰</span>
          </button>
          <img src={LogoImage} alt="UM6SS" className="h-7 w-auto rounded-lg" />
          <div>
            <h1 className="text-sm font-extrabold t-text-heading leading-tight">ECOS Dentaire</h1>
            <p className="text-[9px] t-text-muted font-medium">UM6SS</p>
          </div>
        </div>

        {/* Right: Theme + Profile + Logout */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ border: '1px solid var(--color-card-border)', background: 'var(--color-surface)' }}
            title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <div className="h-6 w-[1px]" style={{ background: 'var(--color-border)' }}></div>

          {/* Profile Section */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl" style={{ border: '1px solid var(--color-card-border)', background: 'var(--color-surface)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0" style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent)' }}>
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold t-text-heading leading-tight truncate max-w-[120px]">{user?.name || 'Utilisateur'}</span>
              <span className="text-[9px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full text-center" style={{
                background: user?.role === 'super_admin' || user?.role === 'admin' ? 'rgba(20, 184, 166, 0.15)' : user?.role === 'admin_examiner' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                color: user?.role === 'super_admin' || user?.role === 'admin' ? '#0D9488' : user?.role === 'admin_examiner' ? '#0891B2' : '#6366F1',
              }}>
                {config.label}
              </span>
            </div>
          </div>

          {(!user || user.role !== 'student' || !examInProgress) && (
            <>
              <div className="hidden sm:block h-6 w-[1px]" style={{ background: 'var(--color-border)' }}></div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="h-9 px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all duration-150"
                style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid transparent' }}
                title="Déconnexion"
              >
                <span>🚪</span>
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ===== UNDER NAVBAR WRAPPER (Horizontal Row) ===== */}
      <div className="flex flex-1 pt-[56px]">
        {/* ===== SIDEBAR OVERLAY (mobile) ===== */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden" onClick={closeSidebar}></div>
        )}

        {/* ===== SIDEBAR ===== */}
        <aside
          className={`fixed top-0 left-0 lg:top-[56px] z-50 h-full lg:h-[calc(100vh-56px)] flex flex-col transition-all duration-300 ease-in-out lg:sticky lg:z-auto ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}
          style={{
            width: sidebarOpen ? '260px' : sidebarWidth,
            background: 'var(--color-bg)',
            borderRight: '1px solid var(--color-border)',
          }}
        >
          {/* Sidebar Header with collapse toggle */}
          <div className="flex items-center justify-between px-3 py-3" style={{ borderBottom: '1px solid var(--color-border)', minHeight: '56px' }}>
            {sidebarOpen ? (
              <div className="flex items-center gap-2 overflow-hidden">
                <img src={LogoImage} alt="UM6SS" className="h-6 w-auto rounded" />
                <span className="text-xs font-bold t-text-heading truncate">ECOS Dentaire</span>
              </div>
            ) : (
              !sidebarCollapsed && (
                <span className="text-xs font-extrabold t-text-muted uppercase tracking-wider px-2">Navigation</span>
              )
            )}
            <div className="flex items-center gap-1 ml-auto">
              {sidebarOpen && (
                <button onClick={closeSidebar} className="w-7 h-7 rounded-lg flex items-center justify-center t-text-secondary lg:hidden" style={{ border: '1px solid var(--color-border)' }}>
                  ✕
                </button>
              )}
              <button
                onClick={toggleCollapse}
                className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center t-text-secondary hover:t-text-heading"
                style={{ border: '1px solid var(--color-border)' }}
                title={sidebarCollapsed ? 'Développer le menu' : 'Réduire le menu'}
              >
                <span className="text-[10px] transition-transform duration-300" style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}>◀</span>
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-2 py-3">
            {!sidebarCollapsed && (
              <p className="text-[9px] t-text-muted font-bold uppercase tracking-wider px-2 mb-2">Menu</p>
            )}
            <div className="flex flex-col gap-0.5">
              {config.links.map(link => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={closeSidebar}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? 'text-white shadow-sm'
                        : 't-text-secondary hover:t-text-heading hover:bg-black/5 dark:hover:bg-white/5'
                    } ${sidebarCollapsed ? 'justify-center px-0 py-3' : ''}`}
                    style={isActive ? { background: 'var(--color-accent)' } : {}}
                    title={sidebarCollapsed ? link.label : undefined}
                  >
                    <span className="text-lg flex-shrink-0">{link.icon}</span>
                    {!sidebarCollapsed && <span className="truncate text-xs">{link.label}</span>}
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;