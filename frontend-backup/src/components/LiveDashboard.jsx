import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import LogoImage from '../assets/logo.png';

const LiveDashboard = () => {
  const { logout } = useAuth();
  const [progressions, setProgressions] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, jury: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterJury, setFilterJury] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Generate mock data for demo mode fallbacks
  const generateMockData = () => {
    return [
      {
        id: 1,
        status: 'in_progress',
        requires_jury_decision: false,
        student: { matricule: 'DENT-2026-001', user: { name: 'Sarah Benziane' } },
        current_station: { name: 'Suture Chirurgicale', step_number: 3, is_reserve: false },
        results: [
          { score: 14.5, passed: true, station: { name: 'Diagnostic Radiologique', step_number: 1, is_reserve: false } },
          { score: 16.0, passed: true, station: { name: 'Anesthésie Locale', step_number: 2, is_reserve: false } }
        ]
      },
      {
        id: 2,
        status: 'in_progress',
        requires_jury_decision: true,
        student: { matricule: 'DENT-2026-015', user: { name: 'Mehdi Bennani' } },
        current_station: { name: 'Préparation Cavitaire', step_number: 4, is_reserve: false },
        results: [
          { score: 15.0, passed: true, station: { name: 'Diagnostic Radiologique', step_number: 1, is_reserve: false } },
          { score: 7.0, passed: false, station: { name: 'Anesthésie Locale', step_number: 2, is_reserve: false } },
          { score: 8.5, passed: false, station: { name: 'Anesthésie Locale', step_number: 2, is_reserve: true } }, // Failed reserve!
          { score: 12.0, passed: true, station: { name: 'Suture Chirurgicale', step_number: 3, is_reserve: false } }
        ]
      },
      {
        id: 3,
        status: 'completed',
        requires_jury_decision: false,
        student: { matricule: 'DENT-2026-009', user: { name: 'Kenza Tazi' } },
        current_station: null,
        results: [
          { score: 18.0, passed: true, station: { name: 'Diagnostic Radiologique', step_number: 1, is_reserve: false } },
          { score: 14.0, passed: true, station: { name: 'Anesthésie Locale', step_number: 2, is_reserve: false } },
          { score: 15.5, passed: true, station: { name: 'Suture Chirurgicale', step_number: 3, is_reserve: false } },
          { score: 13.0, passed: true, station: { name: 'Préparation Cavitaire', step_number: 4, is_reserve: false } },
          { score: 17.5, passed: true, station: { name: 'Prothèse Fixe', step_number: 5, is_reserve: false } }
        ]
      },
      {
        id: 4,
        status: 'in_progress',
        requires_jury_decision: false,
        student: { matricule: 'DENT-2026-042', user: { name: 'Yassine Filali' } },
        current_station: { name: 'Anesthésie Locale', step_number: 2, is_reserve: true }, // Current is a reserve station!
        results: [
          { score: 11.5, passed: true, station: { name: 'Diagnostic Radiologique', step_number: 1, is_reserve: false } },
          { score: 9.0, passed: false, station: { name: 'Anesthésie Locale', step_number: 2, is_reserve: false } } // Failed step 2 initial
        ]
      }
    ];
  };

  const fetchData = async () => {
    try {
      const response = await axios.get('/api/admin/live-dashboard');
      setProgressions(response.data.progressions);
      calculateStats(response.data.progressions);
    } catch (e) {
      console.warn("API live-dashboard inaccessible, loaded demo simulation data.");
      const mock = generateMockData();
      setProgressions(mock);
      calculateStats(mock);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const total = data.length;
    const completed = data.filter(p => p.status === 'completed').length;
    const jury = data.filter(p => p.requires_jury_decision).length;
    const active = total - completed;
    setStats({ total, active, completed, jury });
  };

  useEffect(() => {
    fetchData();
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchData, 4000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const filteredProgressions = progressions.filter(p => {
    const matchesSearch = p.student.user.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.student.matricule.toLowerCase().includes(search.toLowerCase());
    const matchesJury = filterJury ? p.requires_jury_decision : true;
    return matchesSearch && matchesJury;
  });

  const getStepStatus = (studentProgression, stepNum) => {
    // Find results for this step
    const stepResults = studentProgression.results.filter(r => r.station.step_number === stepNum);
    
    if (stepResults.length === 0) {
      // Not reached yet
      if (studentProgression.status === 'completed') return 'skipped';
      return studentProgression.current_station?.step_number === stepNum ? 'current' : 'pending';
    }

    const hasFailedInitial = stepResults.some(r => !r.station.is_reserve && !r.passed);
    const hasPassedInitial = stepResults.some(r => !r.station.is_reserve && r.passed);
    const hasPassedReserve = stepResults.some(r => r.station.is_reserve && r.passed);
    const hasFailedReserve = stepResults.some(r => r.station.is_reserve && !r.passed);

    if (hasPassedInitial) return 'success';
    if (hasFailedInitial && hasPassedReserve) return 'passed_reserve';
    if (hasFailedReserve) return 'failed_reserve';
    if (hasFailedInitial && !hasPassedReserve) {
      // Currently on reserve
      return studentProgression.current_station?.step_number === stepNum && studentProgression.current_station?.is_reserve ? 'on_reserve' : 'failed_initial';
    }
    
    return 'pending';
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glass-card p-6 rounded-2xl relative overflow-hidden">
        <div className="shimmer-bg absolute inset-0 pointer-events-none opacity-20"></div>
        <div className="z-10 flex items-center gap-4">
          <img src={LogoImage} alt="UM6SS Logo" className="h-14 w-auto object-contain bg-white/5 p-1 rounded-lg" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                UM6SS - ECOS Live
              </h1>
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider glow-green">Direct</span>
            </div>
            <p className="text-gray-400 text-xs mt-1">Supervision en temps réel des examens cliniques objectifs structurés</p>
          </div>
        </div>

        <div className="flex gap-3 z-10 w-full sm:w-auto">
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-xl transition duration-200 border ${
              autoRefresh 
                ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30' 
                : 'bg-gray-900/60 text-gray-400 border-gray-800'
            }`}
          >
            {autoRefresh ? '⏱️ Rafraîchissement Activé' : '⏸️ Rafraîchissement Suspendu'}
          </button>
          <button 
            onClick={logout}
            className="px-4 py-2 bg-red-950/40 hover:bg-red-900/40 border border-red-500/20 text-red-300 text-xs font-semibold rounded-xl transition duration-150"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Stats Board */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Candidats Inscrits', value: stats.total, color: 'text-cyan-400', glow: 'glow-cyan', icon: '🎓' },
          { label: 'En Cours d\'Évaluation', value: stats.active, color: 'text-amber-400', glow: 'glow-orange', icon: '⚡' },
          { label: 'Examens Terminés', value: stats.completed, color: 'text-emerald-400', glow: 'glow-green', icon: '✅' },
          { label: 'Alertes Jury Requis', value: stats.jury, color: 'text-rose-500', glow: 'glow-red', icon: '🚨', alert: stats.jury > 0 }
        ].map((stat, idx) => (
          <div key={idx} className={`glass-card p-5 rounded-2xl border-l-4 ${stat.alert ? 'border-l-rose-500 animate-pulse' : 'border-l-cyan-500/60'} relative`}>
            <div className="text-2xl absolute top-4 right-4">{stat.icon}</div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
            <h2 className={`text-3xl font-extrabold mt-2 ${stat.color} ${stat.glow}`}>{stat.value}</h2>
          </div>
        ))}
      </section>

      {/* Main Panel */}
      <main className="glass-card rounded-2xl p-6 flex flex-col gap-6">
        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">🔍</span>
            <input 
              type="text" 
              placeholder="Rechercher par étudiant ou matricule..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full glass-input rounded-xl py-2.5 pl-10 pr-4 text-sm"
            />
          </div>
          
          <button 
            onClick={() => setFilterJury(!filterJury)}
            className={`px-5 py-2.5 rounded-xl border text-sm font-semibold transition duration-200 flex items-center justify-center gap-2 ${
              filterJury 
                ? 'bg-rose-950/40 text-rose-300 border-rose-500/50 glow-red' 
                : 'bg-gray-900/60 text-gray-300 border-gray-800 hover:border-cyan-500/30'
            }`}
          >
            ⚠️ Alertes Décisions Jury {stats.jury > 0 && <span className="px-1.5 py-0.5 text-xs bg-rose-600 text-white rounded-full font-bold">{stats.jury}</span>}
          </button>
        </div>

        {/* Dashboard Grid / Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider font-bold">
                <th className="py-4 px-4">Matricule</th>
                <th className="py-4 px-4">Étudiant</th>
                <th className="py-4 px-4">Étape Actuelle</th>
                <th className="py-4 px-4 text-center">Parcours (5 Étapes 5+5)</th>
                <th className="py-4 px-4 text-right">Statut / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-cyan-400 font-medium">Chargement des données...</td>
                </tr>
              ) : filteredProgressions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-500">Aucun étudiant ne correspond aux critères.</td>
                </tr>
              ) : (
                filteredProgressions.map((prog) => (
                  <tr key={prog.id} className="hover:bg-white/5 transition duration-150 group">
                    <td className="py-4 px-4 font-mono text-sm text-cyan-400">{prog.student.matricule}</td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-100 group-hover:text-white">{prog.student.user.name}</div>
                    </td>
                    <td className="py-4 px-4">
                      {prog.status === 'completed' ? (
                        <span className="text-xs bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold">
                          Terminé ✅
                        </span>
                      ) : prog.current_station ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-200">
                            {prog.current_station.name}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                            Étape {prog.current_station.step_number} 
                            {prog.current_station.is_reserve ? (
                              <span className="text-[10px] bg-amber-950/60 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-extrabold uppercase tracking-wide">
                                Réserve ⚠️
                              </span>
                            ) : (
                              <span className="text-[10px] bg-indigo-950/60 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.2 rounded font-extrabold uppercase tracking-wide">
                                Initiale
                              </span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Non commencé</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-3">
                        {[1, 2, 3, 4, 5].map((step) => {
                          const state = getStepStatus(prog, step);
                          let dotStyle = 'bg-gray-800 border-gray-700 text-gray-600';
                          let title = `Étape ${step}: En attente`;

                          if (state === 'success') {
                            dotStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10';
                            title = `Étape ${step}: Validée du premier coup`;
                          } else if (state === 'passed_reserve') {
                            dotStyle = 'bg-amber-500/25 border-amber-500 text-amber-400';
                            title = `Étape ${step}: Rattrapage validé`;
                          } else if (state === 'on_reserve') {
                            dotStyle = 'bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse border-dashed';
                            title = `Étape ${step}: Actuellement en rattrapage`;
                          } else if (state === 'failed_reserve') {
                            dotStyle = 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-md shadow-rose-500/10';
                            title = `Étape ${step}: Échec en rattrapage (Cas Jury)`;
                          } else if (state === 'current') {
                            dotStyle = 'bg-cyan-500/20 border-cyan-500 text-cyan-300 animate-pulse';
                            title = `Étape ${step}: Station active`;
                          }

                          return (
                            <div 
                              key={step} 
                              title={title}
                              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black relative ${dotStyle}`}
                            >
                              {step}
                              {/* Small connecting lines between step nodes */}
                              {step < 5 && (
                                <div className="absolute left-8 w-3 h-0.5 bg-gray-800 -z-10"></div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {prog.requires_jury_decision ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs bg-rose-950/80 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 animate-pulse">
                            🚨 Decision Jury Requise
                          </span>
                          <span className="text-[10px] text-gray-400">Rattrapage échoué</span>
                        </div>
                      ) : prog.status === 'completed' ? (
                        <span className="text-xs text-emerald-400 font-medium">Validé</span>
                      ) : (
                        <span className="text-xs text-cyan-400 font-medium">Progression fluide</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default LiveDashboard;
