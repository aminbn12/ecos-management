import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ExamHistory = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [allowDeletion, setAllowDeletion] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [dateSortOrder, setDateSortOrder] = useState('desc'); // 'desc' = newest first, 'asc' = oldest first

  // View Exam Details State
  const [selectedExam, setSelectedExam] = useState(null);
  const [examResults, setExamResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // View Student Sheet State
  const [selectedStudentProgression, setSelectedStudentProgression] = useState(null);

  // New Exam Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [creatingExam, setCreatingExam] = useState(false);

  // Admin passcode confirmation modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    actionType: null, // 'terminate' or 'delete'
    examId: null,
    code: ''
  });

  const loadExams = async () => {
    try {
      const res = await axios.get('/api/admin/exams');
      setExams(res.data.exams || []);

      // Load settings
      try {
        const settingsRes = await axios.get('/api/admin/settings');
        setAllowDeletion(settingsRes.data.settings?.allow_exam_deletion === '1');
      } catch (settingsErr) {
        console.warn("API settings offline, using default (false) for deletion.");
      }
    } catch (err) {
      console.warn("API offline, loading mock exams history");
      setExams([
        { id: 1, title: "Examen Clinique ECOS FMD UM6SS 2026", date: "2026-06-30", status: "active", progressions_count: 5, average_score: 14.5 },
        { id: 2, title: "Examen ECOS Prothèse & Endodontie 2025", date: "2025-06-15", status: "completed", progressions_count: 42, average_score: 13.8 },
      ]);
      setAllowDeletion(true); // Default to true in offline mode for testing
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateExam = async (examId) => {
    if (!window.confirm("Voulez-vous vraiment dupliquer cette session d'examen (configuration et examinateurs uniquement) ?")) {
      return;
    }
    setLoading(true);
    try {
      await axios.post(`/api/admin/exams/${examId}/duplicate`);
      setStatus({ type: 'success', message: 'Examen dupliqué avec succès.' });
      await loadExams();
    } catch (err) {
      console.warn("Backend offline, simulating exam duplication locally.");
      const originalExam = exams.find(e => e.id === examId);
      if (originalExam) {
        const duplicated = {
          id: Date.now(), // Temp unique ID
          title: originalExam.title + ' (Copie)',
          date: new Date().toISOString().split('T')[0], // Today's date
          status: 'draft', // Draft status allows activation button to display
          progressions_count: 0,
          average_score: null
        };
        setExams([duplicated, ...exams]);
        setStatus({ type: 'success', message: 'Mode Démo : Examen dupliqué avec succès.' });
      } else {
        setStatus({
          type: 'danger',
          message: err.response?.data?.message || 'Erreur lors de la duplication.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const handleSelectExam = async (exam) => {
    setSelectedExam(exam);
    setExamResults([]);
    setLoadingResults(true);
    try {
      const res = await axios.get(`/api/admin/exams/${exam.id}/results`);
      setExamResults(res.data.results || []);
    } catch (err) {
      console.warn("API offline, loading mock exam results");
      setExamResults([
        {
          id: 1,
          status: 'completed',
          requires_jury_decision: false,
          student: { user: { name: 'Amina Laroui' }, matricule: '202988' },
          results: [
            {
              id: 1,
              score: 16,
              passed: true,
              remarks: "Excellente dextérité manuelle.",
              station: { name: "Prothèse Fixe", step_number: 1, is_reserve: false },
              examiner: { name: "Dr. El Alami" },
              details: [
                { criterion: "Préparation de la dent pilier", points_max: 6, points_awarded: 5 },
                { criterion: "Prise d'empreinte de précision", points_max: 5, points_awarded: 4 },
                { criterion: "Confection de la prothèse provisoire", points_max: 5, points_awarded: 4 },
                { criterion: "Hygiène, ergonomie et relation", points_max: 4, points_awarded: 3 }
              ]
            },
            {
              id: 2,
              score: 12,
              passed: true,
              remarks: "Mise en forme satisfaisante.",
              station: { name: "Endodontie", step_number: 2, is_reserve: false },
              examiner: { name: "Dr. Bennani" },
              details: [
                { criterion: "Cavité d'accès endodontique", points_max: 5, points_awarded: 3 },
                { criterion: "Détermination longueur travail", points_max: 5, points_awarded: 3 }
              ]
            }
          ]
        },
        {
          id: 2,
          status: 'in_progress',
          requires_jury_decision: true,
          student: { user: { name: 'Youssef Meziane' }, matricule: '0044D12' },
          results: [
            {
              id: 3,
              score: 8,
              passed: false,
              remarks: "Erreur critique de limite.",
              station: { name: "Prothèse Fixe", step_number: 1, is_reserve: false },
              examiner: { name: "Dr. El Alami" }
            }
          ]
        }
      ]);
    } finally {
      setLoadingResults(false);
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;
    try {
      const payload = {
        title: newTitle.trim(),
        date: newDate,
        status: 'active'
      };
      await axios.post('/api/admin/exams', payload);
      setStatus({ type: 'success', message: 'Nouvel examen actif créé. Les autres examens ont été terminés.' });
      setNewTitle('');
      setNewDate('');
      setCreatingExam(false);
      loadExams();
    } catch (err) {
      setStatus({ type: 'success', message: 'Mode Démo : Nouvel examen créé.' });
      setCreatingExam(false);
    }
  };

  const handleChangeExamStatus = async (examId, newStatus) => {
    const statusLabels = { active: 'Actif', draft: 'En attente', completed: 'Archivé' };
    const confirmMessages = {
      active: 'Activer cet examen ? Les autres examens actifs seront automatiquement clôturés.',
      draft: 'Mettre cet examen en attente ? Il ne sera plus actif pour les évaluations.',
      completed: 'Archiver cet examen ? Cela désactivera les nouvelles progressions.'
    };
    if (!window.confirm(confirmMessages[newStatus])) return;
    try {
      const exam = exams.find(e => e.id === examId);
      const payload = {
        id: examId,
        title: exam.title,
        date: exam.date,
        status: newStatus
      };
      await axios.post('/api/admin/exams', payload);
      setStatus({ type: 'success', message: `Examen passé au statut "${statusLabels[newStatus]}" avec succès.` });
      loadExams();
      if (selectedExam && selectedExam.id === examId) {
        setSelectedExam({ ...selectedExam, status: newStatus });
      }
    } catch (err) {
      setExams(exams.map(e => e.id === examId ? { ...e, status: newStatus } : e));
      setStatus({ type: 'success', message: `Mode Démo : Statut changé en "${statusLabels[newStatus]}".` });
    }
  };

  const triggerTerminateConfirm = (examId) => {
    setConfirmModal({
      isOpen: true,
      title: "Clôturer et Archiver l'Examen",
      message: "Veuillez saisir le code d'administration pour clôturer et archiver cet examen :",
      actionType: 'terminate',
      examId: examId,
      code: ''
    });
  };

  const triggerDeleteConfirm = (examId) => {
    setConfirmModal({
      isOpen: true,
      title: "⚠️ ATTENTION : Suppression définitive",
      message: "La suppression d'un examen supprimera TOUTES les progressions, stations, et notes de tous les candidats liés à cet examen. Cette action est irréversible !\n\nVeuillez saisir le code secret d'administration pour confirmer :",
      actionType: 'delete',
      examId: examId,
      code: ''
    });
  };

  const handleConfirmModalSubmit = async (e) => {
    e.preventDefault();
    const { actionType, examId, code } = confirmModal;
    if (!code.trim()) return;

    setConfirmModal(prev => ({ ...prev, isOpen: false }));

    if (actionType === 'terminate') {
      try {
        const res = await axios.post(`/api/admin/exams/${examId}/terminate`, { code });
        setStatus({ type: 'success', message: res.data.message || 'Examen archivé avec succès.' });
        loadExams();
        if (selectedExam && selectedExam.id === examId) {
          setSelectedExam({ ...selectedExam, status: 'completed' });
        }
      } catch (err) {
        if (err.response && err.response.data && err.response.data.message) {
          alert(err.response.data.message);
        } else {
          // Fallback for offline demo mode
          if (code === '2026') {
            setExams(exams.map(e => e.id === examId ? { ...e, status: 'completed' } : e));
            setStatus({ type: 'success', message: "Mode Démo : Examen clôturé avec succès." });
            if (selectedExam && selectedExam.id === examId) {
              setSelectedExam({ ...selectedExam, status: 'completed' });
            }
          } else {
            alert("Code incorrect. (Indice Mode Démo : 2026)");
          }
        }
      }
    } else if (actionType === 'delete') {
      try {
        const res = await axios.post(`/api/admin/exams/${examId}/delete`, { code });
        setStatus({ type: 'success', message: res.data.message || 'Examen supprimé avec succès.' });
        if (selectedExam && selectedExam.id === examId) {
          setSelectedExam(null);
        }
        loadExams();
      } catch (err) {
        if (err.response && err.response.data && err.response.data.message) {
          alert(err.response.data.message);
        } else {
          // Fallback for offline demo mode
          if (code === '2026') {
            setExams(exams.filter(e => e.id !== examId));
            setStatus({ type: 'success', message: "Mode Démo : Examen supprimé avec succès." });
            if (selectedExam && selectedExam.id === examId) {
              setSelectedExam(null);
            }
          } else {
            alert("Code incorrect. (Indice Mode Démo : 2026)");
          }
        }
      }
    }
  };

  const handleDownloadExcel = async (examId) => {
    try {
      const response = await axios.get(`/api/admin/exams/${examId}/export`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/vnd.ms-excel; charset=UTF-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const exam = exams.find(e => e.id === examId);
      const titleCleaned = exam ? exam.title.toLowerCase().replace(/\s+/g, '_') : examId;
      link.setAttribute('download', `ecos_results_${titleCleaned}.xls`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading excel:", err);
      alert("Erreur lors de l'extraction du fichier Excel.");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in" style={{ minHeight: 'calc(100vh - 60px)' }}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glass-card p-5 rounded-2xl">
        <div>
          <h2 className="text-lg font-extrabold t-text-heading">📜 Historique & Rapports</h2>
          <p className="t-text-secondary text-xs mt-0.5">Consulter les sessions d'examens passées, analyser les grilles détaillées des candidats et exporter sous Excel</p>
        </div>
        <button
          onClick={() => setCreatingExam(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md"
        >
          ➕ Planifier un Examen
        </button>
      </div>

      {status.message && (
        <div className="p-4 rounded-xl text-xs font-semibold" style={{
          background: status.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
          color: status.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
          border: `1px solid ${status.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`
        }}>
          {status.message}
        </div>
      )}

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Exams Sessions List (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass-card p-5 rounded-2xl flex flex-col gap-4">
            <h3 className="text-sm font-extrabold t-text-heading border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
              Sessions d'Examens
            </h3>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Chercher un examen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 glass-input px-3 py-2 rounded-xl text-xs"
              />
              <button
                type="button"
                onClick={() => setDateSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="px-3 py-2 border rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                title={dateSortOrder === 'desc' ? "Trier par date (les plus récents en premier)" : "Trier par date (les plus anciens en premier)"}
              >
                📅 Trier : {dateSortOrder === 'desc' ? 'Récents ⬇️' : 'Anciens ⬆️'}
              </button>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-2.5 py-1.5 border rounded-xl text-[10px] font-bold t-text-secondary hover:bg-black/5 dark:hover:bg-white/5 transition"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  Effacer
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-10 t-text-secondary text-sm">Chargement...</div>
            ) : (() => {
              const filteredExams = exams.filter(exam => {
                return exam.title?.toLowerCase().includes(searchQuery.toLowerCase());
              });

              const sortedExams = [...filteredExams].sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return dateSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
              });

              if (sortedExams.length === 0) {
                return <div className="text-center py-10 t-text-muted text-xs">Aucune session d'examen correspondante.</div>;
              }

              return (
                <div className="flex flex-col gap-3">
                  {sortedExams.map(exam => {
                    const isSelected = selectedExam?.id === exam.id;
                  return (
                    <div
                      key={exam.id}
                      onClick={() => handleSelectExam(exam)}
                      className={`p-4 border rounded-2xl transition cursor-pointer flex flex-col gap-2.5 ${isSelected ? 'border-cyan-500 bg-cyan-500/5' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                      style={{ background: isSelected ? 'rgba(14, 116, 144, 0.05)' : 'var(--color-surface)', borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)' }}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <h4 className="text-xs font-bold t-text-heading line-clamp-2">{exam.title}</h4>
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase flex-shrink-0" style={{
                          background: exam.status === 'active' ? 'rgba(5, 150, 105, 0.15)' : exam.status === 'completed' ? 'var(--color-bg-alt)' : 'rgba(217, 119, 6, 0.15)',
                          color: exam.status === 'active' ? 'var(--color-success)' : exam.status === 'completed' ? 'var(--color-text-secondary)' : 'var(--color-warning)'
                        }}>
                          {exam.status === 'active' ? '🟢 Actif' : exam.status === 'completed' ? '📦 Archivé' : '⏸️ En attente'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] t-text-secondary mt-1">
                        <span>📅 {exam.date}</span>
                        <span>🎓 {exam.progressions_count || 0} candidats</span>
                      </div>

                      {exam.average_score !== undefined && exam.average_score !== null && (
                        <div className="text-[10px] font-bold t-accent">
                          📈 Moyenne : {exam.average_score} / 20
                        </div>
                      )}

                      <div className="flex gap-2 mt-2 pt-2 border-t flex-wrap" style={{ borderColor: 'var(--color-border)' }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleSelectExam(exam)}
                          className="py-1.5 px-2 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg text-[10px] font-bold t-text-heading transition"
                        >
                          👁️ Voir
                        </button>
                        <button
                          onClick={() => navigate('/admin/form-builder', { state: { examId: exam.id } })}
                          className="py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded-lg text-[10px] font-bold transition"
                        >
                          ✏️ Modifier
                        </button>
                        <button
                          onClick={() => handleDownloadExcel(exam.id)}
                          className="py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded-lg text-[10px] font-bold transition"
                        >
                          📥 Excel
                        </button>
                        <button
                          onClick={() => handleDuplicateExam(exam.id)}
                          className="py-1.5 px-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 rounded-lg text-[10px] font-bold transition"
                          title="Dupliquer cet examen sans les candidats et les résultats"
                        >
                          👥 Dupliquer
                        </button>

                        {/* Status Actions */}
                        {exam.status === 'draft' && (
                          <button
                            onClick={() => handleChangeExamStatus(exam.id, 'active')}
                            className="py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded-lg text-[10px] font-bold transition"
                            title="Activer cet examen"
                          >
                            ▶️ Activer
                          </button>
                        )}
                        {exam.status === 'active' && (
                          <>
                            <button
                              onClick={() => handleChangeExamStatus(exam.id, 'draft')}
                              className="py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded-lg text-[10px] font-bold transition"
                              title="Mettre en attente"
                            >
                              ⏸️ Pause
                            </button>
                            <button
                              onClick={() => triggerTerminateConfirm(exam.id)}
                              className="py-1.5 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-lg text-[10px] font-bold transition"
                              title="Clôturer et archiver l'examen"
                            >
                              🛑 Terminer
                            </button>
                          </>
                        )}
                        {exam.status === 'completed' && (
                          <>
                            <button
                              onClick={() => navigate(`/admin/dashboard?exam_id=${exam.id}`)}
                              className="py-1.5 px-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 rounded-lg text-[10px] font-bold transition"
                              title="Visualiser le dashboard"
                            >
                              📊 Visualiser
                            </button>
                            <button
                              onClick={() => handleChangeExamStatus(exam.id, 'active')}
                              className="py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded-lg text-[10px] font-bold transition"
                              title="Réactiver cet examen"
                            >
                              🔄 Réactiver
                            </button>
                          </>
                        )}
                        {allowDeletion && (
                          <button
                            onClick={() => triggerDeleteConfirm(exam.id)}
                            className="py-1.5 px-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-lg text-[10px] font-bold transition"
                            title="Supprimer définitivement l'examen"
                          >
                            🗑️ Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          </div>
        </section>

        {/* Right Column: Detailed Exam Candidates list (7 cols) */}
        <section className="lg:col-span-7">
          <div className="glass-card p-5 rounded-2xl flex flex-col gap-4">
            <h3 className="text-sm font-extrabold t-text-heading border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
              {selectedExam ? `Résultats : ${selectedExam.title}` : "Sélectionnez un examen pour afficher les résultats"}
            </h3>

            {!selectedExam ? (
              <div className="text-center py-20 t-text-muted text-xs">
                ⬅️ Veuillez choisir une session d'examen dans la liste de gauche pour consulter son historique.
              </div>
            ) : loadingResults ? (
              <div className="text-center py-20 t-text-secondary text-sm">Chargement des résultats...</div>
            ) : examResults.length === 0 ? (
              <div className="text-center py-20 t-text-muted text-xs">Aucun candidat enregistré pour cette session d'examen.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                      <th className="py-2.5 font-bold t-text-secondary uppercase text-[10px]">Étudiant</th>
                      <th className="py-2.5 font-bold t-text-secondary uppercase text-[10px]">Matricule</th>
                      <th className="py-2.5 font-bold t-text-secondary uppercase text-[10px]">Progression</th>
                      <th className="py-2.5 font-bold t-text-secondary uppercase text-[10px]">Moyenne</th>
                      <th className="py-2.5 font-bold t-text-secondary uppercase text-[10px] text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examResults.map(prog => {
                      const resultsList = prog.results || [];
                      const totalScore = resultsList.reduce((sum, r) => sum + r.score, 0);
                      const avg = resultsList.length > 0 ? (totalScore / resultsList.length).toFixed(2) : '—';
                      
                      const isJury = prog.requires_jury_decision;
                      const isCompleted = prog.status === 'completed';

                      return (
                        <tr key={prog.id} className="border-b hover:bg-black/5 dark:hover:bg-white/5 transition" style={{ borderColor: 'var(--color-border)' }}>
                          <td className="py-3 font-bold t-text-heading">{prog.student.user.name}</td>
                          <td className="py-3 font-mono t-text-secondary">{prog.student.matricule}</td>
                          <td className="py-3">
                            <span className="inline-flex items-center gap-1.5 font-semibold">
                              {isCompleted ? (
                                <span className="text-xs text-emerald-500 font-extrabold">✓ Terminé</span>
                              ) : (
                                <span className="text-xs text-amber-500">⏳ Étape {resultsList.length + 1}</span>
                              )}
                              {isJury && (
                                <span className="text-[8px] bg-red-500/10 text-red-600 px-1 py-0.5 rounded font-extrabold uppercase">Jury</span>
                              )}
                            </span>
                          </td>
                          <td className="py-3 font-black t-accent">{avg} / 20</td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => setSelectedStudentProgression(prog)}
                              className="px-2.5 py-1 bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20 rounded-lg font-bold text-[10px] transition"
                            >
                              📋 Voir Fiche
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Plan New Exam Dialog (Modal) */}
      {creatingExam && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-3xl w-full max-w-md flex flex-col gap-4 animate-scale-up">
            <h3 className="text-base font-extrabold t-text-heading border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
              Planifier une nouvelle Session ECOS
            </h3>

            <form onSubmit={handleCreateExam} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] t-text-secondary font-semibold uppercase">Nom de la Session d'Examen</label>
                <input
                  type="text"
                  placeholder="Ex: Examen Clinique ECOS Juillet 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="glass-input p-2.5 rounded-xl text-sm"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] t-text-secondary font-semibold uppercase">Date de la Session</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="glass-input p-2.5 rounded-xl text-sm"
                  required
                />
              </div>

              <div className="p-3 rounded-xl text-[10px] leading-relaxed" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)' }}>
                ⚠️ <b>Attention :</b> Créer un nouvel examen de statut <b>Actif</b> passera automatiquement toutes les autres sessions d'examens actives au statut <b>Clôturé</b>.
              </div>

              <div className="flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setCreatingExam(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold t-text-secondary"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  Annuler
                </button>
                 <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs"
                >
                  Créer & Activer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Candidate Worksheet (Modal) */}
      {selectedStudentProgression && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card p-6 rounded-3xl w-full max-w-2xl flex flex-col gap-4 animate-scale-up my-8">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <span className="text-[9px] font-extrabold uppercase t-accent">Fiche d'Évaluation</span>
                <h3 className="text-base font-extrabold t-text-heading mt-0.5">
                  {selectedStudentProgression.student.user.name}
                </h3>
                <p className="text-[10px] t-text-secondary mt-0.5">
                  Matricule: {selectedStudentProgression.student.matricule} | Statut: <b className="t-text-heading">{selectedStudentProgression.status === 'completed' ? 'Terminé' : 'En cours'}</b>
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentProgression(null)}
                className="w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold t-text-secondary hover:bg-black/5"
                style={{ borderColor: 'var(--color-border)' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex flex-col gap-4">
              <h4 className="text-xs font-extrabold t-text-secondary uppercase">Étapes parcourues ({selectedStudentProgression.results?.length || 0})</h4>
              
              {(!selectedStudentProgression.results || selectedStudentProgression.results.length === 0) ? (
                <div className="text-center py-8 t-text-muted text-xs">Aucune évaluation passée à ce jour pour cet étudiant.</div>
              ) : (
                <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-1">
                  {selectedStudentProgression.results.map((res, index) => {
                    return (
                      <div key={res.id} className="p-4 border rounded-2xl flex flex-col gap-3" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase" style={{
                              background: res.station.is_reserve ? 'var(--color-warning-bg)' : 'rgba(99, 102, 241, 0.1)',
                              color: res.station.is_reserve ? 'var(--color-warning)' : 'var(--color-accent)'
                            }}>
                              Étape {res.station.step_number} {res.station.is_reserve ? 'Réserve' : 'Initiale'}
                            </span>
                            <h5 className="text-xs font-extrabold t-text-heading mt-1">{res.station.name}</h5>
                            <p className="text-[9px] t-text-muted mt-0.5">Évalué par : <b>{res.examiner?.name || 'Système'}</b></p>
                          </div>
                          
                          <div className="text-right">
                            <span className={`text-xs font-extrabold ${res.passed ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {res.passed ? 'ADMIS' : 'AJOURNÉ'}
                            </span>
                            <p className="text-sm font-black t-accent mt-0.5">{res.score} pts</p>
                          </div>
                        </div>

                        {/* Checklist Details */}
                        {res.details && res.details.length > 0 && (
                          <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl flex flex-col gap-2 mt-1">
                            <span className="text-[9px] font-extrabold uppercase t-text-secondary">Détails des points :</span>
                            <div className="flex flex-col gap-1.5 text-[10px]">
                              {res.details.map((d, dIdx) => {
                                const pointsAwarded = d.points_awarded !== undefined ? d.points_awarded : (d.score !== undefined ? d.score : 0);
                                const pointsMax = d.points_max !== undefined ? d.points_max : (d.points !== undefined ? d.points : 0);
                                
                                // Detect if it uses the 3-level scale (since all points_awarded in examiner_eval are 0, 1, or 2)
                                const isThreeLevelScale = pointsMax === 20 && (pointsAwarded === 0 || pointsAwarded === 1 || pointsAwarded === 2);
                                
                                // Look up the actual points from the evaluation form criteria
                                let displayValue = pointsAwarded;
                                if (isThreeLevelScale && res.station?.evaluation_form?.criteria) {
                                  const criteriaList = res.station.evaluation_form.criteria;
                                  if (Array.isArray(criteriaList)) {
                                    const matched = criteriaList.find(c => (c.text || c.criterion) === d.criterion);
                                    if (matched) {
                                      const ptsFait = matched.points_fait !== undefined ? parseFloat(matched.points_fait) : parseFloat(matched.points || 2.0);
                                      const ptsPartiel = matched.points_partiel !== undefined ? parseFloat(matched.points_partiel) : ptsFait * 0.5;
                                      const ptsNonFait = matched.points_non_fait !== undefined ? parseFloat(matched.points_non_fait) : 0;
                                      
                                      displayValue = pointsAwarded === 2 ? ptsFait : (pointsAwarded === 1 ? ptsPartiel : ptsNonFait);
                                    }
                                  }
                                }

                                return (
                                  <div key={dIdx} className="flex justify-between items-center gap-3">
                                    <span className="t-text-heading font-medium">{d.criterion || d.text}</span>
                                    <span className="font-bold flex-shrink-0 t-accent">
                                      {isThreeLevelScale ? `${displayValue} pt${displayValue > 1 ? 's' : ''}` : `${pointsAwarded} / ${pointsMax}`}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {res.remarks && (
                          <div className="text-[10px] leading-relaxed t-text-secondary">
                            💬 <b>Remarque :</b> {res.remarks}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => setSelectedStudentProgression(null)}
                className="px-5 py-2 bg-black/10 hover:bg-black/20 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-bold t-text-heading transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Passcode Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-3xl w-full max-w-md flex flex-col gap-4 animate-scale-up">
            <h3 className="text-base font-extrabold t-text-heading border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
              {confirmModal.title}
            </h3>

            <p className="text-xs t-text-secondary whitespace-pre-line leading-relaxed">
              {confirmModal.message}
            </p>

            <form onSubmit={handleConfirmModalSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <input
                  type="password"
                  placeholder="Code de confirmation"
                  value={confirmModal.code}
                  onChange={(e) => setConfirmModal({ ...confirmModal, code: e.target.value })}
                  className="glass-input p-2.5 rounded-xl text-sm"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                  className="px-4 py-2 border rounded-xl text-xs font-bold t-text-secondary"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-xl text-xs"
                >
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamHistory;
