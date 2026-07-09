import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import LogoImage from '../assets/logo.png';

const LiveDashboard = () => {
  const { logout } = useAuth();
  const [progressions, setProgressions] = useState([]);
  const [stations, setStations] = useState([]);
  const [viewMode, setViewMode] = useState('students'); // 'students' or 'stations'
  const [selectedStationDetails, setSelectedStationDetails] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, jury: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterJury, setFilterJury] = useState(false);

  const queryParams = new URLSearchParams(window.location.search);
  const urlExamId = queryParams.get('exam_id');
  const isVisualizationMode = !!urlExamId;

  const [autoRefresh, setAutoRefresh] = useState(!isVisualizationMode);
  const [activeExam, setActiveExam] = useState(null);

  const formatDuration = (seconds) => {
    if (seconds === undefined || seconds === null || isNaN(seconds)) return '-';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  };

  // Generate mock data for demo mode fallbacks
  const generateMockData = () => {
    return [
      {
        id: 1,
        status: 'in_progress',
        requires_jury_decision: false,
        student: { id: 1, matricule: 'DENT-2026-001', user: { name: 'Sarah Benziane' } },
        current_station: { name: 'Suture Chirurgicale', step_number: 3, is_reserve: false },
        results: [
          { score: 14.5, passed: true, exam_progression_id: 1, station_id: 1, station: { id: 1, name: 'Diagnostic Radiologique', step_number: 1, is_reserve: false } },
          { score: 16.0, passed: true, exam_progression_id: 1, station_id: 2, station: { id: 2, name: 'Anesthésie Locale', step_number: 2, is_reserve: false } }
        ]
      },
      {
        id: 2,
        status: 'in_progress',
        requires_jury_decision: true,
        student: { id: 2, matricule: 'DENT-2026-015', user: { name: 'Mehdi Bennani' } },
        current_station: { name: 'Préparation Cavitaire', step_number: 4, is_reserve: false },
        results: [
          { score: 15.0, passed: true, exam_progression_id: 2, station_id: 1, station: { id: 1, name: 'Diagnostic Radiologique', step_number: 1, is_reserve: false } },
          { score: 7.0, passed: false, exam_progression_id: 2, station_id: 2, station: { id: 2, name: 'Anesthésie Locale', step_number: 2, is_reserve: false } },
          { score: 8.5, passed: false, exam_progression_id: 2, station_id: 6, station: { id: 6, name: 'Anesthésie Locale (R)', step_number: 2, is_reserve: true } },
          { score: 12.0, passed: true, exam_progression_id: 2, station_id: 3, station: { id: 3, name: 'Suture Chirurgicale', step_number: 3, is_reserve: false } }
        ]
      },
      {
        id: 3,
        status: 'completed',
        requires_jury_decision: false,
        student: { id: 3, matricule: 'DENT-2026-009', user: { name: 'Kenza Tazi' } },
        current_station: null,
        results: [
          { score: 18.0, passed: true, exam_progression_id: 3, station_id: 1, station: { id: 1, name: 'Diagnostic Radiologique', step_number: 1, is_reserve: false } },
          { score: 14.0, passed: true, exam_progression_id: 3, station_id: 2, station: { id: 2, name: 'Anesthésie Locale', step_number: 2, is_reserve: false } },
          { score: 15.5, passed: true, exam_progression_id: 3, station_id: 3, station: { id: 3, name: 'Suture Chirurgicale', step_number: 3, is_reserve: false } },
          { score: 13.0, passed: true, exam_progression_id: 3, station_id: 4, station: { id: 4, name: 'Préparation Cavitaire', step_number: 4, is_reserve: false } },
          { score: 17.5, passed: true, exam_progression_id: 3, station_id: 5, station: { id: 5, name: 'Prothèse Fixe', step_number: 5, is_reserve: false } }
        ]
      },
      {
        id: 4,
        status: 'in_progress',
        requires_jury_decision: false,
        student: { id: 4, matricule: 'DENT-2026-042', user: { name: 'Yassine Filali' } },
        current_station: { name: 'Anesthésie Locale', step_number: 2, is_reserve: true },
        results: [
          { score: 11.5, passed: true, exam_progression_id: 4, station_id: 1, station: { id: 1, name: 'Diagnostic Radiologique', step_number: 1, is_reserve: false } },
          { score: 9.0, passed: false, exam_progression_id: 4, station_id: 2, station: { id: 2, name: 'Anesthésie Locale', step_number: 2, is_reserve: false } }
        ]
      }
    ];
  };

  const generateMockStations = () => {
    return [
      { id: 1, name: 'Diagnostic Radiologique', step_number: 1, is_reserve: false, type: 'examiner_eval', examiner: { name: 'Dr. Sofia Alami' } },
      { id: 2, name: 'Anesthésie Locale', step_number: 2, is_reserve: false, type: 'examiner_eval', examiner: { name: 'Dr. Bennani' } },
      { id: 3, name: 'Suture Chirurgicale', step_number: 3, is_reserve: false, type: 'examiner_eval', examiner: { name: 'Dr. Tazi' } },
      { id: 4, name: 'Préparation Cavitaire', step_number: 4, is_reserve: false, type: 'examiner_eval', examiner: { name: 'Dr. Sofia Alami' } },
      { id: 5, name: 'Prothèse Fixe', step_number: 5, is_reserve: false, type: 'examiner_eval', examiner: { name: 'Dr. Bennani' } },
      { id: 6, name: 'Anesthésie Locale (R)', step_number: 2, is_reserve: true, type: 'examiner_eval', examiner: { name: 'Dr. Tazi' } }
    ];
  };

  const fetchData = async () => {
    try {
      const url = urlExamId 
        ? `/api/admin/live-dashboard?exam_id=${urlExamId}`
        : '/api/admin/live-dashboard';
      const response = await axios.get(url);
      setProgressions(response.data.progressions);
      setStations(response.data.stations || []);
      setActiveExam(response.data.active_exam);
      calculateStats(response.data.progressions);
    } catch (e) {
      console.warn("API live-dashboard inaccessible, loaded demo simulation data.");
      const mock = generateMockData();
      setProgressions(mock);
      setStations(generateMockStations());
      calculateStats(mock);
      setActiveExam({ 
        id: urlExamId ? parseInt(urlExamId) : 1, 
        title: urlExamId ? `Examen Archivé (Démo ${urlExamId})` : 'Examen de Démo', 
        status: urlExamId ? 'completed' : 'active' 
      });
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
    const stepResults = studentProgression.results.filter(r => r.station.step_number === stepNum);
    
    if (stepResults.length === 0) {
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
      return studentProgression.current_station?.step_number === stepNum && studentProgression.current_station?.is_reserve ? 'on_reserve' : 'failed_initial';
    }
    
    return 'pending';
  };

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto animate-fade-in" style={{ minHeight: 'calc(100vh - 60px)' }}>
      {/* Sub-Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glass-card p-5 rounded-2xl relative overflow-hidden">
        <div className="z-10 flex items-center gap-3">
          <span className="flex h-3.5 w-3.5 relative">
            {!isVisualizationMode && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeExam ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
            )}
            <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${isVisualizationMode ? 'bg-cyan-500' : (activeExam ? 'bg-emerald-500' : 'bg-rose-500')}`}></span>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold t-text-heading">
                {isVisualizationMode ? 'Consultation d\'Archive' : (activeExam ? 'Supervision en Direct' : 'Supervision en Direct hors ligne')}
              </h2>
              {isVisualizationMode ? (
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider bg-cyan-500/10 px-1.5 py-0.5 rounded">Archive</span>
              ) : activeExam ? (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded">Direct</span>
              ) : (
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider bg-rose-500/10 px-1.5 py-0.5 rounded">Hors-ligne</span>
              )}
            </div>
            <p className="t-text-secondary text-xs mt-0.5">
              {isVisualizationMode 
                ? `Données figées en lecture seule — Session : ${activeExam?.title}` 
                : (activeExam ? `Mises à jour automatiques — Session : ${activeExam.title}` : "Aucune session d'examen n'est active actuellement")}
            </p>
          </div>
        </div>

        <div className="flex gap-3 z-10 w-full sm:w-auto">
          {!isVisualizationMode && activeExam && (
            <button 
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-xl transition duration-200 border`}
              style={{
                background: autoRefresh ? 'var(--color-accent-bg)' : 'transparent',
                color: autoRefresh ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                borderColor: autoRefresh ? 'var(--color-accent)' : 'var(--color-border)'
              }}
            >
              {autoRefresh ? '⏱️ Auto-Refresh Activé' : '⏸️ Auto-Refresh Suspendu'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center text-sm font-medium t-text-secondary rounded-2xl">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}></div>
          Chargement des données de supervision...
        </div>
      ) : activeExam ? (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Candidats Inscrits', value: stats.total, color: 'text-cyan-600 dark:text-cyan-400', icon: '🎓' },
              { label: "En Cours d'Évaluation", value: stats.active, color: 'text-amber-600 dark:text-amber-400', icon: '⚡' },
              { label: 'Examens Terminés', value: stats.completed, color: 'text-emerald-600 dark:text-emerald-400', icon: '✅' },
              { label: 'Alertes Jury Requis', value: stats.jury, color: 'text-rose-600 dark:text-rose-400', icon: '🚨', alert: stats.jury > 0 }
            ].map((stat, idx) => (
              <div 
                key={idx} 
                className={`glass-card p-5 rounded-2xl border-l-4 relative ${stat.alert ? 'animate-pulse' : ''}`}
                style={{ borderLeftColor: stat.alert ? 'var(--color-danger)' : 'var(--color-accent)' }}
              >
                <div className="text-2xl absolute top-4 right-4">{stat.icon}</div>
                <p className="t-text-secondary text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                <h2 className={`text-3xl font-extrabold mt-2 ${stat.color}`}>{stat.value}</h2>
              </div>
            ))}
          </section>

          <main className="glass-card rounded-2xl p-6 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative flex-1 w-full">
                <span className="absolute inset-y-0 left-3 flex items-center t-text-secondary">🔍</span>
                <input 
                  type="text" 
                  placeholder="Rechercher par étudiant ou matricule..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full glass-input rounded-xl py-2.5 pl-10 pr-4 text-sm"
                />
              </div>

              <div className="flex p-1.5 rounded-xl border self-stretch md:self-auto justify-center" style={{ background: 'var(--color-bg-alt)', borderColor: 'var(--color-border)' }}>
                <button
                  onClick={() => setViewMode('students')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition duration-150 flex items-center gap-1.5 ${viewMode === 'students' ? 'bg-cyan-600 text-white font-bold shadow-md' : 't-text-secondary hover:t-text-heading'}`}
                >
                  <span>👤</span> Candidats
                </button>
                <button
                  onClick={() => setViewMode('stations')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition duration-150 flex items-center gap-1.5 ${viewMode === 'stations' ? 'bg-cyan-600 text-white font-bold shadow-md' : 't-text-secondary hover:t-text-heading'}`}
                >
                  <span>🏢</span> Stations
                </button>
              </div>
              
              <button 
                onClick={() => setFilterJury(!filterJury)}
                className="w-full md:w-auto px-5 py-2.5 rounded-xl border text-sm font-semibold transition duration-200 flex items-center justify-center gap-2"
                style={{
                  background: filterJury ? 'var(--color-danger-bg)' : 'transparent',
                  color: filterJury ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                  borderColor: filterJury ? 'var(--color-danger)' : 'var(--color-border)'
                }}
              >
                ⚠️ Alertes Décisions Jury {stats.jury > 0 && <span className="px-1.5 py-0.5 text-xs bg-rose-600 text-white rounded-full font-bold">{stats.jury}</span>}
              </button>
            </div>

            {viewMode === 'students' ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-wider font-bold t-text-secondary" style={{ borderColor: 'var(--color-border)' }}>
                      <th className="py-4 px-4">Matricule</th>
                      <th className="py-4 px-4">Étudiant</th>
                      <th className="py-4 px-4">Étape Actuelle</th>
                      <th className="py-4 px-4 text-center">Parcours (5 Étapes)</th>
                      <th className="py-4 px-4 text-center">Note Moyenne</th>
                      <th className="py-4 px-4 text-center">Temps Moyen</th>
                      <th className="py-4 px-4 text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                    {filteredProgressions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-12 text-center t-text-muted">Aucun étudiant ne correspond aux critères.</td>
                      </tr>
                    ) : (
                      filteredProgressions.map((prog) => (
                        <tr key={prog.id} className="transition duration-150 hover:bg-black/5 dark:hover:bg-white/5">
                          <td className="py-4 px-4 font-mono text-sm" style={{ color: 'var(--color-accent)' }}>{prog.student.matricule}</td>
                          <td className="py-4 px-4">
                            <div className="font-semibold t-text-heading">{prog.student.user.name}</div>
                          </td>
                          <td className="py-4 px-4">
                            {prog.status === 'completed' ? (
                              <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold">
                                Terminé ✅
                              </span>
                            ) : prog.current_station ? (
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold t-text-heading">
                                  {prog.current_station.name}
                                </span>
                                <span className="text-xs t-text-secondary flex items-center gap-1.5 mt-0.5">
                                  Étape {prog.current_station.step_number} 
                                  {prog.current_station.is_reserve ? (
                                    <span className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-extrabold uppercase tracking-wide">
                                      Réserve ⚠️
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-1.5 py-0.2 rounded font-extrabold uppercase tracking-wide">
                                      Initiale
                                    </span>
                                  )}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs t-text-muted">Non commencé</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-3">
                              {[1, 2, 3, 4, 5].map((step) => {
                                const state = getStepStatus(prog, step);
                                let dotStyle = '';
                                let customBorder = 'var(--color-border)';
                                let customBg = 'transparent';
                                let textColor = 'var(--color-text-muted)';
                                let title = `Étape ${step}: En attente`;
        
                                if (state === 'success') {
                                  customBorder = 'rgba(16, 185, 129, 0.4)';
                                  customBg = 'rgba(16, 185, 129, 0.1)';
                                  textColor = 'var(--color-success)';
                                  title = `Étape ${step}: Validée du premier coup`;
                                } else if (state === 'passed_reserve') {
                                  customBorder = 'rgba(245, 158, 11, 0.4)';
                                  customBg = 'rgba(245, 158, 11, 0.1)';
                                  textColor = 'var(--color-warning)';
                                  title = `Étape ${step}: Rattrapage validé`;
                                } else if (state === 'on_reserve') {
                                  customBorder = 'rgba(245, 158, 11, 0.6)';
                                  customBg = 'rgba(245, 158, 11, 0.05)';
                                  textColor = 'var(--color-warning)';
                                  title = `Étape ${step}: Actuellement en rattrapage`;
                                  dotStyle = 'animate-pulse';
                                } else if (state === 'failed_reserve') {
                                  customBorder = 'rgba(239, 68, 68, 0.4)';
                                  customBg = 'rgba(239, 68, 68, 0.1)';
                                  textColor = 'var(--color-danger)';
                                  title = `Étape ${step}: Échec en rattrapage (Cas Jury)`;
                                } else if (state === 'current') {
                                  customBorder = 'var(--color-accent)';
                                  customBg = 'var(--color-accent-bg)';
                                  textColor = 'var(--color-accent)';
                                  title = `Étape ${step}: Station active`;
                                  dotStyle = 'animate-pulse';
                                }
        
                                return (
                                  <div 
                                    key={step} 
                                    title={title}
                                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black relative ${dotStyle}`}
                                    style={{ borderColor: customBorder, background: customBg, color: textColor }}
                                  >
                                    {step}
                                    {step < 5 && (
                                      <div className="absolute left-8 w-3 h-0.5 -z-10" style={{ background: 'var(--color-border)' }}></div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {(() => {
                              const completed = prog.results || [];
                              if (completed.length === 0) return <span className="t-text-muted font-medium">-</span>;
                              const sum = completed.reduce((acc, r) => acc + parseFloat(r.score), 0);
                              const avg = (sum / completed.length).toFixed(2);
                              return <span className="font-extrabold" style={{ color: 'var(--color-accent)' }}>{avg} / 20</span>;
                            })()}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {(() => {
                              const completed = prog.results || [];
                              if (completed.length === 0) return <span className="t-text-muted font-medium">-</span>;
                              const totalDuration = completed.reduce((acc, r) => acc + (r.duration || 0), 0);
                              const avgDuration = totalDuration / completed.length;
                              return <span className="font-semibold">{formatDuration(avgDuration)}</span>;
                            })()}
                          </td>
                          <td className="py-4 px-4 text-right">
                            {prog.requires_jury_decision ? (
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-xs px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 animate-pulse" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                                  🚨 Decision Jury Requise
                                </span>
                                <span className="text-[10px] t-text-muted">Rattrapage échoué</span>
                              </div>
                            ) : prog.status === 'completed' ? (
                              <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>Validé</span>
                            ) : (
                              <span className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>Progression fluide</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
                {stations.map(st => {
                  const stationResults = progressions.flatMap(p => p.results || []).filter(r => r.station_id === st.id);
                  const studentCount = stationResults.length;
                  const passCount = stationResults.filter(r => r.passed).length;
                  const passRate = studentCount > 0 ? ((passCount / studentCount) * 100).toFixed(1) : '0.0';
    
                  return (
                    <div 
                      key={st.id}
                      onClick={() => {
                        const detailedResults = stationResults.map(r => {
                          const prog = progressions.find(p => p.id === r.exam_progression_id);
                          return {
                            id: r.id,
                            score: r.score,
                            passed: r.passed,
                            remarks: r.remarks,
                            student_name: prog?.student?.user?.name || 'Inconnu',
                            matricule: prog?.student?.matricule || 'Inconnu'
                          };
                        });
                        setSelectedStationDetails({
                          station: st,
                          results: detailedResults
                        });
                      }}
                      className="glass-card p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between min-h-[170px]"
                      style={{ borderColor: 'var(--color-card-border)' }}
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-start gap-3">
                          <span className="text-[10px] px-2 py-0.5 rounded font-extrabold uppercase tracking-wide" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-text-secondary)' }}>
                            Étape {st.step_number} {st.is_reserve ? '(Réserve)' : '(Initiale)'}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase tracking-wide`} style={{ background: st.type === 'student_tablet' ? 'var(--color-accent-bg)' : 'rgba(20, 184, 166, 0.1)', color: st.type === 'student_tablet' ? 'var(--color-accent)' : 'var(--color-accent)' }}>
                            {st.type === 'student_tablet' ? '📱 Tablette' : '🖐️ Praticien'}
                          </span>
                        </div>
    
                        <h3 className="text-base font-extrabold t-text-heading mt-1">{st.name}</h3>
                        
                        <p className="text-xs flex items-center gap-1.5 mt-0.5">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold" style={{ background: '#0E7490', color: '#fff' }}>E</span> <b style={{ color: '#0E7490' }}>Examinateur :</b> <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{st.examiner ? st.examiner.name : 'Non assigné'}</span>
                        </p>
                      </div>
    
                      <div className="flex justify-between items-center border-t pt-3 mt-4" style={{ borderColor: 'var(--color-border)' }}>
                        <div>
                          <span className="text-[9px] t-text-muted block uppercase">Taux de Réussite</span>
                          <span className="text-sm font-extrabold" style={{ color: parseFloat(passRate) >= 50 ? 'var(--color-success)' : 'var(--color-danger)' }}>{passRate}%</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] t-text-muted block uppercase">Évalués</span>
                          <span className="text-sm font-extrabold t-text-heading">{studentCount} cand.</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </>
      ) : (
        <div className="glass-card p-12 text-center rounded-2xl border" style={{ borderColor: 'var(--color-border)' }}>
          <span className="text-4xl block mb-3">📴</span>
          <h3 className="text-base font-extrabold t-text-heading">Supervision en veille</h3>
          <p className="text-xs t-text-secondary mt-1.5 max-w-sm mx-auto leading-relaxed">
            Aucun examen n'est actuellement actif. Pour démarrer la supervision en direct, veuillez activer un examen dans l'onglet <strong>📜Historique & Rapports</strong>.
          </p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedStationDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-2xl w-full max-h-[85vh] rounded-3xl flex flex-col overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-6 flex justify-between items-start gap-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <span className="text-[10px] px-2 py-0.5 rounded font-extrabold uppercase tracking-wide" style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent)' }}>
                  Détails Station
                </span>
                <h3 className="text-xl font-extrabold t-text-heading mt-1.5">
                  {selectedStationDetails.station.name}
                </h3>
                <p className="text-xs t-text-secondary mt-1">
                  Étape {selectedStationDetails.station.step_number} | {selectedStationDetails.station.is_reserve ? 'Réserve' : 'Initiale'} | Examinateur: <b>{selectedStationDetails.station.examiner?.name || 'Non assigné'}</b>
                </p>
              </div>
              <button 
                onClick={() => setSelectedStationDetails(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center t-text-secondary transition"
                style={{ border: '1px solid var(--color-card-border)' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
              <h4 className="text-xs font-bold t-text-muted uppercase tracking-wider">Candidats Évalués ({selectedStationDetails.results.length})</h4>
              
              {selectedStationDetails.results.length === 0 ? (
                <p className="text-xs t-text-muted italic py-8 text-center">Aucun candidat n'a encore validé ou complété cette station.</p>
              ) : (
                <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--color-border)' }}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] t-text-muted uppercase font-extrabold" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-alt)' }}>
                        <th className="p-3">Matricule</th>
                        <th className="p-3">Étudiant</th>
                        <th className="p-3 text-center">Score</th>
                        <th className="p-3 text-right">Décision</th>
                      </tr>
                    </thead>
                    <tbody style={{ borderColor: 'var(--color-border)' }}>
                      {selectedStationDetails.results.map((r, rIdx) => (
                        <tr key={rIdx} className="text-xs transition" style={{ borderTop: '1px solid var(--color-border)' }}>
                          <td className="p-3 font-mono" style={{ color: 'var(--color-accent)' }}>{r.matricule}</td>
                          <td className="p-3 font-semibold t-text-heading">{r.student_name}</td>
                          <td className="p-3 text-center font-extrabold t-accent">{r.score} / 20</td>
                          <td className="p-3 text-right">
                            <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] border" style={{
                              background: r.passed ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                              color: r.passed ? 'var(--color-success)' : 'var(--color-danger)',
                              borderColor: r.passed ? 'rgba(5, 150, 105, 0.2)' : 'rgba(220, 38, 38, 0.2)'
                            }}>
                              {r.passed ? 'Admis' : 'Ajourné'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 flex justify-end" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-alt)' }}>
              <button
                onClick={() => setSelectedStationDetails(null)}
                className="px-5 py-2 text-xs font-bold rounded-xl transition t-text-secondary"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-card-border)' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveDashboard;